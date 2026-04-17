import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { query } from '../db';
import { getTripsReport, getSummaryReport, getEventsReport } from '../services/traccar';

const router = Router();

// GET /api/reports/fleet — fleet-wide summary from Traccar + DB
router.get('/fleet', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params are required (ISO 8601)' });
    return;
  }
  try {
    const [financials, maintenance] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(CASE WHEN type='revenue' THEN amount ELSE 0 END),0) AS revenue,
           COALESCE(SUM(CASE WHEN type='fuel' THEN amount ELSE 0 END),0) AS fuel_costs,
           COALESCE(SUM(CASE WHEN type='maintenance' THEN amount ELSE 0 END),0) AS maintenance_costs
         FROM financial_records WHERE date BETWEEN $1 AND $2`,
        [from, to]
      ),
      query(
        `SELECT status, COUNT(*) AS count FROM maintenance_orders
         WHERE created_at BETWEEN $1 AND $2 GROUP BY status`,
        [from, to]
      ),
    ]);

    res.json({
      period: { from, to },
      financials: financials.rows[0],
      maintenance_by_status: maintenance.rows,
    });
  } catch (err) {
    console.error('Fleet report error:', err);
    res.status(500).json({ error: 'Failed to generate fleet report' });
  }
});

// GET /api/reports/vehicle?deviceId=&from=&to= — per-vehicle summary from Traccar
router.get('/vehicle', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const [trips, summary, maintenance, finance] = await Promise.all([
      getTripsReport(Number(deviceId), String(from), String(to)),
      getSummaryReport(Number(deviceId), String(from), String(to)),
      query(
        'SELECT * FROM maintenance_orders WHERE traccar_device_id = $1 AND created_at BETWEEN $2 AND $3',
        [Number(deviceId), from, to]
      ),
      query(
        'SELECT * FROM financial_records WHERE traccar_device_id = $1 AND date BETWEEN $2 AND $3',
        [Number(deviceId), from, to]
      ),
    ]);

    res.json({
      deviceId: Number(deviceId),
      period: { from, to },
      trips,
      summary,
      maintenance: maintenance.rows,
      finance: finance.rows,
    });
  } catch (err) {
    console.error('Vehicle report error:', err);
    res.status(500).json({ error: 'Failed to generate vehicle report' });
  }
});

// GET /api/reports/driver?deviceId=&from=&to= — driver-focused events + trips
router.get('/driver', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { deviceId, from, to } = req.query;
  if (!deviceId || !from || !to) {
    res.status(400).json({ error: 'deviceId, from, and to are required' });
    return;
  }
  try {
    const [trips, events, summary] = await Promise.all([
      getTripsReport(Number(deviceId), String(from), String(to)),
      getEventsReport(Number(deviceId), String(from), String(to)),
      getSummaryReport(Number(deviceId), String(from), String(to)),
    ]);

    res.json({ deviceId: Number(deviceId), period: { from, to }, trips, events, summary });
  } catch (err) {
    console.error('Driver report error:', err);
    res.status(500).json({ error: 'Failed to generate driver report' });
  }
});

// GET /api/reports/financial?from=&to= — financial summary from DB
router.get('/financial', requireAuth, requireRole('fleet_manager', 'finance'), async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to are required' });
    return;
  }
  try {
    const result = await query(
      `SELECT type,
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS count
       FROM financial_records
       WHERE date BETWEEN $1 AND $2
       GROUP BY type`,
      [from, to]
    );
    res.json({ period: { from, to }, breakdown: result.rows });
  } catch (err) {
    console.error('Financial report error:', err);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

// GET /api/reports/scheduled — list saved scheduled reports
router.get('/scheduled', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT * FROM scheduled_reports ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Scheduled reports error:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled reports' });
  }
});

// POST /api/reports/scheduled — create a scheduled report
router.post('/scheduled', requireAuth, requireRole('fleet_manager', 'operations_manager'), async (req: Request, res: Response): Promise<void> => {
  const { report_type, frequency, recipients } = req.body;
  if (!report_type || !frequency || !recipients) {
    res.status(400).json({ error: 'report_type, frequency, and recipients are required' });
    return;
  }
  try {
    const result = await query(
      `INSERT INTO scheduled_reports (created_by, report_type, frequency, recipients)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user!.userId, report_type, frequency, recipients]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create scheduled report error:', err);
    res.status(500).json({ error: 'Failed to create scheduled report' });
  }
});

// DELETE /api/reports/scheduled/:id
router.delete('/scheduled/:id', requireAuth, requireRole('fleet_manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'DELETE FROM scheduled_reports WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Scheduled report not found' });
      return;
    }
    res.json({ message: 'Scheduled report deleted' });
  } catch (err) {
    console.error('Delete scheduled report error:', err);
    res.status(500).json({ error: 'Failed to delete scheduled report' });
  }
});

export default router;
