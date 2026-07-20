import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface ClientPayload {
  clientId: number;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      client?: ClientPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as ClientPayload;
    req.client = payload;
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.client?.role !== 'admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  next();
}
