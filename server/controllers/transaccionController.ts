import type { Request, Response } from 'express';
import { getDb } from '../db/connection.ts';
import { sanitizeString } from '../middlewares/security.ts';
import type { Categoria, Transaccion } from '../types/index.ts';

export async function listarTransacciones(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { mes, anio, tipo } = req.query;
    const db = await getDb();

    let sql = `
      SELECT t.id_transaccion, t.id_usuario, t.id_categoria, t.monto, t.fecha, t.descripcion, t.tipo,
             c.nombre_categoria
      FROM TRANSACCION t
      JOIN CATEGORIA c ON t.id_categoria = c.id_categoria
      WHERE t.id_usuario = $1
    `;
    const params: any[] = [userId];

    if (tipo && (tipo === 'ingreso' || tipo === 'gasto')) {
      params.push(tipo);
      sql += ` AND t.tipo = $${params.length}`;
    }

    if (mes && anio) {
      const mesNum = parseInt(String(mes), 10);
      const anioNum = parseInt(String(anio), 10);
      if (!isNaN(mesNum) && !isNaN(anioNum)) {
        const mesStr = mesNum < 10 ? `0${mesNum}` : `${mesNum}`;
        const fechaInicio = `${anioNum}-${mesStr}-01`;
        // Last day of month
        const nextMonth = mesNum === 12 ? 1 : mesNum + 1;
        const nextYear = mesNum === 12 ? anioNum + 1 : anioNum;
        const nextMonthStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
        const fechaFin = `${nextYear}-${nextMonthStr}-01`;

        params.push(fechaInicio);
        sql += ` AND t.fecha >= $${params.length}`;
        params.push(fechaFin);
        sql += ` AND t.fecha < $${params.length}`;
      }
    }

    sql += ' ORDER BY t.fecha DESC, t.id_transaccion DESC';

    const resultado = await db.query<Transaccion>(sql, params);
    
    // Formatear montos a 2 decimales numéricos
    const transacciones = resultado.rows.map((t) => ({
      ...t,
      monto: Number(Number(t.monto).toFixed(2)),
    }));

    res.status(200).json({ transacciones });
  } catch (error) {
    console.error('Error al listar transacciones:', error);
    res.status(500).json({ error: 'Error al consultar las transacciones.' });
  }
}

export async function crearTransaccion(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { id_categoria, monto, fecha, descripcion } = req.body;

    // Validación de categoría obligatoria
    if (!id_categoria || isNaN(Number(id_categoria))) {
      res.status(400).json({ error: 'La categoría es obligatoria.' });
      return;
    }

    const catIdNum = Number(id_categoria);

    // Validación de monto: rechazar <= 0
    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      res.status(400).json({ error: 'El monto debe ser un número estrictamente mayor a 0.' });
      return;
    }

    // Redondeo a 2 decimales en el servicio
    const montoFinal = Number(montoNum.toFixed(2));

    // Validación de fecha obligatoria (formato YYYY-MM-DD o parseable)
    if (!fecha || typeof fecha !== 'string' || !fecha.trim()) {
      res.status(400).json({ error: 'La fecha es obligatoria.' });
      return;
    }

    // Normalizar fecha YYYY-MM-DD
    const fechaTrim = fecha.trim().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTrim)) {
      res.status(400).json({ error: 'La fecha debe tener formato válido YYYY-MM-DD.' });
      return;
    }

    const cleanDesc = descripcion ? sanitizeString(String(descripcion).slice(0, 200)) : null;

    const db = await getDb();

    // Regla de Negocio: Categoría debe existir y pertenecer al usuario autenticado (RF-12 y PR-07)
    const catRes = await db.query<Categoria>(
      'SELECT id_categoria, nombre_categoria, tipo FROM CATEGORIA WHERE id_categoria = $1 AND id_usuario = $2',
      [catIdNum, userId]
    );

    if (catRes.rows.length === 0) {
      res.status(400).json({
        error: 'La categoría seleccionada no existe o no pertenece al usuario autenticado.',
      });
      return;
    }

    // Regla de Negocio: Un movimiento hereda el tipo de su categoría
    const categoria = catRes.rows[0];
    const tipoHeredado = categoria.tipo;

    await db.query(
      `INSERT INTO TRANSACCION (id_usuario, id_categoria, monto, fecha, descripcion, tipo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, catIdNum, montoFinal, fechaTrim, cleanDesc, tipoHeredado]
    );

    // Obtener la transacción recién creada
    const createdRes = await db.query<Transaccion>(
      `SELECT t.id_transaccion, t.id_usuario, t.id_categoria, t.monto, t.fecha, t.descripcion, t.tipo, c.nombre_categoria
       FROM TRANSACCION t
       JOIN CATEGORIA c ON t.id_categoria = c.id_categoria
       WHERE t.id_usuario = $1
       ORDER BY t.id_transaccion DESC LIMIT 1`,
      [userId]
    );

    const nuevaTransaccion = createdRes.rows[0];
    nuevaTransaccion.monto = Number(Number(nuevaTransaccion.monto).toFixed(2));

    res.status(201).json({
      mensaje: 'Movimiento registrado exitosamente.',
      transaccion: nuevaTransaccion,
    });
  } catch (error) {
    console.error('Error al crear transacción:', error);
    res.status(500).json({ error: 'Error al registrar el movimiento.' });
  }
}

export async function eliminarTransaccion(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { id } = req.params;
    const transaccionId = parseInt(id, 10);

    if (isNaN(transaccionId)) {
      res.status(400).json({ error: 'ID de transacción inválido.' });
      return;
    }

    const db = await getDb();

    // Verificar existencia y pertenencia al usuario
    const existe = await db.query<Transaccion>(
      'SELECT id_transaccion FROM TRANSACCION WHERE id_transaccion = $1 AND id_usuario = $2',
      [transaccionId, userId]
    );

    if (existe.rows.length === 0) {
      res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario.' });
      return;
    }

    await db.query('DELETE FROM TRANSACCION WHERE id_transaccion = $1 AND id_usuario = $2', [
      transaccionId,
      userId,
    ]);

    res.status(200).json({ mensaje: 'Transacción eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    res.status(500).json({ error: 'Error al eliminar el movimiento.' });
  }
}
