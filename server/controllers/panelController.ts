import { Request, Response } from 'express';
import { getDb } from '../db/connection.ts';
import { PanelResumen, Presupuesto } from '../types/index.ts';

export async function obtenerPanel(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id_usuario;
    const now = new Date();
    const mes = req.query.mes ? parseInt(String(req.query.mes), 10) : now.getMonth() + 1;
    const anio = req.query.anio ? parseInt(String(req.query.anio), 10) : now.getFullYear();

    if (isNaN(mes) || mes < 1 || mes > 12 || isNaN(anio)) {
      res.status(400).json({ error: 'Parámetros de mes o año inválidos para el panel.' });
      return;
    }

    const mesStr = mes < 10 ? `0${mes}` : `${mes}`;
    const fechaInicio = `${anio}-${mesStr}-01`;
    const nextMonth = mes === 12 ? 1 : mes + 1;
    const nextYear = mes === 12 ? anio + 1 : anio;
    const nextMonthStr = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
    const fechaFin = `${nextYear}-${nextMonthStr}-01`;

    const db = await getDb();

    // 1. Ingresos y gastos del mes actual
    const mesTotalesRes = await db.query<{ tipo: string; total: number }>(
      `SELECT tipo, SUM(monto) as total
       FROM TRANSACCION
       WHERE id_usuario = $1 AND fecha >= $2 AND fecha < $3
       GROUP BY tipo`,
      [userId, fechaInicio, fechaFin]
    );

    let ingresosMes = 0;
    let gastosMes = 0;
    for (const r of mesTotalesRes.rows) {
      if (r.tipo === 'ingreso') ingresosMes = Number(Number(r.total).toFixed(2));
      if (r.tipo === 'gasto') gastosMes = Number(Number(r.total).toFixed(2));
    }

    const balanceMes = Number((ingresosMes - gastosMes).toFixed(2));

    // 2. Balance general histórico del usuario
    const generalTotalesRes = await db.query<{ tipo: string; total: number }>(
      `SELECT tipo, SUM(monto) as total
       FROM TRANSACCION
       WHERE id_usuario = $1
       GROUP BY tipo`,
      [userId]
    );

    let ingresosGeneral = 0;
    let gastosGeneral = 0;
    for (const r of generalTotalesRes.rows) {
      if (r.tipo === 'ingreso') ingresosGeneral = Number(Number(r.total).toFixed(2));
      if (r.tipo === 'gasto') gastosGeneral = Number(Number(r.total).toFixed(2));
    }
    const balanceGeneral = Number((ingresosGeneral - gastosGeneral).toFixed(2));

    // 3. Gastos por categoría del mes
    const gastosCatRes = await db.query<{ id_categoria: number; nombre_categoria: string; total_gasto: number }>(
      `SELECT t.id_categoria, c.nombre_categoria, SUM(t.monto) as total_gasto
       FROM TRANSACCION t
       JOIN CATEGORIA c ON t.id_categoria = c.id_categoria
       WHERE t.id_usuario = $1 AND t.tipo = 'gasto' AND t.fecha >= $2 AND t.fecha < $3
       GROUP BY t.id_categoria, c.nombre_categoria
       ORDER BY total_gasto DESC`,
      [userId, fechaInicio, fechaFin]
    );

    const gastosPorCategoria = gastosCatRes.rows.map((item) => {
      const gasto = Number(Number(item.total_gasto).toFixed(2));
      const porcentaje = gastosMes > 0 ? Number(((gasto / gastosMes) * 100).toFixed(1)) : 0;
      return {
        id_categoria: Number(item.id_categoria),
        nombre_categoria: item.nombre_categoria,
        total_gasto: gasto,
        porcentaje,
      };
    });

    // 4. Presupuestos y alertas del mes
    const presupuestosRes = await db.query<Presupuesto>(
      `SELECT p.id_presupuesto, p.id_categoria, p.monto_limite, c.nombre_categoria
       FROM PRESUPUESTO p
       JOIN CATEGORIA c ON p.id_categoria = c.id_categoria
       WHERE p.id_usuario = $1 AND p.mes = $2 AND p.anio = $3`,
      [userId, mes, anio]
    );

    const gastoCatMap = new Map<number, number>();
    for (const g of gastosPorCategoria) {
      gastoCatMap.set(g.id_categoria, g.total_gasto);
    }

    const alertas: PanelResumen['alertas'] = [];

    for (const p of presupuestosRes.rows) {
      const limite = Number(Number(p.monto_limite).toFixed(2));
      const gastoActual = gastoCatMap.get(Number(p.id_categoria)) || 0;
      const porcentaje = limite > 0 ? Number(((gastoActual / limite) * 100).toFixed(1)) : 0;

      if (gastoActual > limite) {
        const exceso = Number((gastoActual - limite).toFixed(2));
        alertas.push({
          tipo: 'exceso',
          id_categoria: p.id_categoria,
          nombre_categoria: p.nombre_categoria || 'Categoría',
          monto_limite: limite,
          gasto_actual: gastoActual,
          porcentaje,
          mensaje: `Límite superado en ${p.nombre_categoria}: excedido por $${exceso.toLocaleString('es-CO')} COP (${porcentaje}% del límite).`,
        });
      } else if (porcentaje >= 85) {
        alertas.push({
          tipo: 'advertencia',
          id_categoria: p.id_categoria,
          nombre_categoria: p.nombre_categoria || 'Categoría',
          monto_limite: limite,
          gasto_actual: gastoActual,
          porcentaje,
          mensaje: `Alerta preventiva en ${p.nombre_categoria}: ha consumido el ${porcentaje}% del presupuesto mensual establecido.`,
        });
      }
    }

    const panel: PanelResumen = {
      mes,
      anio,
      ingresos_mes: ingresosMes,
      gastos_mes: gastosMes,
      balance_mes: balanceMes,
      balance_general: balanceGeneral,
      gastos_por_categoria: gastosPorCategoria,
      alertas,
    };

    res.status(200).json(panel);
  } catch (error) {
    console.error('Error al generar resumen de panel:', error);
    res.status(500).json({ error: 'Error al consultar la información del panel.' });
  }
}
