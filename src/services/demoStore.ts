// Servicio de Almacenamiento y Emulación Local para Modo Demo sin Servidor
// Permite que la aplicación funcione al 100% en el navegador sin requerir backend ni base de datos.

export interface UsuarioDemo {
  id_usuario: number;
  nombre: string;
  correo: string;
}

export interface CategoriaDemo {
  id_categoria: number;
  id_usuario: number;
  nombre_categoria: string;
  tipo: 'ingreso' | 'gasto';
}

export interface TransaccionDemo {
  id_transaccion: number;
  id_usuario: number;
  id_categoria: number;
  monto: number;
  fecha: string;
  descripcion?: string | null;
  tipo: 'ingreso' | 'gasto';
  nombre_categoria?: string;
}

export interface PresupuestoDemo {
  id_presupuesto: number;
  id_usuario: number;
  id_categoria: number;
  monto_limite: number;
  mes: number;
  anio: number;
  nombre_categoria?: string;
  gasto_actual?: number;
  porcentaje_gastado?: number;
  excedido?: boolean;
}

export interface MetaAhorroDemo {
  id_meta: number;
  id_usuario: number;
  nombre_meta: string;
  monto_objetivo: number;
  monto_actual: number;
  porcentaje_progreso?: number;
}

export interface DemoState {
  usuario: UsuarioDemo;
  categorias: CategoriaDemo[];
  transacciones: TransaccionDemo[];
  presupuestos: PresupuestoDemo[];
  metas: MetaAhorroDemo[];
  counters: {
    categoria: number;
    transaccion: number;
    presupuesto: number;
    meta: number;
  };
}

const DEMO_STATE_KEY = 'financontrol_demo_state_v1';
const DEMO_USER_KEY = 'financontrol_demo_user';
const DEMO_MODE_KEY = 'financontrol_is_demo_mode';

let inMemoryState: DemoState | null = null;

export const DEMO_USER: UsuarioDemo = {
  id_usuario: 1,
  nombre: 'Usuario Demo',
  correo: 'demo@financontrol.co',
};

