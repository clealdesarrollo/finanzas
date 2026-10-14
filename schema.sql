-- ==========================================================
-- FINANCONTROL - ESQUEMA DE BASE DE DATOS
-- Compatible con PostgreSQL y SQLite
-- ==========================================================

-- Tabla 1: USUARIO
CREATE TABLE IF NOT EXISTS USUARIO (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: CATEGORIA
CREATE TABLE IF NOT EXISTS CATEGORIA (
    id_categoria SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_categoria VARCHAR(50) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
);

-- Tabla 3: TRANSACCION
CREATE TABLE IF NOT EXISTS TRANSACCION (
    id_transaccion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_categoria INT NOT NULL,
    monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
    fecha DATE NOT NULL,
    descripcion VARCHAR(200),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria) ON DELETE RESTRICT
);

-- Tabla 4: PRESUPUESTO
CREATE TABLE IF NOT EXISTS PRESUPUESTO (
    id_presupuesto SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_categoria INT NOT NULL,
    monto_limite DECIMAL(12, 2) NOT NULL CHECK (monto_limite > 0),
    mes INT NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio INT NOT NULL,
    CONSTRAINT uq_usuario_categoria_mes_anio UNIQUE (id_usuario, id_categoria, mes, anio),
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria) ON DELETE CASCADE
);

-- Tabla 5: META_AHORRO
CREATE TABLE IF NOT EXISTS META_AHORRO (
    id_meta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_meta VARCHAR(80) NOT NULL,
    monto_objetivo DECIMAL(12, 2) NOT NULL CHECK (monto_objetivo > 0),
    monto_actual DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_actual >= 0),
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
);

-- Índices para optimización de consultas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_transaccion_usuario_fecha ON TRANSACCION(id_usuario, fecha);
CREATE INDEX IF NOT EXISTS idx_presupuesto_usuario_periodo ON PRESUPUESTO(id_usuario, anio, mes);
CREATE INDEX IF NOT EXISTS idx_categoria_usuario ON CATEGORIA(id_usuario);
CREATE INDEX IF NOT EXISTS idx_meta_usuario ON META_AHORRO(id_usuario);
