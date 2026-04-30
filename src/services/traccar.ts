import fetch from 'node-fetch';
import { TraccarDevice, TraccarPosition, TraccarDriver, TraccarGeofence, TraccarTrip, TraccarEvent, TraccarSummary, Vehicle } from '../types';

const TRACCAR_URL = process.env.TRACCAR_URL || 'http://localhost:8082';
const TRACCAR_EMAIL = process.env.TRACCAR_EMAIL || '';
const TRACCAR_PASSWORD = process.env.TRACCAR_PASSWORD || '';

const basicAuth = () =>
  'Basic ' + Buffer.from(`${TRACCAR_EMAIL}:${TRACCAR_PASSWORD}`).toString('base64');

const traccarFetch = async <T>(path: string, params?: Record<string, string>): Promise<T> => {
  const url = new URL(`${TRACCAR_URL}/api${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Traccar API error [${res.status}] ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
};

const traccarPut = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${TRACCAR_URL}/api${path}`, {
    method: 'PUT',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Traccar API error [${res.status}] PUT ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
};

const traccarDelete = async (path: string): Promise<void> => {
  const res = await fetch(`${TRACCAR_URL}/api${path}`, {
    method: 'DELETE',
    headers: { Authorization: basicAuth() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Traccar API error [${res.status}] DELETE ${path}: ${text}`);
  }
};

const traccarPost = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${TRACCAR_URL}/api${path}`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Traccar API error [${res.status}] POST ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
};

// ── Device endpoints ───────────────────────────────────────────────────────────

export const getDevices = (): Promise<TraccarDevice[]> =>
  traccarFetch<TraccarDevice[]>('/devices');

export const getDevice = (id: number): Promise<TraccarDevice> =>
  traccarFetch<TraccarDevice>(`/devices/${id}`);

export interface DevicePayload {
  name: string;
  uniqueId: string;
  status?: string;
  disabled?: boolean;
  lastUpdate?: string | null;
  positionId?: number | null;
  groupId?: number | null;
  phone?: string | null;
  model?: string | null;
  contact?: string | null;
  category?: string | null;
  attributes?: Record<string, unknown>;
}

export const createDevice = (body: DevicePayload): Promise<TraccarDevice> =>
  traccarPost<TraccarDevice>('/devices', body);

export const updateDevice = (id: number, body: DevicePayload): Promise<TraccarDevice> =>
  traccarPut<TraccarDevice>(`/devices/${id}`, { id, ...body });

export const deleteDevice = (id: number): Promise<void> =>
  traccarDelete(`/devices/${id}`);

// ── Position endpoints ─────────────────────────────────────────────────────────

export const getLatestPositions = (deviceIds?: number[]): Promise<TraccarPosition[]> => {
  if (deviceIds && deviceIds.length > 0) {
    const params: Record<string, string> = {};
    deviceIds.forEach((id, i) => (params[`deviceId[${i}]`] = String(id)));
    return traccarFetch<TraccarPosition[]>('/positions', params);
  }
  return traccarFetch<TraccarPosition[]>('/positions');
};

export const getPositionHistory = (
  deviceId: number,
  from: string,
  to: string
): Promise<TraccarPosition[]> =>
  traccarFetch<TraccarPosition[]>('/reports/route', {
    deviceId: String(deviceId),
    from,
    to,
  });

// ── Event endpoints ────────────────────────────────────────────────────────────

export const getTraccarEvents = (params?: { deviceId?: number; from?: string; to?: string; type?: string }): Promise<TraccarEvent[]> => {
  const p: Record<string, string> = {};
  if (params?.deviceId) p.deviceId = String(params.deviceId);
  if (params?.from) p.from = params.from;
  if (params?.to) p.to = params.to;
  if (params?.type) p.type = params.type;
  return traccarFetch<TraccarEvent[]>('/reports/events', Object.keys(p).length ? p : undefined);
};

// ── Driver endpoints ───────────────────────────────────────────────────────────

export const getTraccarDrivers = (): Promise<TraccarDriver[]> =>
  traccarFetch<TraccarDriver[]>('/drivers');

export const createTraccarDriver = (body: { name: string; uniqueId: string; attributes?: Record<string, unknown> }): Promise<TraccarDriver> =>
  traccarPost<TraccarDriver>('/drivers', body);

export const updateTraccarDriver = (id: number, body: { name: string; uniqueId: string; attributes?: Record<string, unknown> }): Promise<TraccarDriver> =>
  traccarPut<TraccarDriver>(`/drivers/${id}`, { id, ...body });

export const deleteTraccarDriver = (id: number): Promise<void> =>
  traccarDelete(`/drivers/${id}`);

// ── Geofence endpoints ─────────────────────────────────────────────────────────

export const getGeofences = (): Promise<TraccarGeofence[]> =>
  traccarFetch<TraccarGeofence[]>('/geofences');

export const createGeofence = (body: { name: string; description?: string; area: string; calendarId?: number; attributes?: Record<string, unknown> }): Promise<TraccarGeofence> =>
  traccarPost<TraccarGeofence>('/geofences', body);

export const updateGeofence = (id: number, body: { name: string; description?: string; area: string; calendarId?: number; attributes?: Record<string, unknown> }): Promise<TraccarGeofence> =>
  traccarPut<TraccarGeofence>(`/geofences/${id}`, { id, ...body });

export const deleteGeofence = (id: number): Promise<void> =>
  traccarDelete(`/geofences/${id}`);

// ── Report endpoints ───────────────────────────────────────────────────────────

export const getTripsReport = (
  deviceId: number,
  from: string,
  to: string
): Promise<TraccarTrip[]> =>
  traccarFetch<TraccarTrip[]>('/reports/trips', {
    deviceId: String(deviceId),
    from,
    to,
  });

export const getStopsReport = (deviceId: number, from: string, to: string) =>
  traccarFetch('/reports/stops', { deviceId: String(deviceId), from, to });

export const getRouteReport = (
  deviceId: number,
  from: string,
  to: string
): Promise<TraccarPosition[]> =>
  traccarFetch<TraccarPosition[]>('/reports/route', {
    deviceId: String(deviceId),
    from,
    to,
  });

export const getSummaryReport = (
  deviceId: number,
  from: string,
  to: string
): Promise<TraccarSummary[]> =>
  traccarFetch<TraccarSummary[]>('/reports/summary', {
    deviceId: String(deviceId),
    from,
    to,
  });

export const getEventsReport = (
  deviceId: number,
  from: string,
  to: string,
  type?: string
): Promise<TraccarEvent[]> => {
  const params: Record<string, string> = { deviceId: String(deviceId), from, to };
  if (type) params['type'] = type;
  return traccarFetch<TraccarEvent[]>('/reports/events', params);
};

// ── Notifications ──────────────────────────────────────────────────────────────

export interface TraccarNotification {
  id?: number;
  type: string;
  notificators: string;
  always?: boolean;
  calendarId?: number;
  attributes?: Record<string, unknown>;
}

export const getNotifications = (): Promise<TraccarNotification[]> =>
  traccarFetch<TraccarNotification[]>('/notifications');

export const createNotification = (body: TraccarNotification): Promise<TraccarNotification> =>
  traccarPost<TraccarNotification>('/notifications', body);

export const deleteNotification = (id: number): Promise<void> =>
  traccarDelete(`/notifications/${id}`);

export const linkNotificationToDevice = (deviceId: number, notificationId: number): Promise<void> =>
  traccarPost<void>('/permissions', { deviceId, notificationId });

export const setDeviceAttribute = async (
  deviceId: number,
  attributes: Record<string, unknown>
): Promise<TraccarDevice> => {
  const device = await getDevice(deviceId);
  const merged = { ...device, attributes: { ...device.attributes, ...attributes } };
  return traccarPut<TraccarDevice>(`/devices/${deviceId}`, merged);
};

// ── Commands ───────────────────────────────────────────────────────────────────

export interface TraccarCommand {
  deviceId: number;
  type: string;
  attributes: Record<string, unknown>;
}

export const sendCommand = (command: TraccarCommand): Promise<TraccarCommand> =>
  traccarPost<TraccarCommand>('/commands/send', command);

export const getCommandTypes = (deviceId: number): Promise<{ type: string }[]> =>
  traccarFetch<{ type: string }[]>('/commands/types', { deviceId: String(deviceId) });

// ── Merge helper: Traccar device + position → app Vehicle type ─────────────────

const knotsToMph = (knots: number): number => Math.round(knots * 1.15078);

// ── Reverse geocoding (Nominatim, no API key required) ─────────────────────────
const geocodeCache = new Map<string, string>();

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  if (!lat && !lng) return 'Unknown location';
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FleetTelematicsApp/1.0' },
    });
    if (!res.ok) return 'Unknown location';
    const data = await res.json() as { display_name?: string };
    const address = data.display_name ?? 'Unknown location';
    geocodeCache.set(key, address);
    return address;
  } catch {
    return 'Unknown location';
  }
};

export const mergeToVehicle = (
  device: TraccarDevice,
  position: TraccarPosition | undefined,
  resolvedAddress?: string,
  driverMap?: Map<string, string>
): Vehicle => {
  const attr = position?.attributes ?? {};

  const rawSpeed = position?.speed ?? 0;
  const speed = knotsToMph(rawSpeed);

  let status: 'online' | 'idle' | 'offline' = 'offline';
  if (device.status === 'online') {
    status = attr.ignition && speed === 0 ? 'idle' : 'online';
  }

  const fuel = Number(attr.fuel ?? attr.fuelLevel ?? 0);
  const odometer = Number(attr.odometer ?? attr.totalDistance ?? 0);
  const totalDistance = Number(attr.totalDistance ?? 0);
  const distance = Number(attr.distance ?? 0);

  return {
    id: device.id,
    deviceId: device.uniqueId,
    protocol: position?.protocol ?? 'unknown',
    name: device.name,
    plateNumber: device.uniqueId,
    driver: (() => {
      const uid = String(position?.attributes?.driverUniqueId ?? '');
      if (uid && driverMap?.has(uid)) return driverMap.get(uid)!;
      return device.contact || 'Unassigned';
    })(),
    status,
    location: {
      lat: position?.latitude ?? 0,
      lng: position?.longitude ?? 0,
      address: resolvedAddress ?? position?.address ?? 'Unknown location',
    },
    speed,
    serverTime: position?.serverTime ?? device.lastUpdate,
    deviceTime: position?.deviceTime ?? device.lastUpdate,
    fixTime: position?.fixTime ?? device.lastUpdate,
    lastUpdate: device.lastUpdate,
    fuelLevel: fuel,
    fuel,
    odometer,
    totalDistance,
    distance,
    outdated: position?.outdated ?? true,
    valid: position?.valid ?? false,
    altitude: position?.altitude ?? 0,
    course: position?.course ?? 0,
    accuracy: position?.accuracy ?? 0,
    network: position?.network,
    tripOdometer: distance,
    fuelConsumption: 0,
    ignition: Boolean(attr.ignition),
    motion: Boolean(attr.motion),
    statusCode: String(attr.statusCode ?? '0'),
    coolantTemp: attr.coolantTemp as number | undefined,
    mapIntake: attr.mapIntake as number | undefined,
    rpm: attr.rpm as number | undefined,
    obdSpeed: attr.obdSpeed ? knotsToMph(attr.obdSpeed as number) : undefined,
    intakeTemp: attr.intakeTemp as number | undefined,
  };
};

export const fetchAllVehicles = async (): Promise<Vehicle[]> => {
  const [devices, positions, traccarDrivers] = await Promise.all([
    getDevices(),
    getLatestPositions(),
    getTraccarDrivers().catch(() => [] as TraccarDriver[]),
  ]);

  // Build uniqueId → name map for dynamic driver lookup
  const driverMap = new Map<string, string>();
  traccarDrivers.forEach((d) => { if (d.uniqueId) driverMap.set(d.uniqueId, d.name); });

  const posMap = new Map<number, TraccarPosition>();
  positions.forEach((p) => posMap.set(p.deviceId, p));

  const vehicles: Vehicle[] = [];
  for (const d of devices) {
    const pos = posMap.get(d.id);
    let address: string | undefined;
    if (pos && pos.latitude && pos.longitude && !pos.address) {
      const cacheKey = `${pos.latitude.toFixed(4)},${pos.longitude.toFixed(4)}`;
      const isCached = geocodeCache.has(cacheKey);
      address = await reverseGeocode(pos.latitude, pos.longitude);
      // Respect Nominatim's 1 req/sec policy — only delay when we made a real HTTP call
      if (!isCached) await new Promise((r) => setTimeout(r, 1100));
    }
    vehicles.push(mergeToVehicle(d, pos, address, driverMap));
  }

  return vehicles;
};
