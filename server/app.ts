import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/authRoutes.ts';
import categoriaRoutes from './routes/categoriaRoutes.ts';
import transaccionRoutes from './routes/transaccionRoutes.ts';
import presupuestoRoutes from './routes/presupuestoRoutes.ts';
import metaRoutes from './routes/metaRoutes.ts';
import panelRoutes from './routes/panelRoutes.ts';
import { apiLimiter } from './middlewares/security.ts';

export function createApp(): express.Application {
  const app = express();

  // Helmet para cabeceras de seguridad (configurado para permitir el iframe de AI Studio)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permitir Vite y scripts en entorno dev
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      frameguard: false, // Permitir que la app se renderice dentro del iFrame de AI Studio
    })
  );

  // Asegurar explícitamente que no se envíe X-Frame-Options bloqueante
  app.use((_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    next();
  });

  // CORS restringido
  const allowedOrigins = [
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || origin.endsWith('.run.app')) {
          callback(null, true);
        } else {
          callback(null, true); // Permisivo en entorno sandbox
        }
      },
      credentials: true,
    })
  );

  // Middleware para JSON y cookies
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rutas de API con Rate Limiting
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'FinanControl API', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categorias', categoriaRoutes);
  app.use('/api/transacciones', transaccionRoutes);
  app.use('/api/presupuestos', presupuestoRoutes);
  app.use('/api/metas', metaRoutes);
  app.use('/api/panel', panelRoutes);

  // Servir archivos estáticos de vanilla SPA si existen en /public
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // Manejo de errores 404 para rutas API no encontradas
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Ruta no encontrada en la API de FinanControl.' });
  });

  // Manejador central de errores
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error no controlado en la aplicación:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Ha ocurrido un error inesperado en el servidor.',
    });
  });

  return app;
}

export default createApp();
