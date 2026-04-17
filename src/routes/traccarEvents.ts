import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getTraccarEvents, getDevices } from '../services/traccar';

const router = Router();

// GET /api/events — fetch recent events from Traccar (last 24h, all devices), enriched with device name
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId, from, to, type } = req.query as Record<string, string>;
    const now = new Date();
    const resolvedFrom = from || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const resolvedTo = to || now.toISOString();

    const devices = await getDevices();
    const deviceMap = new Map(devices.map(d => [d.id, d.name]));

    const targetDevices = deviceId
      ? devices.filter(d => d.id === parseInt(deviceId))
      : devices;

    if (targetDevices.length === 0) {
      res.json([]);
      return;
    }

    const allEvents = await Promise.all(
      targetDevices.map(d =>
        getTraccarEvents({ deviceId: d.id, from: resolvedFrom, to: resolvedTo, type }).catch(() => [])
      )
    );

    const merged = allEvents
      .flat()
      .map(e => ({ ...e, deviceName: deviceMap.get(e.deviceId) ?? `Device #${e.deviceId}` }))
      .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());

    res.json(merged);
  } catch (err) {
    console.error('Get Traccar events error:', err);
    res.status(500).json({ error: 'Failed to fetch events from Traccar' });
  }
});

export default router;
