import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getNotifications,
  createNotification,
  deleteNotification,
  linkNotificationToDevice,
  setDeviceAttribute,
  TraccarNotification,
} from '../services/traccar';

const router = Router();

// GET /api/ai-alerts — list all Traccar notification rules
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await getNotifications();
    res.json(notifications);
  } catch (err) {
    console.error('List alert rules error:', err);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

// POST /api/ai-alerts — create a new notification rule and link to device
// Body: { type, notificators, deviceId, speedLimit? }
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { type, notificators, deviceId, speedLimit } = req.body as {
    type: string;
    notificators: string;
    deviceId: number;
    speedLimit?: number;
  };

  if (!type || !notificators || !deviceId) {
    res.status(400).json({ error: 'type, notificators, and deviceId are required' });
    return;
  }

  try {
    if (type === 'speedLimitExceeded' && speedLimit != null) {
      await setDeviceAttribute(deviceId, { speedLimit });
    }

    const notification = await createNotification({
      type,
      notificators,
      always: false,
    } as TraccarNotification);

    await linkNotificationToDevice(deviceId, notification.id!);

    res.status(201).json({ message: 'Alert rule created and linked to device', notification });
  } catch (err) {
    console.error('Create alert rule error:', err);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

// DELETE /api/ai-alerts/:id — delete a notification rule
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid notification id' });
    return;
  }
  try {
    await deleteNotification(id);
    res.json({ message: `Alert rule ${id} deleted` });
  } catch (err) {
    console.error('Delete alert rule error:', err);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

export default router;
