import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getTraccarDrivers,
  createTraccarDriver,
  updateTraccarDriver,
  deleteTraccarDriver,
} from '../services/traccar';

const router = Router();

// GET /api/traccar-drivers — list all drivers from Traccar
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const drivers = await getTraccarDrivers();
    res.json(drivers);
  } catch (err) {
    console.error('Get Traccar drivers error:', err);
    res.status(500).json({ error: 'Failed to fetch drivers from Traccar' });
  }
});

// POST /api/traccar-drivers — create a driver in Traccar
router.post(
  '/',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  async (req: Request, res: Response): Promise<void> => {
    const { name, uniqueId, attributes } = req.body;
    if (!name || !uniqueId) {
      res.status(400).json({ error: 'name and uniqueId are required' });
      return;
    }
    try {
      const driver = await createTraccarDriver({ name, uniqueId, attributes });
      res.status(201).json(driver);
    } catch (err) {
      console.error('Create Traccar driver error:', err);
      res.status(500).json({ error: 'Failed to create driver in Traccar' });
    }
  }
);

// PUT /api/traccar-drivers/:id — update a driver in Traccar
router.put(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid driver ID' });
      return;
    }
    const { name, uniqueId, attributes } = req.body;
    if (!name || !uniqueId) {
      res.status(400).json({ error: 'name and uniqueId are required' });
      return;
    }
    try {
      const driver = await updateTraccarDriver(id, { name, uniqueId, attributes });
      res.json(driver);
    } catch (err) {
      console.error('Update Traccar driver error:', err);
      res.status(500).json({ error: 'Failed to update driver in Traccar' });
    }
  }
);

// DELETE /api/traccar-drivers/:id — delete a driver from Traccar
router.delete(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid driver ID' });
      return;
    }
    try {
      await deleteTraccarDriver(id);
      res.json({ message: 'Driver deleted from Traccar' });
    } catch (err) {
      console.error('Delete Traccar driver error:', err);
      res.status(500).json({ error: 'Failed to delete driver from Traccar' });
    }
  }
);

export default router;
