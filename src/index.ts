import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { testConnection, initPool } from './db';
import authRoutes from './routes/auth';
import vehiclesRoutes from './routes/vehicles';
import driversRoutes from './routes/drivers';
import maintenanceRoutes from './routes/maintenance';
import tripsRoutes from './routes/trips';
import financeRoutes from './routes/finance';
import alertsRoutes from './routes/alerts';
import geofencesRoutes from './routes/geofences';
import reportsRoutes from './routes/reports';
import commandsRoutes from './routes/commands';
import traccarDriversRoutes from './routes/traccarDrivers';
import traccarEventsRoutes from './routes/traccarEvents';
import positionsRoutes from './routes/positions';
import aiRoutes from './routes/ai';
import aiAlertsRoutes from './routes/aiAlerts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(limiter);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Fleet Telematics API',
    version: '1.0.0',
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/geofences', geofencesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/commands', commandsRoutes);
app.use('/api/driverlists', traccarDriversRoutes);
app.use('/api/events', traccarEventsRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-alerts', aiAlertsRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const connectWithRetry = async (retries = 5, delayMs = 3000): Promise<void> => {
  for (let i = 1; i <= retries; i++) {
    try {
      await initPool();
      await testConnection();
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️  DB connection attempt ${i}/${retries} failed: ${msg}`);
      if (i < retries) {
        console.log(`🔄 Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw new Error('Could not connect to PostgreSQL after multiple attempts.');
};

const start = async () => {
  try {
    await connectWithRetry();
    app.listen(PORT, () => {
      console.log(`🚀 Fleet Telematics API running on http://localhost:${PORT}`);
      console.log(`📡 Traccar URL: ${process.env.TRACCAR_URL}`);
      console.log(`🌍 CORS allowed for: ${FRONTEND_URL}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();

export default app;
