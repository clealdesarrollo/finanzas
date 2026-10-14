# Manual de Usuario - FinanControl

¡Bienvenido a **FinanControl**! Este manual te guiará paso a paso para sacar el máximo provecho a la gestión de tus finanzas personales.

---

## 1. Registro e Inicio de Sesión

### 1.1 Registro de Cuenta
1. Ingresa a la aplicación desde tu navegador web.
2. Si es tu primera vez, selecciona la pestaña **Registro**.
3. Completa los siguientes campos:
   - **Nombre Completo:** Tu nombre o alias preferido.
   - **Correo Electrónico:** Dirección válida y única que servirá como tu identificador de acceso.
   - **Contraseña:** Mínimo 6 caracteres seguros.
4. **Tratamiento de Datos Personales (Ley 1581 de 2012):**
   - Haz clic en el enlace para leer los términos del régimen de Habeas Data en Colombia.
   - Marca la casilla obligatoria de aceptación.
5. Presiona **Registrarse y Comenzar**.
   - *Nota:* Tu cuenta se creará automáticamente con 5 categorías predeterminadas: **Salario** (Ingreso), **Alimentación** (Gasto), **Transporte** (Gasto), **Vivienda** (Gasto) y **Ocio** (Gasto).

### 1.2 Inicio de Sesión
- En la pestaña **Ingreso**, digita tu correo electrónico y contraseña.
- Tu sesión se mantendrá activa de forma segura mediante cookies protegidas `httpOnly`.
- Para pruebas rápidas sin escribir, puedes usar el botón **⚡ Probar con cuenta de demostración**.

---

## 2. Panel Principal (Dashboard)

El panel central te ofrece una vista panorámica en tiempo real de tu salud financiera durante el mes seleccionado:

- **Selector de Periodo:** Ubicado en la barra superior; te permite cambiar entre meses y años para consultar históricos o planear periodos futuros.
- **Tarjetas de Balance (KPIs en COP):**
  - **Ingresos del Mes:** Suma total de todos los dineros recibidos en el mes.
  - **Gastos del Mes:** Suma de todos los egresos registrados.
  - **Balance del Mes:** Diferencia neta (`Ingresos - Gastos`). Si es positivo se muestra en color verde; si es negativo se resalta en rojo.
  - **Balance General:** Tu patrimonio acumulado desde el inicio de tus registros.
- **Alertas Presupuestarias Inteligentes:**
  - Si un gasto supera el presupuesto fijado para su categoría, se despliega una alerta roja indicando el valor exacto del sobrecosto.
  - Si has consumido el 85 % o más de tu presupuesto, se muestra una alerta amarilla preventiva.
- **Distribución de Gastos por Categoría:**
  - Gráfico de barras horizontales con el valor en COP y el porcentaje relativo de cada categoría respecto al total gastado.

---

## 3. Registro y Gestión de Movimientos

### 3.1 Crear un Nuevo Movimiento
1. Dirígete a la pestaña **Movimientos**.
2. En el formulario lateral:
   - **Categoría:** Selecciona la categoría adecuada. El sistema heredará automáticamente si se trata de un *Ingreso* o de un *Gasto*.
   - **Monto (COP):** Digita la cifra (debe ser mayor a cero).
   - **Fecha:** Selecciona el día de la transacción (por defecto la fecha actual).
   - **Descripción:** (Opcional) Detalle descriptivo (ej. "Almuerzo de trabajo", "Pago nómina quincena 1").
3. Haz clic en **Guardar Movimiento**.

### 3.2 Historial y Eliminación de Movimientos
- La tabla muestra tus movimientos ordenados cronológicamente.
- Puedes filtrar por **Todos**, **Ingresos** o **Gastos**, y usar el buscador de texto.
- Para borrar un movimiento erróneo, haz clic en el icono de papelera (🗑️) y confirma la acción.

---

## 4. Presupuestos Mensuales y Límites de Gasto

1. Selecciona la pestaña **Presupuestos**.
2. **Definir un Límite:**
   - Elige una categoría de gasto (ej. *Alimentación*).
   - Ingresa el monto límite mensual en COP (ej. `$ 600.000`).
   - Selecciona el mes y año deseados.
   - Presiona **Establecer Presupuesto**.
3. **Monitoreo Visual:**
   - Cada presupuesto cuenta con una barra de progreso tricolor:
     - 🟢 **Verde:** Menos del 85 % consumido.
     - 🟡 **Ámbar:** Entre el 85 % y el 100 % consumido.
     - 🔴 **Rojo (Límite Excedido):** Cuando el gasto real sobrepasa el límite establecido.
   - Visualiza en todo momento tu saldo disponible o el excedente generado.

---

## 5. Metas de Ahorro

Las metas de ahorro te permiten apartar dinero con un objetivo concreto (ej. "Fondo de emergencia", "Vacaciones", "Enganche de vivienda"):

1. Ve a la pestaña **Metas de Ahorro**.
2. **Crear Meta:**
   - **Nombre de la Meta:** Descripción del objetivo.
   - **Monto Objetivo (COP):** Total que deseas alcanzar (mayor a 0).
   - **Monto Inicial:** (Opcional) Si ya cuentas con un ahorro previo.
   - Presiona **Crear Meta**.
3. **Registrar Abonos:**
   - En la tarjeta de la meta, haz clic en **+ Abonar**.
   - Ingresa el valor a abonar en COP (mayor a 0) y haz clic en **Confirmar Abono**.
   - El porcentaje de avance y la barra de progreso se actualizarán inmediatamente.
   - Al llegar al 100 %, la meta se marcará con la insignia verde **¡META LOGRADA!**.
4. Puedes eliminar cualquier meta cuando lo desees usando el icono de papelera.

---

## 6. Personalización de Categorías

1. Ingresa a la pestaña **Categorías**.
2. Puedes registrar nuevas categorías asignándoles un nombre y definiendo si son de tipo **Ingreso** o **Gasto**.
3. Las nuevas categorías estarán inmediatamente disponibles en el formulario de movimientos y en los presupuestos.

---

## 7. Modo Claro / Oscuro y Cierre de Sesión

- **Tema Claro / Oscuro:** Haz clic en el icono de sol/luna (☀️ / 🌙) en la esquina superior derecha para alternar entre temas según tu preferencia visual.
- **Cierre de Sesión:** Haz clic en el icono de salida (🚪) en la esquina superior derecha para revocar el token de acceso y cerrar tu sesión con seguridad.
