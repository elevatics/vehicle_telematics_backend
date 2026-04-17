import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { fetchAllVehicles, getDevice, getLatestPositions, mergeToVehicle, reverseGeocode } from '../services/traccar';

const router = Router();

const now = () => new Date().toISOString();
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const MOCK_VEHICLES = [
  { id: 'v1', deviceId: 1, protocol: 'castel', name: 'Truck Alpha', plateNumber: 'ABC-123', driver: 'John Smith', status: 'online', location: { lat: 40.7580, lng: -73.9855, address: '1234 Broadway, New York, NY' }, speed: 45, serverTime: now(), deviceTime: now(), fixTime: ago(1000), lastUpdate: now(), fuelLevel: 78, odometer: 45230, outdated: false, valid: true, altitude: 150, course: 180, accuracy: 5, tripOdometer: 14838, fuelConsumption: 214070, ignition: true, statusCode: 266760, coolantTemp: 107, rpm: 1378, obdSpeed: 40, fuel: 74, distance: 0, totalDistance: 665.41, motion: true },
  { id: 'v2', deviceId: 2, protocol: 'osmand', name: 'Van Beta', plateNumber: 'DEF-456', driver: 'Sarah Johnson', status: 'idle', location: { lat: 40.7489, lng: -73.9680, address: '500 5th Ave, New York, NY' }, speed: 0, serverTime: ago(300000), deviceTime: ago(300000), fixTime: ago(301000), lastUpdate: ago(300000), fuelLevel: 92, odometer: 32100, outdated: false, valid: true, altitude: 120, course: 90, accuracy: 3, tripOdometer: 8920, fuelConsumption: 156400, ignition: false, statusCode: 125680, rpm: 0, obdSpeed: 0, fuel: 92, distance: 0, totalDistance: 421.50, motion: false },
  { id: 'v3', deviceId: 3, protocol: 'castel', name: 'Truck Gamma', plateNumber: 'GHI-789', driver: 'Mike Davis', status: 'online', location: { lat: 40.7614, lng: -73.9776, address: '200 Central Park W, New York, NY' }, speed: 32, serverTime: now(), deviceTime: now(), fixTime: ago(1000), lastUpdate: now(), fuelLevel: 65, odometer: 67890, outdated: false, valid: true, altitude: 180, course: 270, accuracy: 4, tripOdometer: 12340, fuelConsumption: 298765, ignition: true, statusCode: 223451, coolantTemp: 102, rpm: 1520, obdSpeed: 32, fuel: 65, distance: 0, totalDistance: 892.33, motion: true },
  { id: 'v4', deviceId: 4, protocol: 'tk103', name: 'Van Delta', plateNumber: 'JKL-012', driver: 'Emily Wilson', status: 'offline', location: { lat: 40.7484, lng: -73.9857, address: '350 W 42nd St, New York, NY' }, speed: 0, serverTime: ago(3600000), deviceTime: ago(3600000), fixTime: ago(3601000), lastUpdate: ago(3600000), fuelLevel: 45, odometer: 21450, outdated: true, valid: true, altitude: 95, course: 45, accuracy: 8, tripOdometer: 5430, fuelConsumption: 98320, ignition: false, statusCode: 87654, rpm: 0, obdSpeed: 0, fuel: 45, distance: 0, totalDistance: 298.75, motion: false },
  { id: 'v5', deviceId: 5, protocol: 'gps103', name: 'Truck Epsilon', plateNumber: 'MNO-345', driver: 'Robert Brown', status: 'online', location: { lat: 40.7527, lng: -73.9772, address: '123 Madison Ave, New York, NY' }, speed: 28, serverTime: now(), deviceTime: now(), fixTime: ago(1000), lastUpdate: now(), fuelLevel: 88, odometer: 54321, outdated: false, valid: true, altitude: 165, course: 135, accuracy: 6, tripOdometer: 18920, fuelConsumption: 245600, ignition: true, statusCode: 198760, coolantTemp: 98, rpm: 1234, obdSpeed: 28, fuel: 88, distance: 0, totalDistance: 752.18, motion: true },
  { id: 'v6', deviceId: 6, protocol: 'meitrack', name: 'Van Zeta', plateNumber: 'PQR-678', driver: 'Lisa Anderson', status: 'idle', location: { lat: 40.7549, lng: -73.9840, address: '789 8th Ave, New York, NY' }, speed: 0, serverTime: ago(600000), deviceTime: ago(600000), fixTime: ago(601000), lastUpdate: ago(600000), fuelLevel: 72, odometer: 38900, outdated: false, valid: true, altitude: 140, course: 0, accuracy: 5, tripOdometer: 11250, fuelConsumption: 176540, ignition: false, statusCode: 154320, rpm: 0, obdSpeed: 0, fuel: 72, distance: 0, totalDistance: 534.22, motion: false },
];

// GET /api/vehicles — all devices merged with latest positions
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await fetchAllVehicles();
    res.json(vehicles);
  } catch (err) {
    console.warn('Traccar unavailable, returning mock vehicles:', (err as Error).message);
    res.json(MOCK_VEHICLES);
  }
});

// GET /api/vehicles/:id — single device merged with latest position
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const deviceId = parseInt(req.params.id);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }
  try {
    const [device, positions] = await Promise.all([
      getDevice(deviceId),
      getLatestPositions([deviceId]),
    ]);
    const pos = positions[0];
    let address: string | undefined;
    if (pos && pos.latitude && pos.longitude && !pos.address) {
      address = await reverseGeocode(pos.latitude, pos.longitude);
    }
    const vehicle = mergeToVehicle(device, pos, address);
    res.json(vehicle);
  } catch (err) {
    console.warn('Traccar unavailable for vehicle', deviceId, '- returning mock');
    const mock = MOCK_VEHICLES.find((v) => v.deviceId === deviceId);
    if (mock) { res.json(mock); return; }
    res.status(404).json({ error: 'Vehicle not found' });
  }
});

export default router;
