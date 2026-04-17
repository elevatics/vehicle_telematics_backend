export type UserRole = 'fleet_manager' | 'operations_manager' | 'driver' | 'maintenance_staff' | 'finance';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  traccar_user_id?: number;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ── Traccar raw types ──────────────────────────────────────────────────────────

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: 'online' | 'offline' | 'unknown';
  disabled: boolean;
  lastUpdate: string;
  positionId: number;
  groupId: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  attributes: Record<string, unknown>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address?: string;
  accuracy: number;
  network?: string;
  attributes: {
    ignition?: boolean;
    motion?: boolean;
    fuel?: number;
    fuelLevel?: number;
    odometer?: number;
    totalDistance?: number;
    distance?: number;
    hours?: number;
    rpm?: number;
    coolantTemp?: number;
    intakeTemp?: number;
    mapIntake?: number;
    obdSpeed?: number;
    statusCode?: string;
    [key: string]: unknown;
  };
}

export interface TraccarDriver {
  id: number;
  name: string;
  uniqueId: string;
  attributes: Record<string, unknown>;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes: Record<string, unknown>;
}

export interface TraccarTrip {
  deviceId: number;
  deviceName: string;
  maxSpeed: number;
  averageSpeed: number;
  distance: number;
  duration: number;
  startTime: string;
  startAddress: string;
  startLat: number;
  startLon: number;
  endTime: string;
  endAddress: string;
  endLat: number;
  endLon: number;
  driverUniqueId?: string;
  driverName?: string;
}

export interface TraccarEvent {
  id: number;
  deviceId: number;
  type: string;
  eventTime: string;
  positionId: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes: Record<string, unknown>;
}

export interface TraccarSummary {
  deviceId: number;
  deviceName: string;
  maxSpeed: number;
  averageSpeed: number;
  distance: number;
  spentFuel: number;
  startTime?: string;
  endTime?: string;
  engineHours: number;
}

// ── Merged Vehicle (Traccar device + position + DB data) ──────────────────────

export interface Vehicle {
  id: number;
  deviceId: string;
  protocol: string;
  name: string;
  plateNumber: string;
  driver: string;
  status: 'online' | 'idle' | 'offline';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  speed: number;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  lastUpdate: string;
  fuelLevel: number;
  odometer: number;
  outdated: boolean;
  valid: boolean;
  altitude: number;
  course: number;
  accuracy: number;
  network?: string;
  geofenceIds?: string;
  tripOdometer: number;
  fuelConsumption: number;
  ignition: boolean;
  statusCode: string;
  coolantTemp?: number;
  mapIntake?: number;
  rpm?: number;
  obdSpeed?: number;
  intakeTemp?: number;
  fuel: number;
  distance: number;
  totalDistance: number;
  motion: boolean;
}

// ── DB entity types ────────────────────────────────────────────────────────────

export interface Driver {
  id: string;
  traccar_driver_id?: number;
  name: string;
  license_number?: string;
  license_expiry?: string;
  phone?: string;
  email?: string;
  performance_score: number;
  status: 'active' | 'inactive' | 'on_leave';
  joined_date?: string;
  created_at: string;
}

export interface MaintenanceOrder {
  id: string;
  traccar_device_id: number;
  type: 'routine' | 'repair' | 'inspection' | 'breakdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  technician?: string;
  cost?: number;
  notes?: string;
  created_at: string;
}

export interface FinancialRecord {
  id: string;
  traccar_device_id?: number;
  type: 'fuel' | 'toll' | 'maintenance' | 'revenue' | 'other';
  amount: number;
  date: string;
  description?: string;
  created_at: string;
}

export interface Document {
  id: string;
  entity_type: 'vehicle' | 'driver';
  entity_id: string;
  doc_type: 'registration' | 'insurance' | 'inspection' | 'license' | 'medical' | 'background';
  expiry_date?: string;
  file_url?: string;
  status: 'valid' | 'expired' | 'pending';
  created_at: string;
}

export interface Alert {
  id: string;
  traccar_device_id?: number;
  type: 'alert' | 'info' | 'trip' | 'status';
  message: string;
  severity: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  created_by: string;
  report_type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  last_run?: string;
  next_run?: string;
}

// ── Request extensions ─────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
