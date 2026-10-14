import { Router } from 'express';
import { obtenerPanel } from '../controllers/panelController.ts';
import { authMiddleware } from '../middlewares/auth.ts';

const router = Router();

router.use(authMiddleware);

router.get('/', obtenerPanel);

export default router;
