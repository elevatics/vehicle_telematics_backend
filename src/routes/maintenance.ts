import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/maintenance
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, device_id, priority } = req.query;
    let sql = 'SELECT * FROM maintenance_orders WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (status) { sql += ` AND status = $${idx++}`; params.push(status); }
    if (device_id) { sql += ` AND traccar_device_id = $${idx++}`; params.push(Number(device_id)); }
    if (priority) { sql += ` AND priority = $${idx++}`; params.push(priority); }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get maintenance error:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance orders' });
  }
});

// GET /api/maintenance/:id
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM maintenance_orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Maintenance order not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get maintenance order error:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance order' });
  }
});

// POST /api/maintenance
router.post(
  '/',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager', 'maintenance_staff'),
  [
    body('traccar_device_id').isInt(),
    body('type').isIn(['routine', 'repair', 'inspection', 'breakdown']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      traccar_device_id,
      type,
      priority = 'medium',
      status = 'scheduled',
      description,
      scheduled_date,
      technician,
      cost,
      notes,
    } = req.body;

    try {
      const result = await query(
        `INSERT INTO maintenance_orders
          (traccar_device_id, type, priority, status, description, scheduled_date, technician, cost, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [traccar_device_id, type, priority, status, description ?? null, scheduled_date ?? null,
         technician ?? null, cost ?? null, notes ?? null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create maintenance error:', err);
      res.status(500).json({ error: 'Failed to create maintenance order' });
    }
  }
);

// PATCH /api/maintenance/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager', 'maintenance_staff'),
  async (req: Request, res: Response): Promise<void> => {
    const {
      type, priority, status, description, scheduled_date,
      completed_date, technician, cost, notes,
    } = req.body;

    try {
      const result = await query(
        `UPDATE maintenance_orders SET
          type = COALESCE($1, type),
          priority = COALESCE($2, priority),
          status = COALESCE($3, status),
          description = COALESCE($4, description),
          scheduled_date = COALESCE($5, scheduled_date),
          completed_date = COALESCE($6, completed_date),
          technician = COALESCE($7, technician),
          cost = COALESCE($8, cost),
          notes = COALESCE($9, notes)
         WHERE id = $10
         RETURNING *`,
        [type, priority, status, description, scheduled_date, completed_date,
         technician, cost, notes, req.params.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Maintenance order not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Update maintenance error:', err);
      res.status(500).json({ error: 'Failed to update maintenance order' });
    }
  }
);

// DELETE /api/maintenance/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await query(
        'DELETE FROM maintenance_orders WHERE id = $1 RETURNING id',
        [req.params.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Maintenance order not found' });
        return;
      }
      res.json({ message: 'Maintenance order deleted' });
    } catch (err) {
      console.error('Delete maintenance error:', err);
      res.status(500).json({ error: 'Failed to delete maintenance order' });
    }
  }
);

// GET /api/maintenance/stats/summary — cost summary by vehicle + type
router.get('/stats/summary', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalCost, byType, byStatus] = await Promise.all([
      query('SELECT COALESCE(SUM(cost), 0) AS total FROM maintenance_orders WHERE status = $1', ['completed']),
      query(`SELECT type, COUNT(*) AS count, COALESCE(SUM(cost), 0) AS total_cost
             FROM maintenance_orders GROUP BY type`),
      query(`SELECT status, COUNT(*) AS count FROM maintenance_orders GROUP BY status`),
    ]);

    res.json({
      total_cost: totalCost.rows[0].total,
      by_type: byType.rows,
      by_status: byStatus.rows,
    });
  } catch (err) {
    console.error('Maintenance stats error:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance stats' });
  }
});

export default router;
