# Fleet Telematics Backend

Node.js + Express + PostgreSQL backend with Traccar GPS integration.

## Stack
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Database**: PostgreSQL 14+
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **GPS Source**: Traccar REST API (proxied server-side)
- **Language**: TypeScript

## Project Structure

```
backend/
├── src/
│   ├── index.ts                  ← Express app + server startup
│   ├── db.ts                     ← PostgreSQL connection pool
│   ├── types/index.ts            ← All TypeScript types
│   ├── middleware/
│   │   └── auth.ts               ← JWT requireAuth + requireRole
│   ├── services/
│   │   └── traccar.ts            ← Traccar API client + Vehicle merger
│   ├── routes/
│   │   ├── auth.ts               ← POST /login, /register, GET /me
│   │   ├── vehicles.ts           ← GET /vehicles (Traccar merged)
│   │   ├── drivers.ts            ← CRUD /drivers
│   │   ├── maintenance.ts        ← CRUD /maintenance
│   │   ├── trips.ts              ← Traccar trip/route/event reports
│   │   ├── finance.ts            ← CRUD /finance
│   │   ├── alerts.ts             ← CRUD /alerts
│   │   ├── geofences.ts          ← Traccar geofences proxy
│   │   └── reports.ts            ← Fleet/vehicle/driver/financial reports
│   └── scripts/
│       └── migrate.ts            ← DB schema runner
└── migrations/
    └── 001_init.sql              ← Full PostgreSQL schema
```

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your DB credentials and Traccar URL
```

### 3. Create the PostgreSQL database
```bash
psql -U postgres -c "CREATE DATABASE fleet_telematics;"
```

### 4. Run migrations
```bash
npm run migrate
```

### 5. Start development server
```bash
npm run dev
```

Server starts on `http://localhost:3001`

## API Endpoints

### Auth
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register new user | — |
| POST | `/api/auth/login` | Login, returns JWT | — |
| GET | `/api/auth/me` | Current user profile | ✅ |
| PATCH | `/api/auth/me` | Update profile | ✅ |
| POST | `/api/auth/change-password` | Change password | ✅ |

### Vehicles (from Traccar)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/vehicles` | All vehicles (device + position merged) | ✅ |
| GET | `/api/vehicles/:id` | Single vehicle | ✅ |

### Drivers
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/drivers` | All drivers (DB + Traccar merged) | ✅ |
| GET | `/api/drivers/:id` | Single driver | ✅ |
| POST | `/api/drivers` | Create driver | fleet_manager, ops |
| PATCH | `/api/drivers/:id` | Update driver | fleet_manager, ops |
| DELETE | `/api/drivers/:id` | Delete driver | fleet_manager |

### Maintenance
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/maintenance` | All orders (filter: status, device_id, priority) | ✅ |
| GET | `/api/maintenance/:id` | Single order | ✅ |
| POST | `/api/maintenance` | Create order | fleet_manager, ops, maintenance |
| PATCH | `/api/maintenance/:id` | Update order | fleet_manager, ops, maintenance |
| DELETE | `/api/maintenance/:id` | Delete order | fleet_manager, ops |
| GET | `/api/maintenance/stats/summary` | Cost + status summary | ✅ |

### Trips (from Traccar)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/trips?deviceId=&from=&to=` | Trip history | ✅ |
| GET | `/api/trips/stops?deviceId=&from=&to=` | Stop history | ✅ |
| GET | `/api/trips/route?deviceId=&from=&to=` | Route positions | ✅ |
| GET | `/api/trips/summary?deviceId=&from=&to=` | Trip summary stats | ✅ |
| GET | `/api/trips/events?deviceId=&from=&to=&type=` | Events/alerts | ✅ |

### Finance
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/finance` | All records (filter: type, device_id, from, to) | fleet_manager, finance |
| GET | `/api/finance/summary` | Totals, by type, monthly | fleet_manager, finance |
| GET | `/api/finance/:id` | Single record | fleet_manager, finance |
| POST | `/api/finance` | Create record | fleet_manager, finance |
| PATCH | `/api/finance/:id` | Update record | fleet_manager, finance |
| DELETE | `/api/finance/:id` | Delete record | fleet_manager, finance |

### Alerts
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/alerts` | All alerts (filter: read, device_id, severity) | ✅ |
| GET | `/api/alerts/unread-count` | Unread count | ✅ |
| POST | `/api/alerts` | Create alert | fleet_manager, ops |
| PATCH | `/api/alerts/:id/read` | Mark single as read | ✅ |
| PATCH | `/api/alerts/read-all` | Mark all as read | ✅ |
| DELETE | `/api/alerts/:id` | Delete alert | fleet_manager, ops |

### Geofences (from Traccar)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/geofences` | All geofences | ✅ |

### Reports
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/reports/fleet?from=&to=` | Fleet-wide summary | ✅ |
| GET | `/api/reports/vehicle?deviceId=&from=&to=` | Per-vehicle report | ✅ |
| GET | `/api/reports/driver?deviceId=&from=&to=` | Driver report | ✅ |
| GET | `/api/reports/financial?from=&to=` | Financial breakdown | fleet_manager, finance |
| GET | `/api/reports/scheduled` | Scheduled reports list | ✅ |
| POST | `/api/reports/scheduled` | Create scheduled report | fleet_manager, ops |
| DELETE | `/api/reports/scheduled/:id` | Delete scheduled report | fleet_manager |

## Health Check
```
GET /health
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `fleet_telematics` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `yourpassword` |
| `DB_SSL` | Use SSL for DB | `false` |
| `JWT_SECRET` | JWT signing secret | `changeme` |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` |
| `TRACCAR_URL` | Traccar server URL | `http://localhost:8082` |
| `TRACCAR_EMAIL` | Traccar admin email | `admin@fleet.com` |
| `TRACCAR_PASSWORD` | Traccar admin password | `yourpassword` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |

## Default Admin Account
After migration, a default admin is created:
- **Email**: `admin@fleettelematics.com`
- **Password**: `Admin1234!`
- **⚠️ Change this immediately in production!**

## Connecting Frontend
Add to the React app's `.env`:
```env
VITE_API_URL=http://localhost:3001
```

Then in `src/services/api.ts` use:
```typescript
const API = import.meta.env.VITE_API_URL;
const token = localStorage.getItem('token');
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
```
