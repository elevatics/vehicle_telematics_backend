import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const TRACCAR_URL = process.env.TRACCAR_URL!;
const TRACCAR_EMAIL = process.env.TRACCAR_EMAIL!;
const TRACCAR_PASSWORD = process.env.TRACCAR_PASSWORD!;
const auth = 'Basic ' + Buffer.from(`${TRACCAR_EMAIL}:${TRACCAR_PASSWORD}`).toString('base64');

const devices = [
  { name: 'Truck Alpha',   uniqueId: 'ABC-123' },
  { name: 'Van Beta',      uniqueId: 'DEF-456' },
  { name: 'Truck Gamma',   uniqueId: 'GHI-789' },
  { name: 'Van Delta',     uniqueId: 'JKL-012' },
  { name: 'Truck Epsilon', uniqueId: 'MNO-345' },
  { name: 'Van Zeta',      uniqueId: 'PQR-678' },
];

const run = async () => {
  console.log(`📡 Connecting to Traccar: ${TRACCAR_URL}`);
  for (const d of devices) {
    const res = await fetch(`${TRACCAR_URL}/api/devices`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    });
    if (res.ok) {
      const data = await res.json() as { id: number; name: string };
      console.log(`✅ Created device: ${data.name} (id=${data.id})`);
    } else {
      const text = await res.text();
      console.error(`❌ Failed to create ${d.name}: ${res.status} ${text.slice(0, 120)}`);
    }
  }
  console.log('\n🎉 Done! Devices are registered on demo.traccar.org');
  console.log('ℹ️  Note: positions will show as unknown until GPS data is sent to the tracker.');
};

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
