import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    logger.warn(`${err.statusCode} ${req.method} ${req.path} — ${err.message}`);
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  logger.error(`500 ${req.method} ${req.path} — ${err.message}`);
  if (err.stack) logger.error(`Stack: ${err.stack}`);
  return res.status(500).json({
    error: { message: 'Internal server error' },
  });
}
