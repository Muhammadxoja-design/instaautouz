import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, path: reqPath } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    let ip = req.ip || req.socket.remoteAddress || '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    if (ip === '::1') ip = '127.0.0.1';

    const bodyInfo = ['POST', 'PUT', 'PATCH'].includes(method) && req.body
      ? JSON.stringify(req.body).slice(0, 200)
      : '';

    const statusColor = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : statusCode >= 300 ? '\x1b[36m' : '\x1b[32m';
    logger.info(`${statusColor}${statusCode}\x1b[0m ${method.padEnd(6)} ${reqPath} \x1b[90m${duration}ms ${ip}\x1b[0m${bodyInfo ? ` ${bodyInfo}` : ''}`);
  });

  next();
}
