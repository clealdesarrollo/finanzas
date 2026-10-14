export interface Usuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  contrasena: string;
  fecha_registro?: string | Date;
}

export type TipoMovimiento = 'ingreso' | 'gasto';

export interface Categoria {
  id_categoria: number;
  id_usuario: number;
  nombre_categoria: string;
  tipo: TipoMovimiento;
}

export interface Transaccion {
  id_transaccion: number;
  id_usuario: number;
  id_categoria: number;
  monto: number;
  fecha: string;
  descripcion?: string | null;
  tipo: TipoMovimiento;
  nombre_categoria?: string;
}

export interface Presupuesto {
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

export interface MetaAhorro {
  id_meta: number;
  id_usuario: number;
  nombre_meta: string;
  monto_objetivo: number;
  monto_actual: number;
  porcentaje_progreso?: number;
}

export interface PanelResumen {
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

export interface AuthTokenPayload {
  id_usuario: number;
  correo: string;
  nombre: string;
}
