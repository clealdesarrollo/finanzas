import React, { useState, useEffect, useId } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  ArrowRightLeft,
  Plus,
  Trash2,
  LogOut,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  ShieldCheck,
  Layers,
  RefreshCw,
  RotateCcw,
  Zap,
  Lock,
  Mail,
  User as UserIcon,
  X,
  Search,
  Check,
} from 'lucide-react';
import {
  isDemoModeActive,
  startDemoSession,
  stopDemoSession,
  resetDemoStateToDefaults,
  handleDemoApi,
  DEMO_USER,
} from './services/demoStore';

// Interfaces de datos
interface Usuario {
  id_usuario: number;
  nombre: string;
  correo: string;
}

interface Categoria {
  id_categoria: number;
  id_usuario: number;
  nombre_categoria: string;
  tipo: 'ingreso' | 'gasto';
}

interface Transaccion {
  id_transaccion: number;
  id_usuario: number;
  id_categoria: number;
  monto: number;
  fecha: string;
  descripcion?: string | null;
  tipo: 'ingreso' | 'gasto';
  nombre_categoria?: string;
}

interface Presupuesto {
  id_presupuesto: number;
  id_categoria: number;
  nombre_categoria?: string;
  monto_limite: number;
  mes: number;
  anio: number;
  gasto_actual?: number;
  porcentaje_gastado?: number;
  excedido?: boolean;
}

interface MetaAhorro {
  id_meta: number;
  id_usuario: number;
  nombre_meta: string;
  monto_objetivo: number;
  monto_actual: number;
  porcentaje_progreso?: number;
}

interface PanelData {
  mes: number;
  anio: number;
  ingresos_mes: number;
  gastos_mes: number;
  balance_mes: number;
  balance_general: number;
  gastos_por_categoria: Array<{
    id_categoria: number;
    nombre_categoria: string;
    total_gasto: number;
    porcentaje: number;
  }>;
  alertas: Array<{
    tipo: 'exceso' | 'advertencia';
    id_categoria: number;
    nombre_categoria: string;
    monto_limite: number;
    gasto_actual: number;
    porcentaje: number;
    mensaje: string;
  }>;
}

// Formateador de moneda colombiana (COP)
const formatCOP = (valor: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor || 0);
};

export default function App() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(() => isDemoModeActive());
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Navegación por pestañas
  const [currentTab, setCurrentTab] = useState<'panel' | 'movimientos' | 'presupuestos' | 'metas' | 'categorias'>('panel');

  // Estado de autenticación
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    acepta_tratamiento_datos: false,
  });

  // Filtros de fecha para panel y presupuestos
  const currentDate = new Date();
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(currentDate.getFullYear());

  // Datos principales
  const [panelData, setPanelData] = useState<PanelData | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [metas, setMetas] = useState<MetaAhorro[]>([]);

  // Modales
  const [showHabeasModal, setShowHabeasModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState<MetaAhorro | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'movimiento' | 'meta';
    id: number;
    label: string;
  } | null>(null);
  const [showCrearCatModal, setShowCrearCatModal] = useState(false);
  const [quickCatForm, setQuickCatForm] = useState({
    nombre_categoria: '',
    tipo: 'gasto' as 'ingreso' | 'gasto',
  });
  const [filtroPeriodoMovimientos, setFiltroPeriodoMovimientos] = useState<'mes' | 'todos'>('mes');
  const [filtroCategoriaTipo, setFiltroCategoriaTipo] = useState<'todos' | 'gasto' | 'ingreso'>('todos');
  const [montoAbono, setMontoAbono] = useState('');

  // Mensajes de alerta / feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulario nuevo movimiento
  const [formMovimiento, setFormMovimiento] = useState({
    id_categoria: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
  });

  // Formulario nuevo presupuesto
  const [formPresupuesto, setFormPresupuesto] = useState({
    id_categoria: '',
    monto_limite: '',
    mes: currentDate.getMonth() + 1,
    anio: currentDate.getFullYear(),
  });

  // Formulario nueva meta
  const [formMeta, setFormMeta] = useState({
    nombre_meta: '',
    monto_objetivo: '',
    monto_actual: '',
  });

  // Formulario nueva categoría
  const [formCategoria, setFormCategoria] = useState({
    nombre_categoria: '',
    tipo: 'gasto' as 'ingreso' | 'gasto',
  });

  // Filtro de movimientos
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  const [busquedaMovimiento, setBusquedaMovimiento] = useState('');

  // Configuración de modo oscuro
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

