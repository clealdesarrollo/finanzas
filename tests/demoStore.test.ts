import { describe, test, expect, beforeEach } from 'bun:test';
import {
  startDemoSession,
  stopDemoSession,
  resetDemoStateToDefaults,
  handleDemoApi,
  loadDemoState,
  DEMO_USER,
} from '../src/services/demoStore';

describe('Modo Demo Offline (sin servidor)', () => {
  beforeEach(() => {
    // Resetear entorno demo
    stopDemoSession();
    resetDemoStateToDefaults();
  });

  test('Iniciar sesión demo sin servidor', () => {
    const user = startDemoSession();
    expect(user.correo).toBe('demo@financontrol.co');
    expect(user.nombre).toBe('Usuario Demo');
  });

  test('GET /api/auth/me devuelve el usuario demo', async () => {
    startDemoSession();
    const res = await handleDemoApi('/api/auth/me');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.usuario.correo).toBe('demo@financontrol.co');
  });

  test('GET /api/panel calcula balance y alertas correctamente', async () => {
    startDemoSession();
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    const res = await handleDemoApi(`/api/panel?mes=${mes}&anio=${anio}`);
    expect(res.status).toBe(200);
    const panel = await res.json();

    expect(panel.ingresos_mes).toBe(3800000);
    expect(panel.gastos_mes).toBeGreaterThan(0);
    expect(panel.balance_mes).toBe(panel.ingresos_mes - panel.gastos_mes);
    expect(panel.gastos_por_categoria.length).toBeGreaterThan(0);

    // Debe contener alerta de exceso (Transporte supera los $150.000 con $185.000)
    const alertaExceso = panel.alertas.find((a: any) => a.tipo === 'exceso');
    expect(alertaExceso).toBeDefined();
    expect(alertaExceso.nombre_categoria).toBe('Transporte');
  });

  test('CRUD de transacciones en modo demo sin servidor', async () => {
    startDemoSession();
    const now = new Date();
    const mes = now.getMonth() + 1;
    const mesStr = mes < 10 ? `0${mes}` : `${mes}`;
    const anio = now.getFullYear();

    // 1. Crear nueva transacción
    const createRes = await handleDemoApi('/api/transacciones', {
      method: 'POST',
      body: JSON.stringify({
        id_categoria: 2, // Alimentación
        monto: 75000,
        fecha: `${anio}-${mesStr}-12`,
        descripcion: 'Cena de prueba offline',
      }),
    });
    expect(createRes.status).toBe(201);
    const createdData = await createRes.json();
    expect(createdData.transaccion).toBeDefined();
    expect(createdData.transaccion.monto).toBe(75000);
    const idTx = createdData.transaccion.id_transaccion;

    // 2. Listar transacciones
    const listRes = await handleDemoApi(`/api/transacciones?mes=${mes}&anio=${anio}`);
    const listData = await listRes.json();
    expect(listData.transacciones.some((t: any) => t.id_transaccion === idTx)).toBe(true);

    // 3. Eliminar transacción
    const deleteRes = await handleDemoApi(`/api/transacciones/${idTx}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(200);

    // 4. Verificar eliminación
    const listAfterRes = await handleDemoApi(`/api/transacciones?mes=${mes}&anio=${anio}`);
    const listAfterData = await listAfterRes.json();
    expect(listAfterData.transacciones.some((t: any) => t.id_transaccion === idTx)).toBe(false);
  });

  test('Abonar a meta de ahorro en modo demo', async () => {
    startDemoSession();
    const metasRes = await handleDemoApi('/api/metas');
    const metasData = await metasRes.json();
    expect(metasData.metas.length).toBeGreaterThan(0);

    const meta = metasData.metas[0];
    const saldoAnterior = meta.monto_actual;

    const abonoRes = await handleDemoApi(`/api/metas/${meta.id_meta}/abonos`, {
      method: 'POST',
      body: JSON.stringify({ monto_abono: 50000 }),
    });
    expect(abonoRes.status).toBe(200);
    const abonoData = await abonoRes.json();
    expect(abonoData.meta.monto_actual).toBe(saldoAnterior + 50000);
  });
});
