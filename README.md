# FinanControl - Sistema Web de Gestión de Finanzas Personales

**FinanControl** es una plataforma web integral, robusta y modular para el control de finanzas personales. Permite registrar ingresos y gastos en Pesos Colombianos (COP), definir presupuestos mensuales por categoría con alertas automáticas de sobregiro, establecer metas de ahorro con seguimiento de abonos y porcentaje de avance, y visualizar un panel analítico completo con aislamiento total de datos por usuario y estricto cumplimiento de la Ley 1581 de 2012 (Habeas Data).

---

## 🚀 Stack Tecnológico

- **Backend:** Node.js 20 (LTS) + Express 4, API RESTful con respuestas JSON estandarizadas y códigos HTTP semánticos.
- **Base de Datos:**
  - **Producción:** PostgreSQL 16+ con consultas 100 % parametrizadas (`$1, $2, ...`) para prevenir inyecciones SQL.
  - **Desarrollo Local y Tests:** Motor SQLite puro en memoria o archivo local (`sql.js`), con esquema relacional idéntico y sin dependencias nativas complejas.
- **Frontend:**
  - **SPA React 19:** Interfaz reactiva moderna servida con Vite + Express, Tailwind CSS, Lucide Icons, soporte nativo de modo claro y oscuro, y formato numérico tabular para moneda COP.
  - **SPA Vanilla alternativa (`/public/vanilla.html`):** Implementación en HTML5, CSS3 y JavaScript vanilla servida directamente por Express.
- **Autenticación y Seguridad:**
  - JSON Web Tokens (JWT) almacenados en cookie `httpOnly` con flags `SameSite=Lax` y `Secure` en producción, además de soporte para cabecera `Authorization: Bearer <token>`.
  - Cifrado unidireccional de contraseñas con `bcrypt` (10 rondas de salt).
  - Protección de cabeceras HTTP con `helmet`.
  - Limitación de tasa de solicitudes (`express-rate-limit`) en rutas críticas de autenticación y API.
  - Validación de esquemas con `express-validator` y sanitización contra XSS.
- **Pruebas Automatizadas:** Jest + Supertest + SWC con **cobertura superior al 87 %** en lógica de controladores y servicios (PR-01 a PR-14).
- **Contenedores y Despliegue:** `Dockerfile` multi-etapa y `docker-compose.yml` para orquestación de servicios.

---

## 📂 Estructura Modular del Proyecto

```text
├── Dockerfile                  # Empaquetado de producción en dos etapas (Node 20 Alpine)
├── docker-compose.yml          # Orquestación de PostgreSQL 16 y FinanControl
├── schema.sql                  # Script DDL relacional con llaves foráneas e índices
├── package.json                # Dependencias y scripts de ejecución
├── tsconfig.json               # Configuración TypeScript
├── jest.config.cjs             # Configuración de pruebas con Jest y SWC
├── MANUAL_USUARIO.md           # Guía detallada para el usuario final
├── .env.example                # Plantilla de variables de entorno
├── server.ts                   # Punto de entrada unificado full-stack (Express + Vite)
├── server/                     # Código fuente del Backend
│   ├── app.ts                  # Configuración de Express, middlewares y rutas
│   ├── db/
│   │   └── connection.ts       # Adaptador polimórfico (PostgreSQL / SQLite)
│   ├── types/
│   │   └── index.ts            # Interfaces TypeScript del dominio
│   ├── middlewares/
│   │   ├── auth.ts             # Middleware de autenticación JWT
│   │   └── security.ts         # Rate limiting y sanitización XSS
│   ├── controllers/
│   │   ├── authController.ts   # Registro (Ley 1581), login, logout, me
│   │   ├── categoriaController.ts
│   │   ├── transaccionController.ts
│   │   ├── presupuestoController.ts
│   │   ├── metaController.ts
│   │   └── panelController.ts
│   └── routes/                 # Enrutadores REST de cada módulo
├── tests/
│   └── financontrol.test.ts    # Suite de pruebas automatizadas PR-01 a PR-14
├── src/                        # Código fuente del Frontend SPA
│   ├── App.tsx                 # Aplicación SPA completa con panel, transacciones y metas
│   ├── main.tsx                # Entrada React
│   └── index.css               # Estilos globales y tokens Tailwind
└── public/
    └── vanilla.html            # SPA alternativa en JavaScript Vanilla
```

---

## 🛠️ Instalación y Ejecución Local

### Prerrequisitos
- Node.js 20 o superior instalado.
- Gestor de paquetes npm.

### 1. Clonar e Instalar Dependencias
```bash
git clone <URL_DEL_REPOSITORIO>
cd financontrol
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```
Para desarrollo local sin PostgreSQL, puedes dejar `DATABASE_URL` comentada o vacía. El sistema iniciará automáticamente con SQLite en `./data/financontrol.sqlite`.

