import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createTemplate, getTemplates, getTemplate, updateTemplate, deleteTemplate } from '../services/templates.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string | undefined;
    const templates = await getTemplates(req.client!.clientId, platform);
    res.json({ templates });
  } catch (err) {
    logger.error(`Templates GET: ${err}`);
    res.status(500).json({ error: { message: 'Failed to fetch templates' } });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, content, platform, keywords } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: { message: 'name and content required' } });
    }
    const template = await createTemplate(req.client!.clientId, { name, content, platform, keywords });
    res.status(201).json({ template });
  } catch (err) {
    logger.error(`Templates POST: ${err}`);
    res.status(500).json({ error: { message: 'Failed to create template' } });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await updateTemplate(Number(req.params.id), req.client!.clientId, req.body);
    if (!result) return res.status(404).json({ error: { message: 'Template not found' } });
    res.json({ template: result });
  } catch (err) {
    logger.error(`Templates PUT: ${err}`);
    res.status(500).json({ error: { message: 'Failed to update template' } });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await deleteTemplate(Number(req.params.id), req.client!.clientId);
    if (!result) return res.status(404).json({ error: { message: 'Template not found' } });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    logger.error(`Templates DELETE: ${err}`);
    res.status(500).json({ error: { message: 'Failed to delete template' } });
  }
});

export { router as templateRouter };