// Genera estado inicial con datos relativos al mes y año en curso
export function getInitialDemoState(): DemoState {
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();
  const mesStr = mesActual < 10 ? `0${mesActual}` : `${mesActual}`;

  const categorias: CategoriaDemo[] = [
    { id_categoria: 1, id_usuario: 1, nombre_categoria: 'Salario', tipo: 'ingreso' },
    { id_categoria: 2, id_usuario: 1, nombre_categoria: 'Alimentación', tipo: 'gasto' },
    { id_categoria: 3, id_usuario: 1, nombre_categoria: 'Transporte', tipo: 'gasto' },
    { id_categoria: 4, id_usuario: 1, nombre_categoria: 'Vivienda', tipo: 'gasto' },
    { id_categoria: 5, id_usuario: 1, nombre_categoria: 'Ocio', tipo: 'gasto' },
  ];

  const transacciones: TransaccionDemo[] = [
    {
      id_transaccion: 1,
      id_usuario: 1,
      id_categoria: 1,
      monto: 3800000.0,
      fecha: `${anioActual}-${mesStr}-01`,
      descripcion: 'Pago de nómina quincena',
      tipo: 'ingreso',
      nombre_categoria: 'Salario',
    },
    {
      id_transaccion: 2,
      id_usuario: 1,
      id_categoria: 2,
      monto: 450000.0,
      fecha: `${anioActual}-${mesStr}-05`,
      descripcion: 'Mercado mensual',
      tipo: 'gasto',
      nombre_categoria: 'Alimentación',
    },
    {
      id_transaccion: 3,
      id_usuario: 1,
      id_categoria: 3,
      monto: 185000.0,
      fecha: `${anioActual}-${mesStr}-08`,
      descripcion: 'Transporte público y gasolina',
      tipo: 'gasto',
      nombre_categoria: 'Transporte',
    },
    {
      id_transaccion: 4,
      id_usuario: 1,
      id_categoria: 5,
      monto: 120000.0,
      fecha: `${anioActual}-${mesStr}-10`,
      descripcion: 'Salida fin de semana',
      tipo: 'gasto',
      nombre_categoria: 'Ocio',
    },
  ];

  const presupuestos: PresupuestoDemo[] = [
    {
      id_presupuesto: 1,
      id_usuario: 1,
      id_categoria: 2,
      monto_limite: 600000.0,
      mes: mesActual,
      anio: anioActual,
      nombre_categoria: 'Alimentación',
    },
    {
      id_presupuesto: 2,
      id_usuario: 1,
      id_categoria: 3,
      monto_limite: 150000.0,
      mes: mesActual,
      anio: anioActual,
      nombre_categoria: 'Transporte',
    },
  ];

  const metas: MetaAhorroDemo[] = [
    {
      id_meta: 1,
      id_usuario: 1,
      nombre_meta: 'Fondo de Emergencia',
      monto_objetivo: 2000000.0,
      monto_actual: 850000.0,
      porcentaje_progreso: 42.5,
    },
    {
      id_meta: 2,
      id_usuario: 1,
      nombre_meta: 'Vacaciones San Andrés',
      monto_objetivo: 1500000.0,
      monto_actual: 500000.0,
      porcentaje_progreso: 33.3,
    },
  ];

  return {
    usuario: DEMO_USER,
    categorias,
    transacciones,
    presupuestos,
    metas,
    counters: {
      categoria: 10,
      transaccion: 10,
      presupuesto: 10,
      meta: 10,
    },
  };
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadDemoState(): DemoState {
  if (inMemoryState) return inMemoryState;

  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(DEMO_STATE_KEY);
      if (raw) {
        inMemoryState = JSON.parse(raw);
        return inMemoryState!;
      }
    } catch (err) {
      console.warn('[DemoStore] Error al leer localStorage:', err);
    }
  }

  const initial = getInitialDemoState();
  saveDemoState(initial);
  return initial;
}

export function saveDemoState(state: DemoState): void {
  inMemoryState = state;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[DemoStore] Error al guardar en localStorage:', err);
    }
  }
}

export function isDemoModeActive(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function startDemoSession(): UsuarioDemo {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(DEMO_MODE_KEY, 'true');
      storage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER));
    } catch (err) {
      console.warn('[DemoStore] Error al configurar sesión demo:', err);
    }
  }
  loadDemoState();
  return DEMO_USER;
}

export function stopDemoSession(): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(DEMO_MODE_KEY);
      storage.removeItem(DEMO_USER_KEY);
    } catch (err) {
      console.warn('[DemoStore] Error al limpiar sesión demo:', err);
    }
  }
  inMemoryState = null;
}

export function resetDemoStateToDefaults(): DemoState {
  const initial = getInitialDemoState();
  saveDemoState(initial);
  return initial;
}

