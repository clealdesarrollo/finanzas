import { Router } from 'express';
import {
  listarTransacciones,
  crearTransaccion,
  eliminarTransaccion,
} from '../controllers/transaccionController.ts';
import { authMiddleware } from '../middlewares/auth.ts';

const router = Router();

router.use(authMiddleware);

router.get('/', listarTransacciones);
router.post('/', crearTransaccion);
router.delete('/:id', eliminarTransaccion);

export default router;
