import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getTripsReport, getStopsReport, getRouteReport, getSummaryReport, getEventsReport } from '../services/traccar';

const router = Router();

// GET /api/trips?deviceId=&from=&to=
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to query params are required (ISO 8601)' });
    return;
  }
  try {
    const trips = await getTripsReport(Number(deviceId), String(from), String(to));
    res.json(trips);
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ error: 'Failed to fetch trips from Traccar' });
  }
});

// GET /api/trips/stops?deviceId=&from=&to=
router.get('/stops', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const stops = await getStopsReport(Number(deviceId), String(from), String(to));
    res.json(stops);
  } catch (err) {
    console.error('Get stops error:', err);
    res.status(500).json({ error: 'Failed to fetch stops' });
  }
});

// GET /api/trips/route?deviceId=&from=&to=
router.get('/route', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const route = await getRouteReport(Number(deviceId), String(from), String(to));
    res.json(route);
  } catch (err) {
    console.error('Get route error:', err);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// GET /api/trips/summary?deviceId=&from=&to=
router.get('/summary', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const summary = await getSummaryReport(Number(deviceId), String(from), String(to));
    res.json(summary);
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/trips/events?deviceId=&from=&to=&type=
router.get('/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to, type } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const events = await getEventsReport(
      Number(deviceId),
      String(from),
      String(to),
      type ? String(type) : undefined
    );
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
