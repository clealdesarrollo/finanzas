import { Router } from 'express';
import { listarCategorias, crearCategoria } from '../controllers/categoriaController.ts';
import { authMiddleware } from '../middlewares/auth.ts';

const router = Router();

router.use(authMiddleware);

router.get('/', listarCategorias);
router.post('/', crearCategoria);

export default router;