// Simulador de API para llamadas en Modo Demo (sin servidor)
export async function handleDemoApi(url: string, options: RequestInit = {}): Promise<Response> {
  const state = loadDemoState();
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(url, 'http://localhost');
  const path = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const getBody = () => {
    if (!options.body) return {};
    try {
      return typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      return {};
    }
  };

  // 1. /api/auth/me
  if (path === '/api/auth/me') {
    return jsonResponse({ usuario: state.usuario });
  }

  // 2. /api/auth/logout
  if (path === '/api/auth/logout') {
    stopDemoSession();
    return jsonResponse({ mensaje: 'Sesión demo cerrada con éxito.' });
  }

  // 3. /api/categorias
  if (path === '/api/categorias') {
    if (method === 'GET') {
      const sorted = [...state.categorias].sort((a, b) =>
        a.nombre_categoria.localeCompare(b.nombre_categoria)
      );
      return jsonResponse({ categorias: sorted });
    }

    if (method === 'POST') {
      const body = getBody();
      const nombre = (body.nombre_categoria || '').trim();
      const tipo = body.tipo;

      if (!nombre) {
        return jsonResponse({ error: 'El nombre de la categoría es obligatorio.' }, 400);
      }
      if (tipo !== 'ingreso' && tipo !== 'gasto') {
        return jsonResponse({ error: "El tipo debe ser 'ingreso' o 'gasto'." }, 400);
      }

      const duplicate = state.categorias.find(
        (c) => c.nombre_categoria.toLowerCase() === nombre.toLowerCase()
      );
      if (duplicate) {
        return jsonResponse({ error: 'Ya tiene una categoría registrada con este nombre.' }, 400);
      }

      state.counters.categoria += 1;
      const newCat: CategoriaDemo = {
        id_categoria: state.counters.categoria,
        id_usuario: 1,
        nombre_categoria: nombre,
        tipo,
      };
      state.categorias.push(newCat);
      saveDemoState(state);

      return jsonResponse({
        mensaje: 'Categoría creada exitosamente.',
        categoria: newCat,
      }, 201);
    }
  }

  // 4. /api/transacciones
  if (path === '/api/transacciones') {
    if (method === 'GET') {
      const mesParam = searchParams.get('mes');
      const anioParam = searchParams.get('anio');
      const tipoParam = searchParams.get('tipo');

      let list = state.transacciones.map((t) => {
        const cat = state.categorias.find((c) => c.id_categoria === t.id_categoria);
        return {
          ...t,
          nombre_categoria: cat ? cat.nombre_categoria : t.nombre_categoria || 'Categoría',
        };
      });

      if (tipoParam && (tipoParam === 'ingreso' || tipoParam === 'gasto')) {
        list = list.filter((t) => t.tipo === tipoParam);
      }

      if (mesParam && anioParam) {
        const mesNum = parseInt(mesParam, 10);
        const anioNum = parseInt(anioParam, 10);
        list = list.filter((t) => {
          const [tAnio, tMes] = t.fecha.split('-').map(Number);
          return tAnio === anioNum && tMes === mesNum;
        });
      }

      list.sort((a, b) => {
        if (b.fecha !== a.fecha) return b.fecha.localeCompare(a.fecha);
        return b.id_transaccion - a.id_transaccion;
      });

      return jsonResponse({ transacciones: list });
    }

    if (method === 'POST') {
      const body = getBody();
      const idCat = Number(body.id_categoria);
      const monto = parseFloat(body.monto);
      const fecha = (body.fecha || '').trim();
      const descripcion = (body.descripcion || '').trim();

      if (!idCat || isNaN(idCat)) {
        return jsonResponse({ error: 'La categoría es obligatoria.' }, 400);
      }
      if (isNaN(monto) || monto <= 0) {
        return jsonResponse({ error: 'El monto debe ser un número estrictamente mayor a 0.' }, 400);
      }
      if (!fecha) {
        return jsonResponse({ error: 'La fecha es obligatoria.' }, 400);
      }

      const cat = state.categorias.find((c) => c.id_categoria === idCat);
      if (!cat) {
        return jsonResponse({ error: 'Categoría no encontrada.' }, 400);
      }

      state.counters.transaccion += 1;
      const newTx: TransaccionDemo = {
        id_transaccion: state.counters.transaccion,
        id_usuario: 1,
        id_categoria: idCat,
        monto: Number(monto.toFixed(2)),
        fecha: fecha.split('T')[0],
        descripcion: descripcion || null,
        tipo: cat.tipo,
        nombre_categoria: cat.nombre_categoria,
      };

      state.transacciones.unshift(newTx);
      saveDemoState(state);

      return jsonResponse({
        mensaje: 'Movimiento registrado correctamente.',
        transaccion: newTx,
      }, 201);
    }
  }

  // 4b. /api/transacciones/:id (DELETE)
  const txMatch = path.match(/^\/api\/transacciones\/(\d+)$/);
  if (txMatch && method === 'DELETE') {
    const idToDelete = parseInt(txMatch[1], 10);
    state.transacciones = state.transacciones.filter((t) => t.id_transaccion !== idToDelete);
    saveDemoState(state);
    return jsonResponse({ mensaje: 'Movimiento eliminado correctamente.' });
  }

  // 5. /api/presupuestos
  if (path === '/api/presupuestos') {
    if (method === 'GET') {
      const now = new Date();
      const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!, 10) : now.getMonth() + 1;
      const anio = searchParams.get('anio') ? parseInt(searchParams.get('anio')!, 10) : now.getFullYear();

      const userPresupuestos = state.presupuestos.filter((p) => p.mes === mes && p.anio === anio);

      // Calcular gastos por categoría para ese mes y año
      const gastosMap = new Map<number, number>();
      state.transacciones.forEach((t) => {
        if (t.tipo === 'gasto') {
          const [tAnio, tMes] = t.fecha.split('-').map(Number);
          if (tAnio === anio && tMes === mes) {
            const current = gastosMap.get(t.id_categoria) || 0;
            gastosMap.set(t.id_categoria, current + t.monto);
          }
        }
      });

      const result = userPresupuestos.map((p) => {
        const cat = state.categorias.find((c) => c.id_categoria === p.id_categoria);
        const gasto = gastosMap.get(p.id_categoria) || 0;
        const gastoRedondeado = Number(gasto.toFixed(2));
        const limite = Number(p.monto_limite.toFixed(2));
        const porcentaje = limite > 0 ? Number(((gastoRedondeado / limite) * 100).toFixed(1)) : 0;
        const excedido = gastoRedondeado > limite;

        return {
          id_presupuesto: p.id_presupuesto,
          id_usuario: 1,
          id_categoria: p.id_categoria,
          nombre_categoria: cat ? cat.nombre_categoria : p.nombre_categoria || 'Categoría',
          monto_limite: limite,
          mes: p.mes,
          anio: p.anio,
          gasto_actual: gastoRedondeado,
          porcentaje_gastado: porcentaje,
          excedido,
        };
      });

      result.sort((a, b) => (a.nombre_categoria || '').localeCompare(b.nombre_categoria || ''));
      return jsonResponse({ presupuestos: result });
    }

    if (method === 'POST') {
      const body = getBody();
      const idCat = Number(body.id_categoria);
      const montoLimite = parseFloat(body.monto_limite);
      const mes = parseInt(String(body.mes), 10);
      const anio = parseInt(String(body.anio), 10);

      if (!idCat || isNaN(idCat)) {
        return jsonResponse({ error: 'Seleccione una categoría para el presupuesto.' }, 400);
      }
      if (isNaN(montoLimite) || montoLimite <= 0) {
        return jsonResponse({ error: 'El monto límite debe ser mayor a 0.' }, 400);
      }
      if (isNaN(mes) || isNaN(anio)) {
        return jsonResponse({ error: 'Mes y año válidos son requeridos.' }, 400);
      }

      const cat = state.categorias.find((c) => c.id_categoria === idCat);
      const existing = state.presupuestos.find(
        (p) => p.id_categoria === idCat && p.mes === mes && p.anio === anio
      );

      if (existing) {
        existing.monto_limite = Number(montoLimite.toFixed(2));
      } else {
        state.counters.presupuesto += 1;
        state.presupuestos.push({
          id_presupuesto: state.counters.presupuesto,
          id_usuario: 1,
          id_categoria: idCat,
          monto_limite: Number(montoLimite.toFixed(2)),
          mes,
          anio,
          nombre_categoria: cat ? cat.nombre_categoria : 'Categoría',
        });
      }

      saveDemoState(state);
      return jsonResponse({ mensaje: 'Presupuesto guardado exitosamente.' });
    }
  }

  // 6. /api/metas
  if (path === '/api/metas') {
    if (method === 'GET') {
      const result = state.metas.map((m) => {
        const actual = Number(m.monto_actual.toFixed(2));
        const objetivo = Number(m.monto_objetivo.toFixed(2));
        const porcentaje = objetivo > 0 ? Number(((actual / objetivo) * 100).toFixed(1)) : 0;
        return {
          id_meta: m.id_meta,
          id_usuario: 1,
          nombre_meta: m.nombre_meta,
          monto_objetivo: objetivo,
          monto_actual: actual,
          porcentaje_progreso: Math.min(100, porcentaje),
        };
      });
      result.sort((a, b) => b.id_meta - a.id_meta);
      return jsonResponse({ metas: result });
    }

    if (method === 'POST') {
      const body = getBody();
      const nombre = (body.nombre_meta || '').trim();
      const objetivo = parseFloat(body.monto_objetivo);
      const actual = body.monto_actual !== undefined ? parseFloat(body.monto_actual) : 0;

      if (!nombre) {
        return jsonResponse({ error: 'El nombre de la meta es obligatorio.' }, 400);
      }
      if (isNaN(objetivo) || objetivo <= 0) {
        return jsonResponse({ error: 'El monto objetivo debe ser mayor a 0.' }, 400);
      }

      state.counters.meta += 1;
      const actualVal = isNaN(actual) || actual < 0 ? 0 : actual;
      const porc = objetivo > 0 ? Number(((actualVal / objetivo) * 100).toFixed(1)) : 0;

      const newMeta: MetaAhorroDemo = {
        id_meta: state.counters.meta,
        id_usuario: 1,
        nombre_meta: nombre,
        monto_objetivo: Number(objetivo.toFixed(2)),
        monto_actual: Number(actualVal.toFixed(2)),
        porcentaje_progreso: Math.min(100, porc),
      };

      state.metas.unshift(newMeta);
      saveDemoState(state);

      return jsonResponse({
        mensaje: 'Meta de ahorro creada con éxito.',
        meta: newMeta,
      }, 201);
    }
  }

  // 6b. /api/metas/:id/abonos
  const abonoMatch = path.match(/^\/api\/metas\/(\d+)\/abonos$/);
  if (abonoMatch && method === 'POST') {
    const metaId = parseInt(abonoMatch[1], 10);
    const body = getBody();
    const abono = parseFloat(body.monto_abono);

    if (isNaN(abono) || abono <= 0) {
      return jsonResponse({ error: 'El monto del abono debe ser mayor a 0.' }, 400);
    }

    const meta = state.metas.find((m) => m.id_meta === metaId);
    if (!meta) {
      return jsonResponse({ error: 'Meta no encontrada.' }, 404);
    }

    meta.monto_actual = Number((meta.monto_actual + abono).toFixed(2));
    const porc = meta.monto_objetivo > 0 ? Number(((meta.monto_actual / meta.monto_objetivo) * 100).toFixed(1)) : 0;
    meta.porcentaje_progreso = Math.min(100, porc);

    saveDemoState(state);
    return jsonResponse({
      mensaje: 'Abono registrado con éxito.',
      meta,
    });
  }

  // 6c. /api/metas/:id (DELETE)
  const metaMatch = path.match(/^\/api\/metas\/(\d+)$/);
  if (metaMatch && method === 'DELETE') {
    const metaId = parseInt(metaMatch[1], 10);
    state.metas = state.metas.filter((m) => m.id_meta !== metaId);
    saveDemoState(state);
    return jsonResponse({ mensaje: 'Meta de ahorro eliminada con éxito.' });
  }

  // 7. /api/panel
  if (path === '/api/panel') {
    const now = new Date();
    const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!, 10) : now.getMonth() + 1;
    const anio = searchParams.get('anio') ? parseInt(searchParams.get('anio')!, 10) : now.getFullYear();

    // 1. Ingresos y gastos del mes
    let ingresosMes = 0;
    let gastosMes = 0;
    const gastosCatMap = new Map<number, number>();

    state.transacciones.forEach((t) => {
      const [tAnio, tMes] = t.fecha.split('-').map(Number);
      if (tAnio === anio && tMes === mes) {
        if (t.tipo === 'ingreso') {
          ingresosMes += t.monto;
        } else if (t.tipo === 'gasto') {
          gastosMes += t.monto;
          const current = gastosCatMap.get(t.id_categoria) || 0;
          gastosCatMap.set(t.id_categoria, current + t.monto);
        }
      }
    });

    ingresosMes = Number(ingresosMes.toFixed(2));
    gastosMes = Number(gastosMes.toFixed(2));
    const balanceMes = Number((ingresosMes - gastosMes).toFixed(2));

    // 2. Balance general histórico
    let ingresosGeneral = 0;
    let gastosGeneral = 0;
    state.transacciones.forEach((t) => {
      if (t.tipo === 'ingreso') ingresosGeneral += t.monto;
      if (t.tipo === 'gasto') gastosGeneral += t.monto;
    });
    const balanceGeneral = Number((ingresosGeneral - gastosGeneral).toFixed(2));

    // 3. Gastos por categoría
    const gastosPorCategoria: Array<{
      id_categoria: number;
      nombre_categoria: string;
      total_gasto: number;
      porcentaje: number;
    }> = [];

    gastosCatMap.forEach((gasto, idCat) => {
      const cat = state.categorias.find((c) => c.id_categoria === idCat);
      const totalGasto = Number(gasto.toFixed(2));
      const porcentaje = gastosMes > 0 ? Number(((totalGasto / gastosMes) * 100).toFixed(1)) : 0;
      gastosPorCategoria.push({
        id_categoria: idCat,
        nombre_categoria: cat ? cat.nombre_categoria : 'Categoría',
        total_gasto: totalGasto,
        porcentaje,
      });
    });

    gastosPorCategoria.sort((a, b) => b.total_gasto - a.total_gasto);

    // 4. Presupuestos y alertas
    const alertas: Array<{
      tipo: 'exceso' | 'advertencia';
      id_categoria: number;
      nombre_categoria: string;
      monto_limite: number;
      gasto_actual: number;
      porcentaje: number;
      mensaje: string;
    }> = [];

    const presupuestosMes = state.presupuestos.filter((p) => p.mes === mes && p.anio === anio);
    presupuestosMes.forEach((p) => {
      const cat = state.categorias.find((c) => c.id_categoria === p.id_categoria);
      const nombreCat = cat ? cat.nombre_categoria : p.nombre_categoria || 'Categoría';
      const limite = Number(p.monto_limite.toFixed(2));
      const gastoActual = Number((gastosCatMap.get(p.id_categoria) || 0).toFixed(2));
      const porcentaje = limite > 0 ? Number(((gastoActual / limite) * 100).toFixed(1)) : 0;

      if (gastoActual > limite) {
        const exceso = Number((gastoActual - limite).toFixed(2));
        alertas.push({
          tipo: 'exceso',
          id_categoria: p.id_categoria,
          nombre_categoria: nombreCat,
          monto_limite: limite,
          gasto_actual: gastoActual,
          porcentaje,
          mensaje: `Límite superado en ${nombreCat}: excedido por $${exceso.toLocaleString('es-CO')} COP (${porcentaje}% del límite).`,
        });
      } else if (porcentaje >= 85) {
        alertas.push({
          tipo: 'advertencia',
          id_categoria: p.id_categoria,
          nombre_categoria: nombreCat,
          monto_limite: limite,
          gasto_actual: gastoActual,
          porcentaje,
          mensaje: `Alerta preventiva en ${nombreCat}: ha consumido el ${porcentaje}% del presupuesto mensual establecido.`,
        });
      }
    });

    return jsonResponse({
      mes,
      anio,
      ingresos_mes: ingresosMes,
      gastos_mes: gastosMes,
      balance_mes: balanceMes,
      balance_general: balanceGeneral,
      gastos_por_categoria: gastosPorCategoria,
      alertas,
    });
  }

  return jsonResponse({ error: 'Endpoint demo no encontrado' }, 404);
}
