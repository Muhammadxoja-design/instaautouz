import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { listUserVideos, fetchComments, replyToComment } from '../services/tiktok.js';
import { logger } from '../utils/logger.js';

const router = Router();

/* TikTok webhook verification (challenge response) */
router.get('/webhook', (req: Request, res: Response) => {
  try {
    const challenge = req.query['challenge'];
    if (challenge) {
      return res.status(200).send(challenge);
    }
    res.status(400).send('Missing challenge');
  } catch (err) {
    logger.error(`TikTok webhook GET: ${err}`);
    res.status(500).send('Internal error');
  }
});

/* TikTok webhook event receiver */
router.post('/webhook', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    logger.info(`TikTok webhook: ${JSON.stringify(body).slice(0, 200)}`);
    /* TODO: process comment/video events when TikTok webhook delivers them */
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error(`TikTok webhook POST: ${err}`);
    res.status(500).json({ status: 'error' });
  }
});

/* Get linked account's videos */
router.get('/videos', authenticate, async (req: Request, res: Response) => {
  try {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: { message: 'TIKTOK_ACCESS_TOKEN not configured' } });
    }
    const openId = req.query.open_id as string;
    if (!openId) {
      return res.status(400).json({ error: { message: 'open_id required' } });
    }
    const videos = await listUserVideos(token, openId);
    res.json({ videos });
  } catch (err) {
    logger.error(`TikTok /videos: ${err}`);
    res.status(500).json({ error: { message: 'Failed to list videos' } });
  }
});

/* Get comments on a video */
router.get('/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: { message: 'TIKTOK_ACCESS_TOKEN not configured' } });
    }
    const videoId = req.query.video_id as string;
    if (!videoId) {
      return res.status(400).json({ error: { message: 'video_id required' } });
    }
    const comments = await fetchComments(videoId, token);
    res.json({ comments });
  } catch (err) {
    logger.error(`TikTok /comments: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch comments' } });
  }
});

/* Reply to a comment */
router.post('/reply', authenticate, async (req: Request, res: Response) => {
  try {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: { message: 'TIKTOK_ACCESS_TOKEN not configured' } });
    }
    const { videoId, commentId, text } = req.body;
    if (!videoId || !commentId || !text) {
      return res.status(400).json({ error: { message: 'videoId, commentId, text required' } });
    }
    const result = await replyToComment(videoId, commentId, text, token);
    res.json(result);
  } catch (err) {
    logger.error(`TikTok /reply: ${err}`);
    res.status(500).json({ error: { message: 'Failed to reply' } });
  }
});

export { router as tiktokRouter };
