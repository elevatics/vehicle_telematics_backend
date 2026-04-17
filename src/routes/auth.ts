import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').trim().notEmpty(),
    body('role').isIn(['fleet_manager', 'operations_manager', 'driver', 'maintenance_staff', 'finance']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, full_name, role, phone } = req.body;

    try {
      const existing = await query('SELECT id FROM profiles WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const password_hash = await bcrypt.hash(password, 12);

      const result = await query(
        `INSERT INTO profiles (email, password_hash, full_name, role, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, role, phone, created_at`,
        [email, password_hash, full_name, role as UserRole, phone ?? null]
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const email = req.body.email;
    const password = String(req.body.password ?? '');

    try {
      const result = await query(
        'SELECT id, email, full_name, role, phone, password_hash, created_at FROM profiles WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as unknown as number }
      );

      const { password_hash: _, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, phone, avatar_url, traccar_user_id, created_at FROM profiles WHERE id = $1',
      [req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { full_name, phone, avatar_url } = req.body;
  try {
    const result = await query(
      `UPDATE profiles SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, email, full_name, role, phone, avatar_url, created_at`,
      [full_name ?? null, phone ?? null, avatar_url ?? null, req.user!.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 8) {
    res.status(400).json({ error: 'Invalid password data' });
    return;
  }
  try {
    const result = await query('SELECT password_hash FROM profiles WHERE id = $1', [req.user!.userId]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const new_hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [new_hash, req.user!.userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