### 3. Ejecutar en Modo Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 🧪 Ejecución de Pruebas Automatizadas (PR-01 a PR-14)

El proyecto incluye 20 pruebas unitarias y de integración que validan exhaustivamente los requerimientos funcionales y no funcionales:

- **PR-01:** Registro de usuario válido y sembrado automático de categorías por defecto (*Salario*, *Alimentación*, *Transporte*, *Vivienda*, *Ocio*).
- **PR-02:** Rechazo de registro duplicado por correo (HTTP 400).
- **PR-03:** Rechazo de credenciales incorrectas en login (HTTP 401).
- **PR-04:** Cierre de sesión y limpieza de cookie de autenticación.
- **PR-05:** Creación de categorías personalizadas de tipo ingreso o gasto.
- **PR-06:** Rechazo de transacciones con monto `<= 0` (HTTP 400).
- **PR-07:** Rechazo de transacciones con categoría inexistente o de otro usuario (HTTP 400).
- **PR-08:** Registro y eliminación correcta de movimientos.
- **PR-09:** Definición de límites mensuales de presupuesto por categoría.
- **PR-10:** Generación de alertas cuando el gasto acumulado supera el límite de presupuesto.
- **PR-11:** Creación de metas de ahorro y abonos parciales con cálculo de porcentaje.
- **PR-12:** Rechazo de abonos a metas con monto `<= 0` (HTTP 400).
- **PR-13:** Generación de resumen mensual en panel (ingresos, gastos, balance y desglose de barras).
- **PR-14:** Aislamiento total de datos entre usuarios (el Usuario B no puede ver ni modificar datos del Usuario A).

### Comandos de Pruebas:
```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas con reporte de cobertura (> 75 %)
npm run test:coverage
```

---

## 🐳 Ejecución con Docker y Docker Compose

Para levantar la aplicación junto a un contenedor de base de datos PostgreSQL 16:

```bash
docker compose up --build -d
```
El contenedor de la base de datos aplicará automáticamente el archivo `schema.sql` y el servidor quedará disponible en `http://localhost:3000`.

---

## 🌐 Guía de Despliegue en Producción con HTTPS

### Opción A: Despliegue en Render (Recomendado)

1. **Crear Base de Datos PostgreSQL en Render:**
   - En tu panel de Render, haz clic en **New +** y selecciona **PostgreSQL**.
   - Nombre: `financontrol-db`.
   - Selecciona el plan gratuito o adecuado.
   - Copia la **Internal Database URL** generada.

2. **Crear Web Service:**
   - Haz clic en **New +** y selecciona **Web Service**.
   - Conecta el repositorio de GitHub de FinanControl.
   - **Environment:** `Node`.
   - **Build Command:** `npm ci && npm run build`.
   - **Start Command:** `node server.ts`.
   - **Variables de Entorno:**
     - `NODE_ENV`: `production`
     - `PORT`: `3000`
     - `DATABASE_URL`: *(Pega la Internal Database URL de tu PostgreSQL en Render)*
     - `JWT_SECRET`: *(Cadena secreta aleatoria de al menos 32 caracteres)*
     - `APP_URL`: `https://tu-servicio.onrender.com`
   - Haz clic en **Create Web Service**. Render aprovisionará certificado SSL/HTTPS de manera automática y gratuita.

---

### Opción B: Despliegue en Railway

1. **Crear Nuevo Proyecto en Railway:**
   - Inicia sesión en [Railway](https://railway.app/).
   - Selecciona **New Project** > **Provision PostgreSQL**.
2. **Desplegar el Código:**
   - En el mismo proyecto, haz clic en **+ New** > **GitHub Repo** y selecciona tu repositorio.
3. **Vincular Variables de Entorno:**
   - En la pestaña **Variables** del servicio web, agrega:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
     - `JWT_SECRET`: *(Clave aleatoria segura)*
     - `NODE_ENV`: `production`
     - `PORT`: `3000`
4. **Configurar Dominio con HTTPS:**
   - En **Settings** > **Networking**, haz clic en **Generate Domain**. Railway asignará un dominio público con HTTPS garantizado.

---

## ⚖️ Cumplimiento Legal: Ley 1581 de 2012 (Colombia)

FinanControl implementa los principios de protección y tratamiento de datos personales conforme al régimen de Habeas Data colombiano:
- **Principio de Libertad y Consentimiento:** Durante el registro, el usuario debe marcar explícitamente la casilla de consentimiento tras tener a su disposición el texto integral de la política de tratamiento.
- **Principio de Finalidad y Seguridad:** Los datos se utilizan única y exclusivamente para el cálculo y proyección de finanzas del usuario, con aislamiento criptográfico y arquitectural entre cuentas.
- **Derechos del Titular:** El usuario puede actualizar, consultar o eliminar sus movimientos y metas en cualquier momento.
