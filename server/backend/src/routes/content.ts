import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { listPosts, getPost, createPost, updatePost, deletePost, getUpcomingPosts } from '../services/content.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const platform = req.query.platform as string | undefined;
    const posts = await listPosts(req.client!.clientId, status, platform);
    res.json({ posts });
  } catch (err) {
    logger.error(`Content GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to list posts' } });
  }
});

router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const posts = await getUpcomingPosts(req.client!.clientId, Number(req.query.limit) || 5);
    res.json({ posts });
  } catch (err) {
    logger.error(`Content GET /upcoming: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get upcoming posts' } });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await getPost(Number(req.params.id), req.client!.clientId);
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
    res.json({ post });
  } catch (err) {
    logger.error(`Content GET /:id: ${err}`);
    res.status(500).json({ error: { message: 'Failed to get post' } });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { platform, caption, mediaUrls, hashtags, scheduledAt, socialAccountId, contentType, metadata } = req.body;
    if (!platform || !scheduledAt) {
      return res.status(400).json({ error: { message: 'platform and scheduledAt required' } });
    }
    const post = await createPost(req.client!.clientId, {
      platform, caption, mediaUrls, hashtags, scheduledAt, socialAccountId, contentType, metadata,
    });
    res.status(201).json({ post });
  } catch (err) {
    logger.error(`Content POST: ${err}`);
    res.status(500).json({ error: { message: 'Failed to create post' } });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { caption, mediaUrls, hashtags, scheduledAt, status, metadata } = req.body;
    const post = await updatePost(Number(req.params.id), req.client!.clientId, {
      caption, mediaUrls, hashtags, scheduledAt, status, metadata,
    });
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
    res.json({ post });
  } catch (err) {
    logger.error(`Content PUT: ${err}`);
    res.status(500).json({ error: { message: 'Failed to update post' } });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const post = await deletePost(Number(req.params.id), req.client!.clientId);
    if (!post) return res.status(404).json({ error: { message: 'Post not found' } });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    logger.error(`Content DELETE: ${err}`);
    res.status(500).json({ error: { message: 'Failed to delete post' } });
  }
});

export { router as contentRouter };
