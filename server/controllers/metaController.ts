import { Request, Response } from 'express';
import { getDb } from '../db/connection.ts';
import { sanitizeString } from '../middlewares/security.ts';
import { MetaAhorro } from '../types/index.ts';

export async function listarMetas(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const db = await getDb();

    const resultado = await db.query<MetaAhorro>(
      'SELECT id_meta, id_usuario, nombre_meta, monto_objetivo, monto_actual FROM META_AHORRO WHERE id_usuario = $1 ORDER BY id_meta DESC',
      [userId]
    );

    const metas = resultado.rows.map((m) => {
      const actual = Number(Number(m.monto_actual || 0).toFixed(2));
      const objetivo = Number(Number(m.monto_objetivo).toFixed(2));
      const porcentaje = objetivo > 0 ? Number(((actual / objetivo) * 100).toFixed(1)) : 0;
      return {
        id_meta: m.id_meta,
        id_usuario: m.id_usuario,
        nombre_meta: m.nombre_meta,
        monto_objetivo: objetivo,
        monto_actual: actual,
        porcentaje_progreso: Math.min(100, porcentaje),
      };
    });

    res.status(200).json({ metas });
  } catch (error) {
    console.error('Error al listar metas:', error);
    res.status(500).json({ error: 'Error al consultar las metas de ahorro.' });
  }
}

export async function crearMeta(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { nombre_meta, monto_objetivo, monto_actual } = req.body;

    if (!nombre_meta || typeof nombre_meta !== 'string' || nombre_meta.trim().length === 0) {
      res.status(400).json({ error: 'El nombre de la meta es obligatorio.' });
      return;
    }

    const objetivoNum = Number(monto_objetivo);
    if (isNaN(objetivoNum) || objetivoNum <= 0) {
      res.status(400).json({ error: 'El monto objetivo debe ser mayor a 0.' });
      return;
    }

    let actualNum = 0;
    if (monto_actual !== undefined && monto_actual !== null) {
      actualNum = Number(monto_actual);
      if (isNaN(actualNum) || actualNum < 0) {
        res.status(400).json({ error: 'El monto inicial no puede ser negativo.' });
        return;
      }
    }

    const cleanNombre = sanitizeString(nombre_meta.slice(0, 80));
    const objetivoFinal = Number(objetivoNum.toFixed(2));
    const actualFinal = Number(actualNum.toFixed(2));

    const db = await getDb();

    await db.query(
      'INSERT INTO META_AHORRO (id_usuario, nombre_meta, monto_objetivo, monto_actual) VALUES ($1, $2, $3, $4)',
      [userId, cleanNombre, objetivoFinal, actualFinal]
    );

    const nuevaMetaRes = await db.query<MetaAhorro>(
      'SELECT id_meta, id_usuario, nombre_meta, monto_objetivo, monto_actual FROM META_AHORRO WHERE id_usuario = $1 ORDER BY id_meta DESC LIMIT 1',
      [userId]
    );

    const meta = nuevaMetaRes.rows[0];
    const porc = objetivoFinal > 0 ? Number(((actualFinal / objetivoFinal) * 100).toFixed(1)) : 0;

    res.status(201).json({
      mensaje: 'Meta de ahorro creada exitosamente.',
      meta: {
        id_meta: meta.id_meta,
        id_usuario: meta.id_usuario,
        nombre_meta: meta.nombre_meta,
        monto_objetivo: Number(meta.monto_objetivo),
        monto_actual: Number(meta.monto_actual),
        porcentaje_progreso: Math.min(100, porc),
      },
    });
  } catch (error) {
    console.error('Error al crear meta:', error);
    res.status(500).json({ error: 'Error al registrar la meta de ahorro.' });
  }
}

export async function abonarMeta(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { id } = req.params;
    const metaId = parseInt(id, 10);

    if (isNaN(metaId)) {
      res.status(400).json({ error: 'ID de meta inválido.' });
      return;
    }

    const { monto_abono } = req.body;
    const abonoNum = Number(monto_abono);

    // Regla de Negocio: Un abono no puede ser <= 0 (PR-12)
    if (isNaN(abonoNum) || abonoNum <= 0) {
      res.status(400).json({ error: 'El monto del abono debe ser estrictamente mayor a 0.' });
      return;
    }

    const db = await getDb();

    // Validar aislamiento: meta pertenece al usuario
    const metaRes = await db.query<MetaAhorro>(
      'SELECT id_meta, id_usuario, nombre_meta, monto_objetivo, monto_actual FROM META_AHORRO WHERE id_meta = $1 AND id_usuario = $2',
      [metaId, userId]
    );

    if (metaRes.rows.length === 0) {
      res.status(404).json({ error: 'Meta de ahorro no encontrada o no pertenece al usuario.' });
      return;
    }

    const meta = metaRes.rows[0];
    const nuevoActual = Number((Number(meta.monto_actual) + abonoNum).toFixed(2));
    const objetivo = Number(meta.monto_objetivo);

    await db.query(
      'UPDATE META_AHORRO SET monto_actual = $1 WHERE id_meta = $2 AND id_usuario = $3',
      [nuevoActual, metaId, userId]
    );

    const porcentaje = objetivo > 0 ? Number(((nuevoActual / objetivo) * 100).toFixed(1)) : 0;

    res.status(200).json({
      mensaje: 'Abono registrado exitosamente.',
      meta: {
        id_meta: meta.id_meta,
        id_usuario: meta.id_usuario,
        nombre_meta: meta.nombre_meta,
        monto_objetivo: objetivo,
        monto_actual: nuevoActual,
        porcentaje_progreso: Math.min(100, porcentaje),
        completada: nuevoActual >= objetivo,
      },
    });
  } catch (error) {
    console.error('Error al abonar meta:', error);
    res.status(500).json({ error: 'Error al registrar el abono a la meta.' });
  }
}

export async function eliminarMeta(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { id } = req.params;
    const metaId = parseInt(id, 10);

    if (isNaN(metaId)) {
      res.status(400).json({ error: 'ID de meta inválido.' });
      return;
    }

    const db = await getDb();

    const existe = await db.query<MetaAhorro>(
      'SELECT id_meta FROM META_AHORRO WHERE id_meta = $1 AND id_usuario = $2',
      [metaId, userId]
    );

    if (existe.rows.length === 0) {
      res.status(404).json({ error: 'Meta no encontrada o no pertenece al usuario.' });
      return;
    }

    await db.query('DELETE FROM META_AHORRO WHERE id_meta = $1 AND id_usuario = $2', [
      metaId,
      userId,
    ]);

    res.status(200).json({ mensaje: 'Meta de ahorro eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar meta:', error);
    res.status(500).json({ error: 'Error al eliminar la meta de ahorro.' });
  }
}