// Manejo seguro de JWT token compatible con iframes y navegadores modernos
const TOKEN_KEY = 'financontrol_token';

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error('Error al persistir token:', e);
  }
};

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Iniciar sesión en modo demo offline (sin servidor)
  const handleIniciarDemo = () => {
    const demoUser = startDemoSession();
    setIsDemo(true);
    setUser(demoUser);
    notify('success', '🚀 Sesión demo iniciada con éxito (Modo offline sin servidor).');
  };

  // Reiniciar datos de demo a valores predeterminados
  const handleReiniciarDemo = () => {
    resetDemoStateToDefaults();
    cargarCategorias();
    cargarPanel();
    cargarTransacciones();
    cargarPresupuestos();
    cargarMetas();
    notify('success', 'Datos de prueba de la demo reiniciados a los valores iniciales.');
  };

  // Función de fetch centralizada con soporte transparente para Modo Demo Offline
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Si estamos en modo demo (o sesión demo activa), procesar en el navegador sin ir al servidor
    if (isDemo || isDemoModeActive()) {
      return handleDemoApi(url, options);
    }

    const token = getStoredToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/registro')) {
      if (user) {
        setStoredToken(null);
        setUser(null);
        notify('error', 'Su sesión ha expirado. Por favor inicie sesión nuevamente.');
      }
    }
    return res;
  };

  // Comprobar sesión activa al cargar
  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      setLoading(true);
      // Si hay una sesión demo activa en el cliente, restaurarla directamente sin consultar al servidor
      if (isDemoModeActive()) {
        setIsDemo(true);
        setUser(DEMO_USER);
        return;
      }

      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.usuario);
      } else {
        setStoredToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando el usuario inicia sesión o cambia mes/año
  useEffect(() => {
    if (user) {
      cargarCategorias();
      cargarPanel();
      cargarTransacciones();
      cargarPresupuestos();
      cargarMetas();
    }
  }, [user, selectedMes, selectedAnio, filtroPeriodoMovimientos]);

  const cargarCategorias = async () => {
    try {
      const res = await apiFetch('/api/categorias');
      if (res.ok) {
        const data = await res.json();
        setCategorias(data.categorias || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarPanel = async () => {
    try {
      const res = await apiFetch(`/api/panel?mes=${selectedMes}&anio=${selectedAnio}`);
      if (res.ok) {
        const data = await res.json();
        setPanelData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarTransacciones = async (periodoOverride?: 'mes' | 'todos') => {
    try {
      const periodo = periodoOverride ?? filtroPeriodoMovimientos;
      const url =
        periodo === 'todos'
          ? '/api/transacciones'
          : `/api/transacciones?mes=${selectedMes}&anio=${selectedAnio}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransacciones(data.transacciones || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCrearCategoriaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatForm.nombre_categoria.trim()) {
      notify('error', 'El nombre de la categoría es obligatorio.');
      return;
    }

    try {
      const res = await apiFetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickCatForm),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', `Categoría "${data.categoria.nombre_categoria}" creada y seleccionada.`);
        await cargarCategorias();
        setFormMovimiento((prev) => ({
          ...prev,
          id_categoria: String(data.categoria.id_categoria),
        }));
        setFiltroCategoriaTipo('todos');
        setQuickCatForm({ nombre_categoria: '', tipo: 'gasto' });
        setShowCrearCatModal(false);
      } else {
        notify('error', data.error || 'Error al crear la categoría.');
      }
    } catch {
      notify('error', 'Error al conectar con el servidor.');
    }
  };

  const cargarPresupuestos = async () => {
    try {
      const res = await apiFetch(`/api/presupuestos?mes=${selectedMes}&anio=${selectedAnio}`);
      if (res.ok) {
        const data = await res.json();
        setPresupuestos(data.presupuestos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarMetas = async () => {
    try {
      const res = await apiFetch('/api/metas');
      if (res.ok) {
        const data = await res.json();
        setMetas(data.metas || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Autenticación
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        if (!authForm.acepta_tratamiento_datos) {
          notify('error', 'Debe aceptar la política de tratamiento de datos personales (Ley 1581 de 2012).');
          return;
        }

        const res = await fetch('/api/auth/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(authForm),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.token) {
            setStoredToken(data.token);
          }
          notify('success', '¡Registro exitoso! Bienvenido a FinanControl.');
          setUser(data.usuario);
        } else {
          notify('error', data.error || 'Error al registrar usuario.');
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            correo: authForm.correo,
            contrasena: authForm.contrasena,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.token) {
            setStoredToken(data.token);
          }
          notify('success', 'Bienvenido de nuevo a FinanControl.');
          setUser(data.usuario);
        } else {
          notify('error', data.error || 'Credenciales inválidas.');
        }
      }
    } catch {
      notify('error', 'Error al conectar con el servidor. Puedes ingresar usando "🚀 Ingresar con cuenta demo (Sin Servidor)".');
    }
  };

  const handleLogout = async () => {
    try {
      if (isDemo || isDemoModeActive()) {
        stopDemoSession();
        setIsDemo(false);
      } else {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStoredToken(null);
      setUser(null);
      notify('success', 'Sesión cerrada exitosamente.');
    }
  };

  // Crear Movimiento
  const handleCrearMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMovimiento.id_categoria) {
      notify('error', 'Debe seleccionar una categoría para el movimiento.');
      return;
    }
    const montoNum = parseFloat(formMovimiento.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      notify('error', 'El monto debe ser un número mayor a 0.');
      return;
    }

    try {
      const res = await apiFetch('/api/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_categoria: parseInt(formMovimiento.id_categoria, 10),
          monto: montoNum,
          fecha: formMovimiento.fecha,
          descripcion: formMovimiento.descripcion,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', 'Movimiento registrado correctamente.');
        
        // Sincronizar automáticamente el selector de mes/año al periodo de la fecha ingresada
        const [movAnio, movMes] = formMovimiento.fecha.split('-').map(Number);
        if (movAnio && movMes && (movMes !== selectedMes || movAnio !== selectedAnio)) {
          setSelectedMes(movMes);
          setSelectedAnio(movAnio);
        }

        setFormMovimiento({
          id_categoria: '',
          monto: '',
          fecha: new Date().toISOString().split('T')[0],
          descripcion: '',
        });
        cargarTransacciones();
        cargarPanel();
        cargarPresupuestos();
      } else {
        notify('error', data.error || 'Error al registrar el movimiento.');
      }
    } catch {
      notify('error', 'Error al conectar con el servidor.');
    }
  };

  // Eliminar Movimiento
  const handleEliminarMovimiento = async (id_transaccion: number) => {
    try {
      const res = await apiFetch(`/api/transacciones/${id_transaccion}`, { method: 'DELETE' });
      if (res.ok) {
        notify('success', 'Movimiento eliminado correctamente.');
        setConfirmDelete(null);
        cargarTransacciones();
        cargarPanel();
        cargarPresupuestos();
      } else {
        notify('error', 'No se pudo eliminar el movimiento.');
      }
    } catch {
      notify('error', 'Error de conexión.');
    }
  };

  // Crear o Actualizar Presupuesto
  const handleGuardarPresupuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPresupuesto.id_categoria) {
      notify('error', 'Seleccione una categoría para el presupuesto.');
      return;
    }
    const montoNum = parseFloat(formPresupuesto.monto_limite);
    if (isNaN(montoNum) || montoNum <= 0) {
      notify('error', 'El monto límite debe ser mayor a 0.');
      return;
    }

    try {
      const res = await apiFetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_categoria: parseInt(formPresupuesto.id_categoria, 10),
          monto_limite: montoNum,
          mes: parseInt(String(formPresupuesto.mes), 10),
          anio: parseInt(String(formPresupuesto.anio), 10),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', 'Presupuesto guardado exitosamente.');
        setFormPresupuesto({
          ...formPresupuesto,
          monto_limite: '',
        });
        cargarPresupuestos();
        cargarPanel();
      } else {
        notify('error', data.error || 'Error al guardar el presupuesto.');
      }
    } catch {
      notify('error', 'Error de conexión.');
    }
  };

  // Crear Meta
  const handleCrearMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMeta.nombre_meta.trim()) {
      notify('error', 'El nombre de la meta es requerido.');
      return;
    }
    const objetivo = parseFloat(formMeta.monto_objetivo);
    if (isNaN(objetivo) || objetivo <= 0) {
      notify('error', 'El monto objetivo debe ser mayor a 0.');
      return;
    }

    try {
      const res = await apiFetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_meta: formMeta.nombre_meta,
          monto_objetivo: objetivo,
          monto_actual: formMeta.monto_actual ? parseFloat(formMeta.monto_actual) : 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', 'Meta de ahorro creada con éxito.');
        setFormMeta({ nombre_meta: '', monto_objetivo: '', monto_actual: '' });
        cargarMetas();
      } else {
        notify('error', data.error || 'Error al registrar la meta.');
      }
    } catch {
      notify('error', 'Error al conectar.');
    }
  };

  // Abonar a Meta
  const handleAbonarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAbonoModal) return;
    const abonoNum = parseFloat(montoAbono);
    if (isNaN(abonoNum) || abonoNum <= 0) {
      notify('error', 'El monto del abono debe ser mayor a 0.');
      return;
    }

    try {
      const res = await apiFetch(`/api/metas/${showAbonoModal.id_meta}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_abono: abonoNum }),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', `Abono de ${formatCOP(abonoNum)} registrado con éxito.`);
        setShowAbonoModal(null);
        setMontoAbono('');
        cargarMetas();
      } else {
        notify('error', data.error || 'Error al registrar el abono.');
      }
    } catch {
      notify('error', 'Error al conectar.');
    }
  };

  // Eliminar Meta
  const handleEliminarMeta = async (id_meta: number) => {
    try {
      const res = await apiFetch(`/api/metas/${id_meta}`, { method: 'DELETE' });
      if (res.ok) {
        notify('success', 'Meta de ahorro eliminada.');
        setConfirmDelete(null);
        cargarMetas();
      } else {
        notify('error', 'Error al eliminar la meta.');
      }
    } catch {
      notify('error', 'Error al conectar.');
    }
  };

  // Crear Categoría
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategoria.nombre_categoria.trim()) {
      notify('error', 'El nombre de la categoría es requerido.');
      return;
    }

    try {
      const res = await apiFetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCategoria),
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', 'Categoría creada exitosamente.');
        setFormCategoria({ nombre_categoria: '', tipo: 'gasto' });
        cargarCategorias();
      } else {
        notify('error', data.error || 'Error al registrar la categoría.');
      }
    } catch {
      notify('error', 'Error de conexión.');
    }
  };

  // Filtrado de transacciones
  const transaccionesFiltradas = transacciones.filter((t) => {
    const coincideTipo = filtroTipo === 'todos' || t.tipo === filtroTipo;
    const texto = `${t.descripcion || ''} ${t.nombre_categoria || ''}`.toLowerCase();
    const coincideBusqueda = texto.includes(busquedaMovimiento.toLowerCase());
    return coincideTipo && coincideBusqueda;
  });

  // Categoría actualmente seleccionada en el formulario
  const categoriaSeleccionada = categorias.find(
    (c) => String(c.id_categoria) === String(formMovimiento.id_categoria)
  );

  const mesesDelAno = [
    { num: 1, nombre: 'Enero' },
    { num: 2, nombre: 'Febrero' },
    { num: 3, nombre: 'Marzo' },
    { num: 4, nombre: 'Abril' },
    { num: 5, nombre: 'Mayo' },
    { num: 6, nombre: 'Junio' },
    { num: 7, nombre: 'Julio' },
    { num: 8, nombre: 'Agosto' },
    { num: 9, nombre: 'Septiembre' },
    { num: 10, nombre: 'Octubre' },
    { num: 11, nombre: 'Noviembre' },
    { num: 12, nombre: 'Diciembre' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Cargando FinanControl...</p>
        </div>
      </div>
    );
  }

  // Vista de Login / Registro
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
        {/* Notificación Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Barra superior de bienvenida */}
        <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              F
            </div>
            <span className="text-xl font-bold tracking-tight">FinanControl</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Alternar tema claro/oscuro"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </header>

        {/* Contenedor central de formulario */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {authMode === 'login'
                  ? 'Gestiona tus finanzas personales con control y claridad'
                  : 'Empieza a controlar tus ingresos, gastos y metas hoy'}
              </p>
            </div>

            {/* Selector de modo */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Registro
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={authForm.nombre}
                      onChange={(e) => setAuthForm({ ...authForm, nombre: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@ejemplo.com"
                    value={authForm.correo}
                    onChange={(e) => setAuthForm({ ...authForm, correo: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={authForm.contrasena}
                    onChange={(e) => setAuthForm({ ...authForm, contrasena: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Cumplimiento de la Ley 1581 de 2012 (Habeas Data) */}
              {authMode === 'register' && (
                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authForm.acepta_tratamiento_datos}
                      onChange={(e) =>
                        setAuthForm({ ...authForm, acepta_tratamiento_datos: e.target.checked })
                      }
                      className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                      Acepto la política de tratamiento de datos personales conforme a la{' '}
                      <button
                        type="button"
                        onClick={() => setShowHabeasModal(true)}
                        className="text-emerald-600 dark:text-emerald-400 underline font-medium hover:text-emerald-700"
                      >
                        Ley 1581 de 2012
                      </button>
                      .
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm mt-4 flex items-center justify-center gap-2"
              >
                {authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse y Comenzar'}
              </button>
            </form>

            {/* Botón de acceso de demostración rápido (Sin Servidor) */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
              <button
                type="button"
                onClick={handleIniciarDemo}
                className="w-full py-2.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                🚀 Ingresar con cuenta demo (1 clic - Sin Servidor)
              </button>
              <p className="text-[11px] text-slate-400">
                Acceso inmediato interactivo en el navegador. Funciona 100% offline sin necesidad de servidor ni base de datos.
              </p>
            </div>
          </div>
        </div>

        {/* Modal de Ley 1581 de 2012 */}
        {showHabeasModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-base">Aviso Legal - Ley 1581 de 2012</h3>
                </div>
                <button
                  onClick={() => setShowHabeasModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto text-xs text-slate-600 dark:text-slate-300 space-y-3 pr-2">
                <p>
                  En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> de la República de Colombia
                  (Régimen General de Protección de Datos Personales) y sus decretos reglamentarios, le informamos
                  que los datos suministrados a través de <strong>FinanControl</strong> serán tratados de manera
                  confidencial y segura.
                </p>
                <p>
                  <strong>1. Finalidad:</strong> Los datos recolectados (nombre, correo electrónico y registros
                  financieros personales) tienen como único fin la autenticación segura, la administración del
                  perfil de usuario y la provisión de las funcionalidades analíticas de control financiero,
                  presupuestos y metas de ahorro.
                </p>
                <p>
                  <strong>2. Aislamiento y Seguridad:</strong> Sus datos financieros están estrictamente aislados y
                  protegidos mediante cifrado de contraseñas con bcrypt y credenciales tokenizadas httpOnly.
                  Ningún tercero ni otro usuario tiene acceso a su información privada.
                </p>
                <p>
                  <strong>3. Derechos del Titular:</strong> Como titular de los datos, usted tiene derecho a
                  conocer, actualizar, rectificar y suprimir sus datos en cualquier momento dentro de la aplicación.
                </p>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAuthForm((prev) => ({ ...prev, acepta_tratamiento_datos: true }));
                    setShowHabeasModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Entendido y Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center py-4 text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800">
          FinanControl &copy; {new Date().getFullYear()} &middot; Cumple con Ley 1581 de 2012 (Colombia)
        </footer>
      </div>
    );
  }

  // Vista autenticada principal
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Bar Contract (1 línea, 3 zonas: marca, links de navegación, usuario/acciones) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zona 1: Marca */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            F
          </div>
          <span className="text-lg font-bold tracking-tight">FinanControl</span>
        </div>

        {/* Zona 2: Navegación de pestañas */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setCurrentTab('panel')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'panel'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Panel Resumen
          </button>
          <button
            onClick={() => setCurrentTab('movimientos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'movimientos'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Movimientos
          </button>
          <button
            onClick={() => setCurrentTab('presupuestos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'presupuestos'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Presupuestos
          </button>
          <button
            onClick={() => setCurrentTab('metas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'metas'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Metas de Ahorro
          </button>
          <button
            onClick={() => setCurrentTab('categorias')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'categorias'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Categorías
          </button>
        </nav>

        {/* Zona 3: Acciones y Usuario */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Selector de periodo activo */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(parseInt(e.target.value, 10))}
              className="bg-transparent border-0 py-0.5 text-xs font-medium focus:ring-0 cursor-pointer"
            >
              {mesesDelAno.map((m) => (
                <option key={m.num} value={m.num} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {m.nombre}
                </option>
              ))}
            </select>
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(parseInt(e.target.value, 10))}
              className="bg-transparent border-0 py-0.5 text-xs font-medium focus:ring-0 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Alternar tema claro/oscuro"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {isDemo && (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Demo Sin Servidor
              </span>
              <button
                type="button"
                onClick={handleReiniciarDemo}
                title="Reiniciar datos de prueba de la demo"
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Reiniciar Demo</span>
              </button>
            </div>
          )}

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold leading-tight">{user.nombre}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{user.correo}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navegación móvil inferior (<= md) */}
      <div className="md:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto px-4 py-2 gap-2">
        <button
          onClick={() => setCurrentTab('panel')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
            currentTab === 'panel' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Panel
        </button>
        <button
          onClick={() => setCurrentTab('movimientos')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
            currentTab === 'movimientos' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Movimientos
        </button>
        <button
          onClick={() => setCurrentTab('presupuestos')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
            currentTab === 'presupuestos' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Presupuestos
        </button>
        <button
          onClick={() => setCurrentTab('metas')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
            currentTab === 'metas' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Metas
        </button>
        <button
          onClick={() => setCurrentTab('categorias')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
            currentTab === 'categorias' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Categorías
        </button>
      </div>

      {/* Contenido principal según pestaña */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* PESTAÑA 1: PANEL RESUMEN */}
        {currentTab === 'panel' && (
          <div className="space-y-6">
            {/* Banner de bienvenida y periodo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Panel Financiero</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Resumen de {mesesDelAno.find((m) => m.num === selectedMes)?.nombre} {selectedAnio} en moneda colombiana (COP)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('movimientos')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar Movimiento
                </button>
                <button
                  onClick={() => {
                    cargarPanel();
                    cargarTransacciones();
                    cargarPresupuestos();
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  title="Refrescar datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alertas Presupuestarias Activas (RF-08 y PR-10) */}
            {panelData?.alertas && panelData.alertas.length > 0 && (
              <div className="space-y-2">
                {panelData.alertas.map((alerta, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                      alerta.tipo === 'exceso'
                        ? 'bg-rose-50/90 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200'
                        : 'bg-amber-50/90 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alerta.tipo === 'exceso' ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div className="flex-1 text-xs">
                      <span className="font-bold">
                        {alerta.tipo === 'exceso' ? '¡Presupuesto Superado!' : 'Atención al Presupuesto:'}
                      </span>{' '}
                      {alerta.mensaje}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fila de Tarjetas de Balance (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ingresos del mes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Ingresos del Mes</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCOP(panelData?.ingresos_mes || 0)}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Total percibido en el periodo
                </p>
              </div>

              {/* Gastos del mes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Gastos del Mes</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCOP(panelData?.gastos_mes || 0)}
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  Egresos acumulados del periodo
                </p>
              </div>

              {/* Balance del mes */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Balance del Mes</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`text-xl font-bold tabular-nums ${
                    (panelData?.balance_mes || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                >
                  {formatCOP(panelData?.balance_mes || 0)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Ingresos menos gastos del mes
                </p>
              </div>

              {/* Balance General Histórico */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Balance General</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`text-xl font-bold tabular-nums ${
                    (panelData?.balance_general || 0) >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600'
                  }`}
                >
                  {formatCOP(panelData?.balance_general || 0)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Patrimonio neto acumulado
                </p>
              </div>
            </div>

            {/* Sección de Gastos por Categoría con Barras Visuales (RF-11) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Distribución de Gastos por Categoría</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Porcentaje relativo sobre el total gastado en el mes
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                  Total: {formatCOP(panelData?.gastos_mes || 0)}
                </span>
              </div>

              {panelData?.gastos_por_categoria && panelData.gastos_por_categoria.length > 0 ? (
                <div className="space-y-4">
                  {panelData.gastos_por_categoria.map((cat) => (
                    <div key={cat.id_categoria} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {cat.nombre_categoria}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">{formatCOP(cat.total_gasto)}</span>
                          <span className="text-slate-400 text-[11px] tabular-nums">({cat.porcentaje}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, cat.porcentaje))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No hay gastos registrados en este periodo para graficar.
                </div>
              )}
            </div>

            {/* Accesos rápidos a últimos movimientos */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold tracking-tight">Últimos Movimientos del Periodo</h3>
                <button
                  onClick={() => setCurrentTab('movimientos')}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Ver todos &rarr;
                </button>
              </div>
              {transacciones.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transacciones.slice(0, 5).map((t) => (
                    <div key={t.id_transaccion} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            t.tipo === 'ingreso'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                          }`}
                        >
                          {t.tipo === 'ingreso' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {t.descripcion || t.nombre_categoria}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {t.nombre_categoria} &middot; {t.fecha}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-semibold tabular-nums ${
                          t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {t.tipo === 'ingreso' ? '+' : '-'} {formatCOP(t.monto)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No hay transacciones registradas este mes.</p>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: MOVIMIENTOS (TRANSACCIONES) */}
        {currentTab === 'movimientos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario de Registro de Movimiento */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-fit">
              <h3 className="text-sm font-bold tracking-tight mb-1">Registrar Movimiento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                El tipo (ingreso o gasto) se hereda automáticamente de la categoría seleccionada.
              </p>

              <form onSubmit={handleCrearMovimiento} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Categoría *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCrearCatModal(true)}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Nueva Categoría
                    </button>
                  </div>

                  {/* Filtro rápido de categorías por tipo para agilizar selección */}
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFiltroCategoriaTipo('todos')}
                      className={`flex-1 py-1 rounded font-medium transition-colors ${
                        filtroCategoriaTipo === 'todos'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Todas ({categorias.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroCategoriaTipo('gasto')}
                      className={`flex-1 py-1 rounded font-medium transition-colors ${
                        filtroCategoriaTipo === 'gasto'
                          ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Gastos ({categorias.filter((c) => (c.tipo || '').toLowerCase() === 'gasto').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroCategoriaTipo('ingreso')}
                      className={`flex-1 py-1 rounded font-medium transition-colors ${
                        filtroCategoriaTipo === 'ingreso'
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Ingresos ({categorias.filter((c) => (c.tipo || '').toLowerCase() === 'ingreso').length})
                    </button>
                  </div>

                  {categorias.length === 0 ? (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                      <p className="font-semibold">No tienes categorías creadas en tu cuenta.</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCrearCatModal(true)}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700"
                        >
                          + Crear Categoría
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Combo Select Principal */}
                      <select
                        required
                        value={formMovimiento.id_categoria}
                        onChange={(e) => setFormMovimiento({ ...formMovimiento, id_categoria: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      >
                        <option value="">-- Seleccione una categoría --</option>
                        {categorias
                          .filter((c) => {
                            if (filtroCategoriaTipo === 'todos') return true;
                            return (c.tipo || '').toLowerCase() === filtroCategoriaTipo;
                          })
                          .map((c) => (
                            <option key={c.id_categoria} value={String(c.id_categoria)}>
                              {c.tipo === 'ingreso' ? '🟢 Ingreso: ' : '🔴 Gasto: '} {c.nombre_categoria}
                            </option>
                          ))}
                      </select>

                      {/* Botones / Chips de selección rápida */}
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          Selección rápida:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60">
                          {categorias
                            .filter((c) => {
                              if (filtroCategoriaTipo === 'todos') return true;
                              return (c.tipo || '').toLowerCase() === filtroCategoriaTipo;
                            })
                            .map((c) => {
                              const isSelected = String(formMovimiento.id_categoria) === String(c.id_categoria);
                              const isIngreso = c.tipo === 'ingreso';
                              return (
                                <button
                                  key={c.id_categoria}
                                  type="button"
                                  onClick={() =>
                                    setFormMovimiento({ ...formMovimiento, id_categoria: String(c.id_categoria) })
                                  }
                                  className={`px-2 py-1 text-[11px] rounded-md font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                                    isSelected
                                      ? isIngreso
                                        ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                                        : 'bg-rose-600 border-rose-600 text-white font-bold shadow-xs'
                                      : isIngreso
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                                        : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
                                  }`}
                                >
                                  <span>{isIngreso ? '🟢' : '🔴'}</span>
                                  <span>{c.nombre_categoria}</span>
                                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Indicador visual del tipo de movimiento heredado */}
                  {categoriaSeleccionada ? (
                    <div
                      className={`mt-2 p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                        (categoriaSeleccionada.tipo || '').toLowerCase() === 'ingreso'
                          ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        {(categoriaSeleccionada.tipo || '').toLowerCase() === 'ingreso' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>Tipo de movimiento:</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide ${
                          (categoriaSeleccionada.tipo || '').toLowerCase() === 'ingreso'
                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                            : 'bg-rose-100 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                        }`}
                      >
                        {categoriaSeleccionada.tipo} (heredado)
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      El movimiento hereda automáticamente si es ingreso o gasto según la categoría elegida.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monto (COP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="Ej. 50000"
                      value={formMovimiento.monto}
                      onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formMovimiento.fecha}
                    onChange={(e) => setFormMovimiento({ ...formMovimiento, fecha: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descripción (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Ej. Compra de mercado semanal"
                    value={formMovimiento.descripcion}
                    onChange={(e) => setFormMovimiento({ ...formMovimiento, descripcion: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Guardar Movimiento
                </button>
              </form>
            </div>

            {/* Listado de Movimientos con Filtros */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-tight">Historial de Transacciones</h3>

                {/* Filtro y Búsqueda */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar movimiento..."
                      value={busquedaMovimiento}
                      onChange={(e) => setBusquedaMovimiento(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-40 sm:w-48"
                    />
                  </div>
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                    <button
                      onClick={() => setFiltroTipo('todos')}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        filtroTipo === 'todos' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFiltroTipo('ingreso')}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        filtroTipo === 'ingreso' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      Ingresos
                    </button>
                    <button
                      onClick={() => setFiltroTipo('gasto')}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        filtroTipo === 'gasto' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      Gastos
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabla de movimientos */}
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Fecha</th>
                      <th className="py-2.5 px-3 font-semibold">Categoría</th>
                      <th className="py-2.5 px-3 font-semibold">Descripción</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transaccionesFiltradas.length > 0 ? (
                      transaccionesFiltradas.map((t) => (
                        <tr key={t.id_transaccion} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{t.fecha}</td>
                          <td className="py-2.5 px-3 font-medium">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                t.tipo === 'ingreso'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {t.nombre_categoria}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                            {t.descripcion || '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                              t.tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {t.tipo === 'ingreso' ? '+' : '-'} {formatCOP(t.monto)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setConfirmDelete({ type: 'movimiento', id: t.id_transaccion, label: t.descripcion || t.nombre_categoria || 'este movimiento' })}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded"
                              title="Eliminar movimiento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No se encontraron transacciones para este criterio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: PRESUPUESTOS MENSUALES */}
        {currentTab === 'presupuestos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Presupuestos Mensuales</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Establece topes máximos de gasto por categoría para {mesesDelAno.find((m) => m.num === selectedMes)?.nombre} {selectedAnio}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario nuevo presupuesto */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-fit">
                <h3 className="text-sm font-bold tracking-tight mb-1">Definir Límite de Gasto</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Si ya existe un presupuesto para la categoría seleccionada, se actualizará su monto.
                </p>

                <form onSubmit={handleGuardarPresupuesto} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Categoría de Gasto *
                    </label>
                    {categorias.filter((c) => (c.tipo || '').toLowerCase() === 'gasto').length === 0 ? (
                      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                        <p className="font-semibold">No tienes categorías de gasto disponibles para presupuestar.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setFormCategoria({ nombre_categoria: '', tipo: 'gasto' });
                            setCurrentTab('categorias');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700"
                        >
                          + Crear Categoría de Gasto
                        </button>
                      </div>
                    ) : (
                      <>
                        <select
                          required
                          value={formPresupuesto.id_categoria}
                          onChange={(e) => setFormPresupuesto({ ...formPresupuesto, id_categoria: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        >
                          <option value="">-- Seleccione una categoría de gasto --</option>
                          {categorias
                            .filter((c) => (c.tipo || '').toLowerCase() === 'gasto')
                            .map((c) => (
                              <option key={c.id_categoria} value={String(c.id_categoria)}>
                                🔴 {c.nombre_categoria}
                              </option>
                            ))}
                        </select>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {categorias
                            .filter((c) => (c.tipo || '').toLowerCase() === 'gasto')
                            .map((c) => {
                              const isSelected = String(formPresupuesto.id_categoria) === String(c.id_categoria);
                              return (
                                <button
                                  key={c.id_categoria}
                                  type="button"
                                  onClick={() =>
                                    setFormPresupuesto({ ...formPresupuesto, id_categoria: String(c.id_categoria) })
                                  }
                                  className={`px-2 py-1 text-[11px] rounded-md font-medium border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                  }`}
                                >
                                  🔴 {c.nombre_categoria}
                                </button>
                              );
                            })}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Monto Límite (COP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        required
                        placeholder="Ej. 400000"
                        value={formPresupuesto.monto_limite}
                        onChange={(e) =>
                          setFormPresupuesto({ ...formPresupuesto, monto_limite: e.target.value })
                        }
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mes</label>
                      <select
                        value={formPresupuesto.mes}
                        onChange={(e) =>
                          setFormPresupuesto({ ...formPresupuesto, mes: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {mesesDelAno.map((m) => (
                          <option key={m.num} value={m.num}>
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Año</label>
                      <input
                        type="number"
                        value={formPresupuesto.anio}
                        onChange={(e) =>
                          setFormPresupuesto({ ...formPresupuesto, anio: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    Establecer Presupuesto
                  </button>
                </form>
              </div>

              {/* Lista de presupuestos y sus estados */}
              <div className="lg:col-span-2 space-y-4">
                {presupuestos.length > 0 ? (
                  presupuestos.map((p) => {
                    const gastado = p.gasto_actual || 0;
                    const limite = p.monto_limite;
                    const porcentaje = p.porcentaje_gastado || 0;
                    const excedido = p.excedido;
                    const alertaAmarilla = !excedido && porcentaje >= 85;

                    return (
                      <div
                        key={p.id_presupuesto}
                        className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm transition-all ${
                          excedido
                            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                            : alertaAmarilla
                            ? 'border-amber-300 dark:border-amber-900/60'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{p.nombre_categoria}</span>
                            {excedido && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                LÍMITE EXCEDIDO
                              </span>
                            )}
                            {alertaAmarilla && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                CERCA DEL LÍMITE
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-slate-500">
                            {porcentaje}% consumido
                          </span>
                        </div>

                        {/* Barra de progreso */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              excedido ? 'bg-rose-600' : alertaAmarilla ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(1, porcentaje))}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Límite fijado</span>
                            <span className="font-semibold tabular-nums">{formatCOP(limite)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Gasto actual</span>
                            <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                              {formatCOP(gastado)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[11px]">
                              {excedido ? 'Excedente' : 'Disponible'}
                            </span>
                            <span
                              className={`font-semibold tabular-nums ${
                                excedido ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {excedido ? `+${formatCOP(gastado - limite)}` : formatCOP(limite - gastado)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                    No has configurado presupuestos para este periodo. Asigna uno usando el formulario a la izquierda.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: METAS DE AHORRO (RF-09, RF-10) */}
        {currentTab === 'metas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Metas de Ahorro</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Planea tus objetivos financieros a corto y mediano plazo y registra tus abonos
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario Crear Meta */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-fit">
                <h3 className="text-sm font-bold tracking-tight mb-1">Crear Nueva Meta</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Define un objetivo en COP para empezar a hacer seguimiento
                </p>

                <form onSubmit={handleCrearMeta} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nombre de la Meta *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      placeholder="Ej. Vacaciones fin de año"
                      value={formMeta.nombre_meta}
                      onChange={(e) => setFormMeta({ ...formMeta, nombre_meta: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Monto Objetivo (COP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        required
                        placeholder="Ej. 2500000"
                        value={formMeta.monto_objetivo}
                        onChange={(e) => setFormMeta({ ...formMeta, monto_objetivo: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Monto Inicial Ahorrado (Opcional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={formMeta.monto_actual}
                        onChange={(e) => setFormMeta({ ...formMeta, monto_actual: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    Crear Meta
                  </button>
                </form>
              </div>

              {/* Lista de Metas */}
              <div className="lg:col-span-2 space-y-4">
                {metas.length > 0 ? (
                  metas.map((m) => {
                    const completada = m.monto_actual >= m.monto_objetivo;
                    const porc = m.porcentaje_progreso || 0;

                    return (
                      <div
                        key={m.id_meta}
                        className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm transition-all ${
                          completada
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{m.nombre_meta}</span>
                            {completada && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                <Check className="w-3 h-3" /> ¡META LOGRADA!
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setShowAbonoModal(m);
                                setMontoAbono('');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              + Abonar
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: 'meta', id: m.id_meta, label: m.nombre_meta })}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Eliminar meta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-3">
                          <div
                            className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(1, porc))}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Objetivo</span>
                            <span className="font-semibold tabular-nums">{formatCOP(m.monto_objetivo)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Ahorrado actual</span>
                            <span className="font-semibold tabular-nums text-emerald-600">
                              {formatCOP(m.monto_actual)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[11px]">Progreso</span>
                            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                              {porc}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                    No tienes metas de ahorro registradas. Crea tu primera meta a la izquierda.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 5: CATEGORÍAS */}
        {currentTab === 'categorias' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario Crear Categoría */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-fit">
              <h3 className="text-sm font-bold tracking-tight mb-1">Nueva Categoría</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Personaliza tus categorías para organizar mejor tus movimientos
              </p>

              <form onSubmit={handleCrearCategoria} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Ej. Mascotas, Servicios, etc."
                    value={formCategoria.nombre_categoria}
                    onChange={(e) => setFormCategoria({ ...formCategoria, nombre_categoria: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Movimiento *
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_cat"
                        value="gasto"
                        checked={formCategoria.tipo === 'gasto'}
                        onChange={() => setFormCategoria({ ...formCategoria, tipo: 'gasto' })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Gasto</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_cat"
                        value="ingreso"
                        checked={formCategoria.tipo === 'ingreso'}
                        onChange={() => setFormCategoria({ ...formCategoria, tipo: 'ingreso' })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Ingreso</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Guardar Categoría
                </button>
              </form>
            </div>

            {/* Listado de Categorías Activas */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight">Categorías Disponibles ({categorias.length})</h3>
                <span className="text-xs text-slate-400">Aislamiento por usuario garantizado</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categorias.map((c) => (
                  <div
                    key={c.id_categoria}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <span className="font-semibold text-xs">{c.nombre_categoria}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.tipo === 'ingreso'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {c.tipo.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal para Abonar a Meta de Ahorro */}
      {showAbonoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm">Abonar a {showAbonoModal.nombre_meta}</h3>
              <button
                onClick={() => setShowAbonoModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAbonarMeta} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Monto actual ahorrado:</span>
                <span className="text-sm font-bold tabular-nums text-emerald-600">
                  {formatCOP(showAbonoModal.monto_actual)} / {formatCOP(showAbonoModal.monto_objetivo)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monto a Abonar (COP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="Ej. 100000"
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Confirmar Eliminación</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
              ¿Está seguro de que desea eliminar permanentemente {confirmDelete.label}? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete.type === 'movimiento') {
                    handleEliminarMovimiento(confirmDelete.id);
                  } else {
                    handleEliminarMeta(confirmDelete.id);
                  }
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Categoría Rápida */}
      {showCrearCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm">Nueva Categoría</h3>
              </div>
              <button
                onClick={() => setShowCrearCatModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearCategoriaRapida} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  placeholder="Ej. Restaurantes, Cursos, Mascotas"
                  value={quickCatForm.nombre_categoria}
                  onChange={(e) => setQuickCatForm({ ...quickCatForm, nombre_categoria: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickCatForm({ ...quickCatForm, tipo: 'gasto' })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      quickCatForm.tipo === 'gasto'
                        ? 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCatForm({ ...quickCatForm, tipo: 'ingreso' })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      quickCatForm.tipo === 'ingreso'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Ingreso
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCrearCatModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Guardar y Usar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pie de página */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-600 mt-auto">
        FinanControl &middot; Sistema de Gestión de Finanzas Personales &middot; Moneda: COP &middot; Ley 1581 de 2012
      </footer>
    </div>
  );
}
