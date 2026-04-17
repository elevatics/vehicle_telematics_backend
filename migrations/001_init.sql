-- ============================================================
--  Fleet Telematics - Initial Database Schema
--  Run: psql -U postgres -d fleet_telematics -f 001_init.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Profiles (app users + auth) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('fleet_manager','operations_manager','driver','maintenance_staff','finance')),
  phone           TEXT,
  avatar_url      TEXT,
  traccar_user_id INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- ── Drivers (extended profile beyond Traccar basic driver name) ───────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traccar_driver_id INT UNIQUE,
  name              TEXT NOT NULL,
  license_number    TEXT,
  license_expiry    DATE,
  phone             TEXT,
  email             TEXT,
  performance_score INT NOT NULL DEFAULT 100 CHECK (performance_score BETWEEN 0 AND 100),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  joined_date       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers (status);
CREATE INDEX IF NOT EXISTS idx_drivers_traccar ON drivers (traccar_driver_id);

-- ── Maintenance orders ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traccar_device_id INT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('routine','repair','inspection','breakdown')),
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status            TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  description       TEXT,
  scheduled_date    DATE,
  completed_date    DATE,
  technician        TEXT,
  cost              NUMERIC(10,2),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_device    ON maintenance_orders (traccar_device_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status    ON maintenance_orders (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority  ON maintenance_orders (priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON maintenance_orders (scheduled_date);

-- ── Financial records ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traccar_device_id INT,
  type              TEXT NOT NULL CHECK (type IN ('fuel','toll','maintenance','revenue','other')),
  amount            NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  date              DATE NOT NULL,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_device ON financial_records (traccar_device_id);
CREATE INDEX IF NOT EXISTS idx_finance_type   ON financial_records (type);
CREATE INDEX IF NOT EXISTS idx_finance_date   ON financial_records (date);

-- ── Documents (vehicles + drivers) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('vehicle','driver')),
  entity_id    TEXT NOT NULL,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('registration','insurance','inspection','license','medical','background')),
  expiry_date  DATE,
  file_url     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('valid','expired','pending')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents (expiry_date);

-- ── Alerts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traccar_device_id INT,
  type              TEXT NOT NULL CHECK (type IN ('alert','info','trip','status')),
  message           TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  read              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_read     ON alerts (read);
CREATE INDEX IF NOT EXISTS idx_alerts_device   ON alerts (traccar_device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created  ON alerts (created_at DESC);

-- ── Scheduled reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type  TEXT NOT NULL,
  frequency    TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  recipients   TEXT[] NOT NULL DEFAULT '{}',
  last_run     TIMESTAMPTZ,
  next_run     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON scheduled_reports (created_by);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','drivers','maintenance_orders','financial_records','documents','scheduled_reports']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
      CREATE TRIGGER trg_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ── Seed: default fleet manager admin account ─────────────────────────────────
-- Password: Admin1234!  (bcrypt hash, change immediately in production)
INSERT INTO profiles (email, password_hash, full_name, role)
VALUES (
  'admin@fleettelematics.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2S',
  'Fleet Administrator',
  'fleet_manager'
)
ON CONFLICT (email) DO NOTHING;
