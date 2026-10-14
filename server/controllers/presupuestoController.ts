import { Request, Response } from 'express';
import { getDb } from '../db/connection.ts';
import { Categoria, Presupuesto } from '../types/index.ts';

export async function listarPresupuestos(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const now = new Date();
    const mes = req.query.mes ? parseInt(String(req.query.mes), 10) : now.getMonth() + 1;
    const anio = req.query.anio ? parseInt(String(req.query.anio), 10) : now.getFullYear();

    if (isNaN(mes) || mes < 1 || mes > 12 || isNaN(anio)) {
      res.status(400).json({ error: 'Mes o año inválidos para consultar presupuestos.' });
      return;
    }

    const db = await getDb();

    // Consultar presupuestos del usuario para el periodo
    const presRes = await db.query<Presupuesto>(
      `SELECT p.id_presupuesto, p.id_usuario, p.id_categoria, p.monto_limite, p.mes, p.anio,
              c.nombre_categoria
       FROM PRESUPUESTO p
       JOIN CATEGORIA c ON p.id_categoria = c.id_categoria
       WHERE p.id_usuario = $1 AND p.mes = $2 AND p.anio = $3
       ORDER BY c.nombre_categoria ASC`,
      [userId, mes, anio]
    );

    // Formatear fechas para calcular gasto real del mes
    const mesStr = mes < 10 ? `0${mes}` : `${mes}`;
    const fechaInicio = `${anio}-${mesStr}-01`;
    const nextMonth = mes === 12 ? 1 : mes + 1;
    const nextYear = mes === 12 ? anio + 1 : anio;
    const nextMonthStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
    const fechaFin = `${nextYear}-${nextMonthStr}-01`;

    // Consultar gastos acumulados por categoría en este mes
    const gastosRes = await db.query<{ id_categoria: number; total_gasto: number }>(
      `SELECT id_categoria, SUM(monto) as total_gasto
       FROM TRANSACCION
       WHERE id_usuario = $1 AND tipo = 'gasto' AND fecha >= $2 AND fecha < $3
       GROUP BY id_categoria`,
      [userId, fechaInicio, fechaFin]
    );

    const gastosMap = new Map<number, number>();
    for (const g of gastosRes.rows) {
      gastosMap.set(Number(g.id_categoria), Number(g.total_gasto || 0));
    }

    const presupuestos = presRes.rows.map((p) => {
      const gasto = gastosMap.get(Number(p.id_categoria)) || 0;
      const gastoRedondeado = Number(gasto.toFixed(2));
      const limite = Number(Number(p.monto_limite).toFixed(2));
      const porcentaje = limite > 0 ? Number(((gastoRedondeado / limite) * 100).toFixed(1)) : 0;
      const excedido = gastoRedondeado > limite;

      return {
        id_presupuesto: p.id_presupuesto,
        id_usuario: p.id_usuario,
        id_categoria: p.id_categoria,
        nombre_categoria: p.nombre_categoria,
        monto_limite: limite,
        mes: p.mes,
        anio: p.anio,
        gasto_actual: gastoRedondeado,
        porcentaje_gastado: porcentaje,
        excedido,
      };
    });

    res.status(200).json({ mes, anio, presupuestos });
  } catch (error) {
    console.error('Error al listar presupuestos:', error);
    res.status(500).json({ error: 'Error al consultar los presupuestos.' });
  }
}

export async function crearPresupuesto(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { id_categoria, monto_limite, mes, anio } = req.body;

    if (!id_categoria || isNaN(Number(id_categoria))) {
      res.status(400).json({ error: 'La categoría es obligatoria.' });
      return;
    }

    const catIdNum = Number(id_categoria);
    const montoNum = Number(monto_limite);
    if (isNaN(montoNum) || montoNum <= 0) {
      res.status(400).json({ error: 'El monto límite debe ser un número mayor a 0.' });
      return;
    }

    const mesNum = parseInt(String(mes), 10);
    const anioNum = parseInt(String(anio), 10);
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      res.status(400).json({ error: 'El mes debe estar entre 1 y 12.' });
      return;
    }
    if (isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
      res.status(400).json({ error: 'El año ingresado es inválido.' });
      return;
    }

    const db = await getDb();

    // Validar categoría del usuario
    const catRes = await db.query<Categoria>(
      'SELECT id_categoria, nombre_categoria, tipo FROM CATEGORIA WHERE id_categoria = $1 AND id_usuario = $2',
      [catIdNum, userId]
    );

    if (catRes.rows.length === 0) {
      res.status(400).json({ error: 'La categoría seleccionada no existe o no pertenece al usuario.' });
      return;
    }

    const montoFinal = Number(montoNum.toFixed(2));

    // Verificar si ya existe presupuesto para esta categoría, mes y año (unicidad)
    const existente = await db.query<Presupuesto>(
      'SELECT id_presupuesto FROM PRESUPUESTO WHERE id_usuario = $1 AND id_categoria = $2 AND mes = $3 AND anio = $4',
      [userId, catIdNum, mesNum, anioNum]
    );

    if (existente.rows.length > 0) {
      // Actualizar el presupuesto existente
      await db.query(
        'UPDATE PRESUPUESTO SET monto_limite = $1 WHERE id_presupuesto = $2 AND id_usuario = $3',
        [montoFinal, existente.rows[0].id_presupuesto, userId]
      );

      const actualizado = await db.query<Presupuesto>(
        `SELECT p.id_presupuesto, p.id_usuario, p.id_categoria, p.monto_limite, p.mes, p.anio, c.nombre_categoria
         FROM PRESUPUESTO p
         JOIN CATEGORIA c ON p.id_categoria = c.id_categoria
         WHERE p.id_presupuesto = $1`,
        [existente.rows[0].id_presupuesto]
      );

      res.status(200).json({
        mensaje: 'Presupuesto actualizado exitosamente.',
        presupuesto: {
          ...actualizado.rows[0],
          monto_limite: Number(Number(actualizado.rows[0].monto_limite).toFixed(2)),
        },
      });
      return;
    }

    // Insertar nuevo presupuesto
    await db.query(
      'INSERT INTO PRESUPUESTO (id_usuario, id_categoria, monto_limite, mes, anio) VALUES ($1, $2, $3, $4, $5)',
      [userId, catIdNum, montoFinal, mesNum, anioNum]
    );

    const nuevo = await db.query<Presupuesto>(
      `SELECT p.id_presupuesto, p.id_usuario, p.id_categoria, p.monto_limite, p.mes, p.anio, c.nombre_categoria
       FROM PRESUPUESTO p
       JOIN CATEGORIA c ON p.id_categoria = c.id_categoria
       WHERE p.id_usuario = $1 AND p.id_categoria = $2 AND p.mes = $3 AND p.anio = $4`,
      [userId, catIdNum, mesNum, anioNum]
    );

    res.status(201).json({
      mensaje: 'Presupuesto registrado exitosamente.',
      presupuesto: {
        ...nuevo.rows[0],
        monto_limite: Number(Number(nuevo.rows[0].monto_limite).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error al guardar presupuesto:', error);
    res.status(500).json({ error: 'Error al registrar el presupuesto.' });
  }
}
