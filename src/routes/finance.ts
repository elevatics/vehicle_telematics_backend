import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/finance
router.get('/', requireAuth, requireRole('fleet_manager', 'finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, device_id, from, to } = req.query;
    let sql = 'SELECT * FROM financial_records WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (type) { sql += ` AND type = $${idx++}`; params.push(type); }
    if (device_id) { sql += ` AND traccar_device_id = $${idx++}`; params.push(Number(device_id)); }
    if (from) { sql += ` AND date >= $${idx++}`; params.push(from); }
    if (to) { sql += ` AND date <= $${idx++}`; params.push(to); }

    sql += ' ORDER BY date DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get finance error:', err);
    res.status(500).json({ error: 'Failed to fetch financial records' });
  }
});

// GET /api/finance/summary
router.get('/summary', requireAuth, requireRole('fleet_manager', 'finance'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totals, byType, monthly] = await Promise.all([
      query(`SELECT
               COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) AS total_revenue,
               COALESCE(SUM(CASE WHEN type != 'revenue' THEN amount ELSE 0 END), 0) AS total_expenses,
               COALESCE(SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END), 0) AS fuel_costs,
               COALESCE(SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END), 0) AS maintenance_costs
             FROM financial_records`),
      query(`SELECT type, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
             FROM financial_records GROUP BY type`),
      query(`SELECT DATE_TRUNC('month', date) AS month,
               COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) AS revenue,
               COALESCE(SUM(CASE WHEN type != 'revenue' THEN amount ELSE 0 END), 0) AS expenses
             FROM financial_records
             GROUP BY month ORDER BY month DESC LIMIT 12`),
    ]);

    res.json({
      totals: totals.rows[0],
      by_type: byType.rows,
      monthly: monthly.rows,
    });
  } catch (err) {
    console.error('Finance summary error:', err);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// GET /api/finance/:id
router.get('/:id', requireAuth, requireRole('fleet_manager', 'finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM financial_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Financial record not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get finance record error:', err);
    res.status(500).json({ error: 'Failed to fetch financial record' });
  }
});

// POST /api/finance
router.post(
  '/',
  requireAuth,
  requireRole('fleet_manager', 'finance'),
  [
    body('type').isIn(['fuel', 'toll', 'maintenance', 'revenue', 'other']),
    body('amount').isFloat({ min: 0 }),
    body('date').isISO8601(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { traccar_device_id, type, amount, date, description } = req.body;

    try {
      const result = await query(
        `INSERT INTO financial_records (traccar_device_id, type, amount, date, description)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [traccar_device_id ?? null, type, amount, date, description ?? null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create finance record error:', err);
      res.status(500).json({ error: 'Failed to create financial record' });
    }
  }
);

// PATCH /api/finance/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'finance'),
  async (req: Request, res: Response): Promise<void> => {
    const { type, amount, date, description } = req.body;
    try {
      const result = await query(
        `UPDATE financial_records SET
           type = COALESCE($1, type),
           amount = COALESCE($2, amount),
           date = COALESCE($3, date),
           description = COALESCE($4, description)
         WHERE id = $5 RETURNING *`,
        [type, amount, date, description, req.params.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Financial record not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Update finance record error:', err);
      res.status(500).json({ error: 'Failed to update financial record' });
    }
  }
);

// DELETE /api/finance/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole('fleet_manager', 'finance'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await query(
        'DELETE FROM financial_records WHERE id = $1 RETURNING id',
        [req.params.id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Financial record not found' });
        return;
      }
      res.json({ message: 'Financial record deleted' });
    } catch (err) {
      console.error('Delete finance record error:', err);
      res.status(500).json({ error: 'Failed to delete financial record' });
    }
  }
);

export default router;
