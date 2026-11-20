import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { requireAuth, requireAdmin } from './middleware.js';
import usersRoutes from './routes/users.js';
import counselorsRoutes from './routes/counselors.js';
import reportsRoutes from './routes/reports.js';
import securityRoutes from './routes/security.js';

if (!process.env.JWT_SECRET) {
  throw new Error('กรุณาตั้ง JWT_SECRET ใน .env (ต้องตรงกับ auth-service)');
}

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'admin-service' }));

// ทุก route ใต้ /api/admin ต้องเป็น admin ที่ยัง active
const admin = express.Router();
admin.use(requireAuth, requireAdmin);
admin.use('/users', usersRoutes);
admin.use('/counselors', counselorsRoutes);
admin.use('/reports', reportsRoutes);
admin.use('/security', securityRoutes);
app.use('/api/admin', admin);

app.use((_req, res) => res.status(404).json({ error: 'ไม่พบ endpoint' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[admin-service]', err);
  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({ error: 'ฐานข้อมูลยังไม่ได้อัปเดต กรุณารัน database/admin_migration.sql' });
  }
  res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
});

app.listen(PORT, () => {
  console.log(`Admin Service is running on port ${PORT}`);
});
