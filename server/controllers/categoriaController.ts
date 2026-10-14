import type { Request, Response } from 'express';
import { getDb } from '../db/connection.ts';
import { sanitizeString } from '../middlewares/security.ts';
import type { Categoria } from '../types/index.ts';

export async function listarCategorias(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const db = await getDb();

    const resultado = await db.query<Categoria>(
      'SELECT id_categoria, id_usuario, nombre_categoria, tipo FROM CATEGORIA WHERE id_usuario = $1 ORDER BY nombre_categoria ASC',
      [userId]
    );

    res.status(200).json({
      categorias: resultado.rows,
    });
  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({ error: 'Error al consultar las categorías.' });
  }
}

export async function crearCategoria(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const { nombre_categoria, tipo } = req.body;

    if (!nombre_categoria || typeof nombre_categoria !== 'string' || nombre_categoria.trim().length === 0) {
      res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
      return;
    }

    if (!tipo || (tipo !== 'ingreso' && tipo !== 'gasto')) {
      res.status(400).json({ error: "El tipo de categoría debe ser estrictamente 'ingreso' o 'gasto'." });
      return;
    }

    const cleanNombre = sanitizeString(nombre_categoria.slice(0, 50));
    const db = await getDb();

    // Validar duplicado para el mismo usuario
    const existente = await db.query<Categoria>(
      'SELECT id_categoria FROM CATEGORIA WHERE id_usuario = $1 AND LOWER(nombre_categoria) = LOWER($2)',
      [userId, cleanNombre]
    );

    if (existente.rows.length > 0) {
      res.status(400).json({ error: 'Ya tiene una categoría registrada con este nombre.' });
      return;
    }

    await db.query(
      'INSERT INTO CATEGORIA (id_usuario, nombre_categoria, tipo) VALUES ($1, $2, $3)',
      [userId, cleanNombre, tipo]
    );

    const nuevaCat = await db.query<Categoria>(
      'SELECT id_categoria, id_usuario, nombre_categoria, tipo FROM CATEGORIA WHERE id_usuario = $1 AND nombre_categoria = $2',
      [userId, cleanNombre]
    );

    res.status(201).json({
      mensaje: 'Categoría creada exitosamente.',
      categoria: nuevaCat.rows[0],
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al registrar la nueva categoría.' });
  }
}
