import rateLimit from 'express-rate-limit';

// Rate limiter for authentication routes (login / register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'test' ? 1000 : 50, // Permite más en tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes de autenticación desde esta dirección IP. Intente de nuevo en 15 minutos.',
  },
});

// General rate limiter for API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de solicitudes de API excedido. Intente nuevamente en unos minutos.',
  },
});

// Helper for sanitizing strings against script injection while preserving normal characters like &
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

