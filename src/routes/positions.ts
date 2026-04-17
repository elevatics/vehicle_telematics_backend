import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getPositionHistory } from '../services/traccar';

const router = Router();

// GET /api/positions?deviceId=&from=&to=
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query as Record<string, string>;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const positions = await getPositionHistory(parseInt(deviceId), from, to);
    res.json(positions);
  } catch (err) {
    console.error('Get positions error:', err);
    res.status(500).json({ error: 'Failed to fetch position history' });
  }
});

export default router;
