import type { Database } from 'sql.js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
  isPostgres: boolean;
}

class PostgresClient implements DbClient {
  private pool: pg.Pool;
  public isPostgres = true;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async query<T = any>(sqlText: string, params: any[] = []): Promise<QueryResult<T>> {
    const res = await this.pool.query(sqlText, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SqliteClient implements DbClient {
  private db: Database | null = null;
  private dbPath: string;
  public isPostgres = false;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    if (this.db) return;
    const sqlJsModule = await import('sql.js');
    const initSqlJs = (sqlJsModule.default || sqlJsModule) as any;
    const SQL = await initSqlJs();
    if (this.dbPath !== ':memory:' && fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }
  }

  private persist(): void {
    if (this.db && this.dbPath !== ':memory:') {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  async query<T = any>(sqlText: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.db) {
      await this.init();
    }
    const db = this.db!;

    // Normalize Postgres syntax to SQLite syntax if needed
    let normalizedSql = sqlText;

    // Convert $1, $2, etc. to ?, while keeping parameter array order
    // But sql.js supports binding with object {':p1': ...} or positional array with '?'
    let positionalSql = normalizedSql.replace(/\$(\d+)/g, '?');

    // Handle SERIAL PRIMARY KEY -> INTEGER PRIMARY KEY AUTOINCREMENT
    positionalSql = positionalSql.replace(/\bSERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    // Handle RETURNING id_* in SQLite
    const hasReturning = /RETURNING\s+([a-zA-Z0-9_,\s*]+)$/i.test(positionalSql.trim());
    let returningCols: string[] = [];
    if (hasReturning) {
      const match = positionalSql.trim().match(/RETURNING\s+([a-zA-Z0-9_,\s*]+)$/i);
      if (match) {
        returningCols = match[1].split(',').map((c) => c.trim());
      }
      positionalSql = positionalSql.replace(/RETURNING\s+([a-zA-Z0-9_,\s*]+)$/i, '');
    }

    // Format params for SQLite: boolean to number, Date to ISO string
    const formattedParams = params.map((p) => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      return p;
    });

    const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)/i.test(positionalSql);

    if (isSelect) {
      const stmt = db.prepare(positionalSql);
      if (formattedParams.length > 0) {
        stmt.bind(formattedParams);
      }
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as unknown as T);
      }
      stmt.free();
      return { rows, rowCount: rows.length };
    } else {
      // Execute INSERT / UPDATE / DELETE
      db.run(positionalSql, formattedParams);
      this.persist();

      let rows: T[] = [];
      if (hasReturning) {
        // Fetch last inserted row or updated data
        const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
        const lastId = lastIdResult.length > 0 && lastIdResult[0].values.length > 0 ? lastIdResult[0].values[0][0] : null;
        if (lastId !== null && returningCols.length > 0) {
          const colName = returningCols[0].includes('*') ? '*' : returningCols[0];
          // Determine table name if simple INSERT INTO <table>
          const tableMatch = positionalSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
          if (tableMatch) {
            const table = tableMatch[1];
            // Infer primary key column or select *
            const selectStmt = db.prepare(`SELECT ${colName} FROM ${table} WHERE rowid = ?`);
            selectStmt.bind([lastId]);
            if (selectStmt.step()) {
              rows.push(selectStmt.getAsObject() as unknown as T);
            }
            selectStmt.free();
          }
        }
      }

      // Check modified rows
      const changesRes = db.exec('SELECT changes() as c');
      const rowCount = changesRes.length > 0 && changesRes[0].values.length > 0 ? Number(changesRes[0].values[0][0]) : 1;

      return { rows, rowCount };
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
    }
  }
}

let activeDb: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (activeDb) return activeDb;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    activeDb = new PostgresClient(dbUrl);
  } else {
    const isTest = process.env.NODE_ENV === 'test';
    const dbPath = isTest ? ':memory:' : (process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'financontrol.sqlite'));
    const sqliteClient = new SqliteClient(dbPath);
    await sqliteClient.init();
    activeDb = sqliteClient;
  }

  await initializeSchema(activeDb);
  return activeDb;
}

export async function setTestDb(client: DbClient): Promise<void> {
  activeDb = client;
  await initializeSchema(activeDb);
}

export async function resetTestDb(): Promise<void> {
  if (activeDb) {
    await activeDb.close();
    activeDb = null;
  }
}

async function initializeSchema(db: DbClient): Promise<void> {
  if (db.isPostgres) {
    // In PostgreSQL, execute schema.sql directly
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf-8');
    await db.query(schemaSql);
  } else {
    // For SQLite, create tables with SQLite compatible syntax
    await db.query(`
      CREATE TABLE IF NOT EXISTS USUARIO (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(80) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS CATEGORIA (
        id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INT NOT NULL,
        nombre_categoria VARCHAR(50) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
        FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS TRANSACCION (
        id_transaccion INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INT NOT NULL,
        id_categoria INT NOT NULL,
        monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
        fecha DATE NOT NULL,
        descripcion VARCHAR(200),
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
        FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria) ON DELETE RESTRICT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS PRESUPUESTO (
        id_presupuesto INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INT NOT NULL,
        id_categoria INT NOT NULL,
        monto_limite DECIMAL(12, 2) NOT NULL CHECK (monto_limite > 0),
        mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
        anio INT NOT NULL,
        CONSTRAINT uq_usuario_categoria_mes_anio UNIQUE (id_usuario, id_categoria, mes, anio),
        FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
        FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS META_AHORRO (
        id_meta INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INT NOT NULL,
        nombre_meta VARCHAR(80) NOT NULL,
        monto_objetivo DECIMAL(12, 2) NOT NULL CHECK (monto_objetivo > 0),
        monto_actual DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_actual >= 0),
        FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
      );
    `);
  }

  // En modo desarrollo/producción (no en test suite), asegurar usuario de demostración
  if (process.env.NODE_ENV !== 'test') {
    await seedDemoUser(db);
  }
}

