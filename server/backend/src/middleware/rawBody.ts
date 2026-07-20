import type { Request, Response, NextFunction } from 'express';

export function rawBodyMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.method === 'POST') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      (req as any).rawBody = raw;
      if (raw.length > 0) {
        try { req.body = JSON.parse(raw.toString('utf8')); } catch {}
      }
      (req as any)._body = true;
      next();
    });
  } else {
    next();
  }
}
