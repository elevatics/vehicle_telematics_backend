import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/alerts
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { read, device_id, severity } = req.query;
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (read !== undefined) { sql += ` AND read = $${idx++}`; params.push(read === 'true'); }
    if (device_id) { sql += ` AND traccar_device_id = $${idx++}`; params.push(Number(device_id)); }
    if (severity) { sql += ` AND severity = $${idx++}`; params.push(severity); }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/unread-count
router.get('/unread-count', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT COUNT(*) AS count FROM alerts WHERE read = false');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// POST /api/alerts
router.post(
  '/',
  requireAuth,
  requireRole('fleet_manager', 'operations_manager'),
  [
    body('type').isIn(['alert', 'info', 'trip', 'status']),
    body('message').trim().notEmpty(),
    body('severity').optional().isIn(['low', 'medium', 'high']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { traccar_device_id, type, message, severity = 'medium' } = req.body;
    try {
      const result = await query(
        `INSERT INTO alerts (traccar_device_id, type, message, severity)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [traccar_device_id ?? null, type, message, severity]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create alert error:', err);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
);

// PATCH /api/alerts/:id/read — mark single as read
router.patch('/:id/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'UPDATE alerts SET read = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark alert read error:', err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// PATCH /api/alerts/read-all — mark all as read
router.patch('/read-all', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    await query('UPDATE alerts SET read = true WHERE read = false');
    res.json({ message: 'All alerts marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', requireAuth, requireRole('fleet_manager', 'operations_manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('DELETE FROM alerts WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    console.error('Delete alert error:', err);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
