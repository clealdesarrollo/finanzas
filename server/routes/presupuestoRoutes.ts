import { Router } from 'express';
import { listarPresupuestos, crearPresupuesto } from '../controllers/presupuestoController.ts';
import { authMiddleware } from '../middlewares/auth.ts';

const router = Router();

router.use(authMiddleware);

router.get('/', listarPresupuestos);
router.post('/', crearPresupuesto);

export default router;
