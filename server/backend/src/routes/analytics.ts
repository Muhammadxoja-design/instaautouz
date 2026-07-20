import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getOverview,
  getInstagramInsights,
  getAiAnalytics,
  getDmAnalytics,
  getTimeline,
} from '../services/analytics.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const data = await getOverview(req.client!.clientId);
    res.json(data);
  } catch (err) {
    logger.error(`Analytics /overview: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get overview' } });
  }
});

router.get('/instagram', async (req: Request, res: Response) => {
  try {
    const data = await getInstagramInsights(req.client!.clientId);
    res.json(data);
  } catch (err) {
    logger.error(`Analytics /instagram: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get Instagram insights' } });
  }
});

router.get('/ai', async (req: Request, res: Response) => {
  try {
    const data = await getAiAnalytics(req.client!.clientId);
    res.json(data);
  } catch (err) {
    logger.error(`Analytics /ai: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get AI analytics' } });
  }
});

router.get('/dms', async (req: Request, res: Response) => {
  try {
    const data = await getDmAnalytics(req.client!.clientId);
    res.json(data);
  } catch (err) {
    logger.error(`Analytics /dms: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get DM analytics' } });
  }
});

router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const data = await getTimeline(req.client!.clientId, days);
    res.json(data);
  } catch (err) {
    logger.error(`Analytics /timeline: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get timeline' } });
  }
});

export { router as analyticsRouter };
