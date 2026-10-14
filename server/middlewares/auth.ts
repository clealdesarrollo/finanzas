import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '../types/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'financontrol_secret_jwt_key_2026_super_secure';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow token from cookie or Authorization header
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({
      error: 'Acceso no autorizado. Por favor inicie sesión para continuar.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Sesión inválida o expirada. Por favor inicie sesión nuevamente.',
    });
  }
}
