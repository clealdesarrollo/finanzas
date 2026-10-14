import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './server/app.ts';
import path from 'path';
import fs from 'fs';

// El entorno dev de AI Studio requiere estrictamente el puerto 3000
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    // Modo de desarrollo con Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo de producción: servir carpeta dist
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const express = (await import('express')).default;
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`[FinanControl] Servidor corriendo exitosamente en http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FinanControl] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
