import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getGeofences, createGeofence, updateGeofence, deleteGeofence } from '../services/traccar';

const router = Router();

// GET /api/geofences
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const geofences = await getGeofences();
    res.json(geofences);
  } catch (err) {
    console.error('Get geofences error:', err);
    res.status(500).json({ error: 'Failed to fetch geofences from Traccar' });
  }
});

// POST /api/geofences
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, area, calendarId, attributes } = req.body;
    if (!name || !area) {
      res.status(400).json({ error: 'name and area are required' });
      return;
    }
    const geofence = await createGeofence({ name, description, area, calendarId, attributes });
    res.status(201).json(geofence);
  } catch (err) {
    console.error('Create geofence error:', err);
    res.status(500).json({ error: 'Failed to create geofence in Traccar' });
  }
});

// PUT /api/geofences/:id
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, description, area, calendarId, attributes } = req.body;
    if (!name || !area) {
      res.status(400).json({ error: 'name and area are required' });
      return;
    }
    const geofence = await updateGeofence(id, { name, description, area, calendarId, attributes });
    res.json(geofence);
  } catch (err) {
    console.error('Update geofence error:', err);
    res.status(500).json({ error: 'Failed to update geofence in Traccar' });
  }
});

// DELETE /api/geofences/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await deleteGeofence(id);
    res.status(204).send();
  } catch (err) {
    console.error('Delete geofence error:', err);
    res.status(500).json({ error: 'Failed to delete geofence in Traccar' });
  }
});

export default router;
