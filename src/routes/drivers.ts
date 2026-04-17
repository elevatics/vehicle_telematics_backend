import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { getTraccarDrivers } from '../services/traccar';

const router = Router();

// GET /api/drivers — merged Traccar drivers + DB extended profiles
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [dbDrivers, traccarDrivers] = await Promise.all([
      query('SELECT * FROM drivers ORDER BY name ASC'),
      getTraccarDrivers().catch(() => []),
    ]);

    const traccarMap = new Map(traccarDrivers.map((d) => [d.id, d] as [number, typeof d]));

    const merged = dbDrivers.rows.map((d: Record<string, unknown> & { traccar_driver_id?: number }) => ({
      ...d,
      traccar_data: d.traccar_driver_id ? traccarMap.get(d.traccar_driver_id) ?? null : null,
    }));

    res.json(merged);
  } catch (err) {
    console.error('Get drivers error:', err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// GET /api/drivers/:id
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get driver error:', err);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// POST /api/drivers
router.post(
  '/',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  [
    body('name').trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('license_number').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, phone, license_number, license_expiry, traccar_driver_id, joined_date } = req.body;

    try {
      const result = await query(
        `INSERT INTO drivers (name, email, phone, license_number, license_expiry, traccar_driver_id, joined_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, email ?? null, phone ?? null, license_number ?? null, license_expiry ?? null, traccar_driver_id ?? null, joined_date ?? null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create driver error:', err);
      res.status(500).json({ error: 'Failed to create driver' });
    }
  }
);

// PATCH /api/drivers/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, phone, license_number, license_expiry, performance_score, status, joined_date } = req.body;
    try {
      const result = await query(
        `UPDATE drivers SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          license_number = COALESCE($4, license_number),
          license_expiry = COALESCE($5, license_expiry),
          performance_score = COALESCE($6, performance_score),
          status = COALESCE($7, status),
          joined_date = COALESCE($8, joined_date)
         WHERE id = $9
         RETURNING *`,
        [name, email, phone, license_number, license_expiry, performance_score, status, joined_date, req.params.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Driver not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Update driver error:', err);
      res.status(500).json({ error: 'Failed to update driver' });
    }
  }
);

// DELETE /api/drivers/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole('fleet_manager'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await query('DELETE FROM drivers WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Driver not found' });
        return;
      }
      res.json({ message: 'Driver deleted' });
    } catch (err) {
      console.error('Delete driver error:', err);
      res.status(500).json({ error: 'Failed to delete driver' });
    }
  }
);

export default router;