async function seedDemoUser(db: DbClient): Promise<void> {
  try {
    const existing = await db.query('SELECT id_usuario FROM USUARIO WHERE correo = $1', ['demo@financontrol.co']);
    if (existing.rows.length === 0) {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = bcrypt.hashSync('123456', 10);
      await db.query(
        'INSERT INTO USUARIO (nombre, correo, contrasena) VALUES ($1, $2, $3)',
        ['Usuario Demo', 'demo@financontrol.co', hash]
      );
      const userRes = await db.query('SELECT id_usuario FROM USUARIO WHERE correo = $1', ['demo@financontrol.co']);
      const demoId = userRes.rows[0].id_usuario;

      const defaultCats = [
        { nombre: 'Salario', tipo: 'ingreso' },
        { nombre: 'Alimentación', tipo: 'gasto' },
        { nombre: 'Transporte', tipo: 'gasto' },
        { nombre: 'Vivienda', tipo: 'gasto' },
        { nombre: 'Ocio', tipo: 'gasto' },
      ];

      for (const cat of defaultCats) {
        await db.query(
          'INSERT INTO CATEGORIA (id_usuario, nombre_categoria, tipo) VALUES ($1, $2, $3)',
          [demoId, cat.nombre, cat.tipo]
        );
      }

      const catsRes = await db.query('SELECT id_categoria, nombre_categoria FROM CATEGORIA WHERE id_usuario = $1', [demoId]);
      const catMap = new Map<string, number>();
      for (const c of catsRes.rows) {
        catMap.set(c.nombre_categoria, c.id_categoria);
      }

      const now = new Date();
      const mesActual = now.getMonth() + 1;
      const anioActual = now.getFullYear();
      const mesStr = mesActual < 10 ? `0${mesActual}` : `${mesActual}`;

      const catSalario = catMap.get('Salario');
      const catAlim = catMap.get('Alimentación');
      const catTrans = catMap.get('Transporte');
      const catOcio = catMap.get('Ocio');

      if (catSalario) {
        await db.query(
          'INSERT INTO TRANSACCION (id_usuario, id_categoria, monto, fecha, descripcion, tipo) VALUES ($1, $2, $3, $4, $5, $6)',
          [demoId, catSalario, 3800000.00, `${anioActual}-${mesStr}-01`, 'Pago de nómina quincena', 'ingreso']
        );
      }
      if (catAlim) {
        await db.query(
          'INSERT INTO TRANSACCION (id_usuario, id_categoria, monto, fecha, descripcion, tipo) VALUES ($1, $2, $3, $4, $5, $6)',
          [demoId, catAlim, 450000.00, `${anioActual}-${mesStr}-05`, 'Mercado mensual', 'gasto']
        );
        await db.query(
          'INSERT INTO PRESUPUESTO (id_usuario, id_categoria, monto_limite, mes, anio) VALUES ($1, $2, $3, $4, $5)',
          [demoId, catAlim, 600000.00, mesActual, anioActual]
        );
      }
      if (catTrans) {
        await db.query(
          'INSERT INTO TRANSACCION (id_usuario, id_categoria, monto, fecha, descripcion, tipo) VALUES ($1, $2, $3, $4, $5, $6)',
          [demoId, catTrans, 185000.00, `${anioActual}-${mesStr}-08`, 'Transporte público y gasolina', 'gasto']
        );
        // Presupuesto superado para activar alerta RF-08
        await db.query(
          'INSERT INTO PRESUPUESTO (id_usuario, id_categoria, monto_limite, mes, anio) VALUES ($1, $2, $3, $4, $5)',
          [demoId, catTrans, 150000.00, mesActual, anioActual]
        );
      }
      if (catOcio) {
        await db.query(
          'INSERT INTO TRANSACCION (id_usuario, id_categoria, monto, fecha, descripcion, tipo) VALUES ($1, $2, $3, $4, $5, $6)',
          [demoId, catOcio, 120000.00, `${anioActual}-${mesStr}-10`, 'Salida fin de semana', 'gasto']
        );
      }

      await db.query(
        'INSERT INTO META_AHORRO (id_usuario, nombre_meta, monto_objetivo, monto_actual) VALUES ($1, $2, $3, $4)',
        [demoId, 'Fondo de Emergencia', 2000000.00, 850000.00]
      );
      await db.query(
        'INSERT INTO META_AHORRO (id_usuario, nombre_meta, monto_objetivo, monto_actual) VALUES ($1, $2, $3, $4)',
        [demoId, 'Vacaciones San Andrés', 1500000.00, 500000.00]
      );
    }
  } catch (err) {
    console.warn('[FinanControl] Advertencia al sembrar demo user:', err);
  }
}
