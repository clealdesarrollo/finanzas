import { Router } from 'express';
import {
  listarMetas,
  crearMeta,
  abonarMeta,
  eliminarMeta,
} from '../controllers/metaController.ts';
import { authMiddleware } from '../middlewares/auth.ts';

const router = Router();

router.use(authMiddleware);

router.get('/', listarMetas);
router.post('/', crearMeta);
router.post('/:id/abonos', abonarMeta);
router.delete('/:id', eliminarMeta);

export default router;
