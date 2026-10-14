import { Router } from 'express';
import { body } from 'express-validator';
import { registrar, login, logout, me } from '../controllers/authController.ts';
import { authMiddleware } from '../middlewares/auth.ts';
import { authLimiter } from '../middlewares/security.ts';

const router = Router();

router.post(
  '/registro',
  authLimiter,
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('correo').isEmail().withMessage('Debe ingresar un correo válido'),
  body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener mínimo 6 caracteres'),
  registrar
);

router.post(
  '/login',
  authLimiter,
  body('correo').isEmail().withMessage('Debe ingresar un correo válido'),
  body('contrasena').notEmpty().withMessage('La contraseña es requerida'),
  login
);

router.post('/logout', logout);

router.get('/me', authMiddleware, me);

export default router;
