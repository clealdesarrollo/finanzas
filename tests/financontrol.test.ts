import request from 'supertest';
import { createApp } from '../server/app.ts';
import { getDb, resetTestDb } from '../server/db/connection.ts';

const app = createApp();

describe('FinanControl - Suite de Pruebas Automatizadas (PR-01 a PR-14)', () => {
  let userTokenA: string;
  let userAId: number;
  let userTokenB: string;
  let userBId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Inicializar base de datos de prueba
    await getDb();
  });

  afterAll(async () => {
    await resetTestDb();
  });

  // PR-01: Registro válido con nombre, correo, contraseña y aceptación Ley 1581
  test('PR-01: Registro válido con categorías iniciales por defecto', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({
        nombre: 'Carlos Pérez',
        correo: 'carlos.perez@example.com',
        contrasena: 'clave123456',
        acepta_tratamiento_datos: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.usuario).toBeDefined();
    expect(res.body.usuario.correo).toBe('carlos.perez@example.com');
    expect(res.body.token).toBeDefined();

    userTokenA = res.body.token;
    userAId = res.body.usuario.id_usuario;

    // Verificar que se crearon las 5 categorías por defecto (Salario, Alimentación, Transporte, Vivienda, Ocio)
    const catRes = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(catRes.status).toBe(200);
    expect(catRes.body.categorias.length).toBeGreaterThanOrEqual(5);
    const nombres = catRes.body.categorias.map((c: any) => c.nombre_categoria);
    expect(nombres).toContain('Salario');
    expect(nombres).toContain('Alimentación');
    expect(nombres).toContain('Transporte');
    expect(nombres).toContain('Vivienda');
    expect(nombres).toContain('Ocio');
  });

  // PR-02: Registro duplicado debe ser rechazado
  test('PR-02: Registro duplicado con el mismo correo es rechazado', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({
        nombre: 'Carlos Clon',
        correo: 'carlos.perez@example.com',
        contrasena: 'otraClave999',
        acepta_tratamiento_datos: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo electrónico ya se encuentra registrado/i);
  });

  // PR-03: Login incorrecto (credenciales erróneas)
  test('PR-03: Login incorrecto retorna código 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correo: 'carlos.perez@example.com',
        contrasena: 'clave_totalmente_incorrecta',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/credenciales inválidas/i);
  });

  // PR-04: Logout exitoso y sesión
  test('PR-04: Cierre de sesión (logout)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/sesión cerrada/i);
  });

  // PR-05: Crear categoría válida (tipo ingreso o gasto)
  let customGastoCatId: number;
  test('PR-05: Crear categoría personalizada de tipo gasto o ingreso', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        nombre_categoria: 'Educación & Libros',
        tipo: 'gasto',
      });

    expect(res.status).toBe(201);
    expect(res.body.categoria).toBeDefined();
    expect(res.body.categoria.nombre_categoria).toBe('Educación & Libros');
    expect(res.body.categoria.tipo).toBe('gasto');
    customGastoCatId = res.body.categoria.id_categoria;
  });

  // PR-06: Movimiento con monto 0 o negativo rechazado
  test('PR-06: Movimiento con monto 0 o negativo es rechazado (código 400)', async () => {
    const resCero = await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto: 0,
        fecha: '2026-10-01',
        descripcion: 'Compra prueba',
      });

    expect(resCero.status).toBe(400);
    expect(resCero.body.error).toMatch(/monto debe ser un número estrictamente mayor a 0/i);

    const resNegativo = await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto: -50000,
        fecha: '2026-10-01',
      });

    expect(resNegativo.status).toBe(400);
  });

  // PR-07: Movimiento con categoría faltante o de otro usuario rechazado
  test('PR-07: Movimiento con categoría faltante o inexistente es rechazado', async () => {
    const resFaltante = await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        monto: 35000,
        fecha: '2026-10-02',
      });

    expect(resFaltante.status).toBe(400);
    expect(resFaltante.body.error).toMatch(/categoría es obligatoria/i);

    const resInexistente = await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: 99999,
        monto: 35000,
        fecha: '2026-10-02',
      });

    expect(resInexistente.status).toBe(400);
    expect(resInexistente.body.error).toMatch(/no existe o no pertenece/i);
  });

  // PR-08: Registrar y luego eliminar movimiento
  test('PR-08: Listar y eliminar movimiento correctamente', async () => {
    const createRes = await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto: 45000,
        fecha: '2026-10-05',
        descripcion: 'Libro de Finanzas Personales',
      });

    expect(createRes.status).toBe(201);
    const transaccionId = createRes.body.transaccion.id_transaccion;

    // Eliminar movimiento
    const delRes = await request(app)
      .delete(`/api/transacciones/${transaccionId}`)
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.mensaje).toMatch(/eliminada exitosamente/i);
  });

  // PR-09: Definir presupuesto mensual por categoría
  test('PR-09: Definir límite mensual de gasto por categoría', async () => {
    const res = await request(app)
      .post('/api/presupuestos')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto_limite: 150000,
        mes: 10,
        anio: 2026,
      });

    expect(res.status).toBe(201);
    expect(res.body.presupuesto).toBeDefined();
    expect(res.body.presupuesto.monto_limite).toBe(150000);
    expect(res.body.presupuesto.mes).toBe(10);
    expect(res.body.presupuesto.anio).toBe(2026);
  });

  // PR-10: Alerta cuando el gasto supere el presupuesto
  test('PR-10: Alertar cuando el gasto de una categoría supere su presupuesto', async () => {
    // Registramos un gasto que excede los 150.000 (por ejemplo 180.000)
    await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto: 180000,
        fecha: '2026-10-10',
        descripcion: 'Compra curso intensivo',
      });

    const panelRes = await request(app)
      .get('/api/panel?mes=10&anio=2026')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(panelRes.status).toBe(200);
    expect(panelRes.body.alertas).toBeDefined();
    expect(panelRes.body.alertas.length).toBeGreaterThan(0);

    const alertaExceso = panelRes.body.alertas.find((a: any) => a.id_categoria === customGastoCatId);
    expect(alertaExceso).toBeDefined();
    expect(alertaExceso.tipo).toBe('exceso');
    expect(alertaExceso.gasto_actual).toBe(180000);
    expect(alertaExceso.monto_limite).toBe(150000);
  });

  // PR-11: Crear meta de ahorro y registrar abono parcial con cálculo de progreso
  let metaId: number;
  test('PR-11: Crear meta de ahorro y registrar abono con porcentaje de progreso', async () => {
    const resMeta = await request(app)
      .post('/api/metas')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        nombre_meta: 'Fondo de Emergencia',
        monto_objetivo: 1000000,
        monto_actual: 200000,
      });

    expect(resMeta.status).toBe(201);
    expect(resMeta.body.meta.porcentaje_progreso).toBe(20);
    metaId = resMeta.body.meta.id_meta;

    // Registrar abono parcial de 300.000
    const resAbono = await request(app)
      .post(`/api/metas/${metaId}/abonos`)
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        monto_abono: 300000,
      });

    expect(resAbono.status).toBe(200);
    expect(resAbono.body.meta.monto_actual).toBe(500000);
    expect(resAbono.body.meta.porcentaje_progreso).toBe(50);
  });

  // PR-12: Abono inválido (<= 0) es rechazado
  test('PR-12: Abono inválido (monto <= 0) es rechazado (código 400)', async () => {
    const resCero = await request(app)
      .post(`/api/metas/${metaId}/abonos`)
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        monto_abono: 0,
      });

    expect(resCero.status).toBe(400);
    expect(resCero.body.error).toMatch(/mayor a 0/i);

    const resNeg = await request(app)
      .post(`/api/metas/${metaId}/abonos`)
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        monto_abono: -20000,
      });

    expect(resNeg.status).toBe(400);
  });

  // PR-13: Panel con ingresos, gastos, balance y barras por categoría
  test('PR-13: Panel mensual con ingresos, gastos, balance y gastos por categoría', async () => {
    // Obtenemos categoría de salario (ingreso)
    const catRes = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${userTokenA}`);

    const salarioCat = catRes.body.categorias.find((c: any) => c.nombre_categoria === 'Salario');
    expect(salarioCat).toBeDefined();

    // Registrar ingreso de salario
    await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: salarioCat.id_categoria,
        monto: 3500000,
        fecha: '2026-10-01',
        descripcion: 'Salario mensual recibido',
      });

    const panelRes = await request(app)
      .get('/api/panel?mes=10&anio=2026')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(panelRes.status).toBe(200);
    expect(panelRes.body.ingresos_mes).toBe(3500000);
    expect(panelRes.body.gastos_mes).toBe(180000);
    expect(panelRes.body.balance_mes).toBe(3320000);
    expect(panelRes.body.gastos_por_categoria).toBeInstanceOf(Array);
    expect(panelRes.body.gastos_por_categoria.length).toBeGreaterThan(0);
  });

  // PR-14: Aislamiento total entre usuarios
  test('PR-14: Aislamiento estricto de datos entre usuarios (RF-12)', async () => {
    // Registrar Usuario B
    const resUserB = await request(app)
      .post('/api/auth/registro')
      .send({
        nombre: 'María Gómez',
        correo: 'maria.gomez@example.com',
        contrasena: 'claveMaria2026',
        acepta_tratamiento_datos: true,
      });

    expect(resUserB.status).toBe(201);
    userTokenB = resUserB.body.token;
    userBId = resUserB.body.usuario.id_usuario;

    // 1. Usuario B no debe ver las transacciones de Usuario A
    const transBRes = await request(app)
      .get('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenB}`);

    expect(transBRes.status).toBe(200);
    expect(transBRes.body.transacciones.length).toBe(0);

    // 2. Usuario B no puede registrar transacciones usando una categoría de Usuario A
    const transInvalida = await request(app)
      .post('/api/transacciones')
      .set('Authorization', `Bearer ${userTokenB}`)
      .send({
        id_categoria: customGastoCatId, // categoría creada por Usuario A
        monto: 50000,
        fecha: '2026-10-12',
      });

    expect(transInvalida.status).toBe(400);
    expect(transInvalida.body.error).toMatch(/no existe o no pertenece/i);

    // 3. Usuario B no ve las metas de Usuario A
    const metasBRes = await request(app)
      .get('/api/metas')
      .set('Authorization', `Bearer ${userTokenB}`);

    expect(metasBRes.status).toBe(200);
    expect(metasBRes.body.metas.length).toBe(0);

    // 4. Usuario B no puede abonar a la meta de Usuario A
    const abonoInvalido = await request(app)
      .post(`/api/metas/${metaId}/abonos`)
      .set('Authorization', `Bearer ${userTokenB}`)
      .send({
        monto_abono: 50000,
      });

    expect(abonoInvalido.status).toBe(404);
  });

  // Pruebas adicionales de cobertura para superar el 80-85% en controladores
  test('COBERTURA-01: Validaciones de registro (faltantes, contraseña corta, Habeas Data no aceptado)', async () => {
    // Sin aceptar Ley 1581
    const resHabeas = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Ana', correo: 'ana@example.com', contrasena: '123456', acepta_tratamiento_datos: false });
    expect(resHabeas.status).toBe(400);

    // Sin nombre
    const resSinNombre = await request(app)
      .post('/api/auth/registro')
      .send({ correo: 'ana@example.com', contrasena: '123456', acepta_tratamiento_datos: true });
    expect(resSinNombre.status).toBe(400);

    // Correo inválido
    const resEmailInvalido = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Ana', correo: 'correo_sin_arroba', contrasena: '123456', acepta_tratamiento_datos: true });
    expect(resEmailInvalido.status).toBe(400);

    // Contraseña menor a 6 caracteres
    const resPassCorta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Ana', correo: 'ana@example.com', contrasena: '123', acepta_tratamiento_datos: true });
    expect(resPassCorta.status).toBe(400);
  });

  test('COBERTURA-02: Endpoint /api/auth/me y validaciones de login', async () => {
    // Me con token
    const resMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resMe.status).toBe(200);
    expect(resMe.body.usuario.correo).toBe('carlos.perez@example.com');

    // Me sin token
    const resMeNoAuth = await request(app).get('/api/auth/me');
    expect(resMeNoAuth.status).toBe(401);

    // Login sin campos
    const resLoginVacio = await request(app).post('/api/auth/login').send({});
    expect(resLoginVacio.status).toBe(400);

    // Login usuario inexistente
    const resLoginNoUser = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'inexistente@example.com', contrasena: '123456' });
    expect(resLoginNoUser.status).toBe(401);
  });

  test('COBERTURA-03: Validaciones de Categorías (nombre vacío, tipo inválido, duplicado)', async () => {
    // Nombre vacío
    const resVacio = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({ nombre_categoria: '', tipo: 'gasto' });
    expect(resVacio.status).toBe(400);

    // Tipo inválido
    const resTipoInvalido = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({ nombre_categoria: 'Extra', tipo: 'otro' });
    expect(resTipoInvalido.status).toBe(400);

    // Duplicado de categoría existente
    const resDup = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({ nombre_categoria: 'Salario', tipo: 'ingreso' });
    expect(resDup.status).toBe(400);
  });

  test('COBERTURA-04: Consultar y actualizar presupuestos (GET y PUT via POST existente)', async () => {
    // GET /api/presupuestos
    const resGet = await request(app)
      .get('/api/presupuestos?mes=10&anio=2026')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resGet.status).toBe(200);
    expect(resGet.body.presupuestos.length).toBeGreaterThan(0);

    // Validar error de mes o año inválido
    const resMesInvalido = await request(app)
      .get('/api/presupuestos?mes=13&anio=2026')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resMesInvalido.status).toBe(400);

    // Actualizar presupuesto existente
    const resUpdate = await request(app)
      .post('/api/presupuestos')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto_limite: 250000,
        mes: 10,
        anio: 2026,
      });
    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.presupuesto.monto_limite).toBe(250000);

    // Validaciones de presupuesto: monto <= 0, mes fuera de rango
    const resPresInvalido = await request(app)
      .post('/api/presupuestos')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({
        id_categoria: customGastoCatId,
        monto_limite: -100,
        mes: 10,
        anio: 2026,
      });
    expect(resPresInvalido.status).toBe(400);
  });

  test('COBERTURA-05: Gestión de Metas (GET, validaciones y DELETE)', async () => {
    // GET /api/metas
    const resGet = await request(app)
      .get('/api/metas')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resGet.status).toBe(200);
    expect(resGet.body.metas.length).toBeGreaterThan(0);

    // Crear meta con datos inválidos
    const resMetaInvalida = await request(app)
      .post('/api/metas')
      .set('Authorization', `Bearer ${userTokenA}`)
      .send({ nombre_meta: '', monto_objetivo: 0 });
    expect(resMetaInvalida.status).toBe(400);

    // Eliminar meta
    const resDel = await request(app)
      .delete(`/api/metas/${metaId}`)
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resDel.status).toBe(200);

    // Eliminar meta inexistente
    const resDelInexistente = await request(app)
      .delete('/api/metas/99999')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resDelInexistente.status).toBe(404);
  });

  test('COBERTURA-06: Filtros de transacciones y eliminación inválida', async () => {
    // Filtrar por tipo y periodo
    const resFiltro = await request(app)
      .get('/api/transacciones?tipo=gasto&mes=10&anio=2026')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resFiltro.status).toBe(200);

    // Eliminar ID inválido o inexistente
    const resDelNoExist = await request(app)
      .delete('/api/transacciones/99999')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resDelNoExist.status).toBe(404);

    const resDelBadId = await request(app)
      .delete('/api/transacciones/abc')
      .set('Authorization', `Bearer ${userTokenA}`);
    expect(resDelBadId.status).toBe(400);
  });
});
