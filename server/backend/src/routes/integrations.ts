import { Router, type Request, type Response } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.use(authenticate);

router.post('/core/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    logger.success(`File uploaded: ${fileUrl}`);
    res.json({ file_url: fileUrl });
  } catch (err) {
    logger.error(`Upload error: ${err instanceof Error ? err.message : err}`);
    res.status(500).json({ error: { message: 'Upload failed' } });
  }
});

export { router as integrationsRouter };
