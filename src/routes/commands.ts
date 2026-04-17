import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { sendCommand, getCommandTypes } from '../services/traccar';

const router = Router();

// POST /api/commands/send — send a command to a device
router.post('/send', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, type, attributes } = req.body;

  if (!deviceId || !type) {
    res.status(400).json({ error: 'deviceId and type are required' });
    return;
  }

  try {
    const result = await sendCommand({ deviceId: Number(deviceId), type, attributes: attributes ?? {} });
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Send command error:', msg);
    res.status(502).json({ error: `Failed to send command: ${msg}` });
  }
});

// GET /api/commands/types?deviceId= — get supported command types for a device
router.get('/types', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId } = req.query;
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId query param is required' });
    return;
  }
  try {
    const types = await getCommandTypes(Number(deviceId));
    res.json(types);
  } catch (err) {
    console.error('Get command types error:', err);
    res.json([]);
  }
});

export default router;
