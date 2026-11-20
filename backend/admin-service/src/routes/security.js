import express from 'express';
import net from 'node:net';
import db from '../db.js';
import { ah } from '../middleware.js';
import { writeLog, clientIp } from '../audit.js';
import { getSettings } from '../policy.js';

const router = express.Router();

const LEVELS = ['info', 'warning', 'danger'];
const CATEGORIES = ['auth', 'account', 'data', 'security', 'system'];

// ---------- audit logs ----------

// GET /security/logs?q=&level=&category=&limit=
router.get('/logs', ah(async (req, res) => {
  const { level, category } = req.query;
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
  const where = [];
  const vals = [];
  if (LEVELS.includes(level)) { where.push('level = ?'); vals.push(level); }
  if (CATEGORIES.includes(category)) { where.push('category = ?'); vals.push(category); }
  if (q) {
    where.push('(actor LIKE ? OR action LIKE ? OR ip LIKE ?)');
    const k = `%${q}%`;
    vals.push(k, k, k);
  }
  const [rows] = await db.query(
    `SELECT id, created_at AS time, actor, action, category, level, ip FROM audit_logs
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`,
    [...vals, limit]
  );
  res.json(rows);
}));

// GET /security/summary — ตัวเลขสรุป + จำนวนแจ้งเตือนสำหรับกระดิ่ง
router.get('/summary', ah(async (_req, res) => {
  const [[r]] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(level = 'danger') AS danger,
           SUM(level = 'warning') AS warning,
           SUM(category = 'auth' AND level <> 'info') AS failedLogin,
           SUM(level = 'danger' AND created_at >= NOW() - INTERVAL 7 DAY) AS danger7d
    FROM audit_logs`);
  const [[locked]] = await db.query('SELECT COUNT(*) AS n FROM users WHERE locked_until > NOW()');
  res.json({
    total: Number(r.total),
    danger: Number(r.danger || 0),
    warning: Number(r.warning || 0),
    failedLogin: Number(r.failedLogin || 0),
    danger7d: Number(r.danger7d || 0),
    lockedAccounts: Number(locked.n),
  });
}));

// ---------- settings ----------

const toClient = (s) => ({
  twoFactor: !!s.two_factor,
  lockAfterFails: !!s.lock_after_fails,
  maxAttempts: s.max_attempts,
  lockMinutes: s.lock_minutes,
  sessionMinutes: s.session_minutes,
  minPasswordLength: s.min_password_length,
  requireSymbol: !!s.require_symbol,
  maskPatientData: !!s.mask_patient_data,
  updatedAt: s.updated_at,
});

router.get('/settings', ah(async (_req, res) => {
  res.json(toClient(await getSettings()));
}));

router.put('/settings', ah(async (req, res) => {
  const b = req.body || {};
  const int = (v, min, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const maxAttempts = int(b.maxAttempts, 3, 10);
  const lockMinutes = int(b.lockMinutes ?? 15, 1, 1440);
  const sessionMinutes = int(b.sessionMinutes, 5, 240);
  const minPasswordLength = int(b.minPasswordLength, 6, 32);
  if (maxAttempts === null || lockMinutes === null || sessionMinutes === null || minPasswordLength === null) {
    return res.status(400).json({
      error: 'ค่าไม่ถูกต้อง: ผิดได้ 3–10 ครั้ง, Session 5–240 นาที, รหัสผ่าน 6–32 ตัว',
    });
  }

  await db.query(
    `UPDATE security_settings SET two_factor = ?, lock_after_fails = ?, max_attempts = ?, lock_minutes = ?,
       session_minutes = ?, min_password_length = ?, require_symbol = ?, mask_patient_data = ?, updated_by = ?
     WHERE id = 1`,
    [!!b.twoFactor, !!b.lockAfterFails, maxAttempts, lockMinutes, sessionMinutes, minPasswordLength,
     !!b.requireSymbol, !!b.maskPatientData, req.admin.id]
  );
  await writeLog(req, 'อัปเดตการตั้งค่าความปลอดภัย', { category: 'security', level: 'warning' });
  res.json(toClient(await getSettings()));
}));

// ---------- blocked IPs ----------

router.get('/blocked-ips', ah(async (_req, res) => {
  const [rows] = await db.query(
    `SELECT b.ip, b.reason, b.created_at, u.username AS blocked_by
     FROM blocked_ips b LEFT JOIN users u ON u.id = b.blocked_by ORDER BY b.created_at DESC`
  );
  res.json(rows);
}));

router.post('/blocked-ips', ah(async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  const reason = String(req.body?.reason || '').trim().slice(0, 255) || null;
  if (!net.isIP(ip)) return res.status(400).json({ error: 'รูปแบบ IP ไม่ถูกต้อง' });
  if (ip === clientIp(req)) return res.status(400).json({ error: 'ไม่สามารถบล็อก IP ที่คุณกำลังใช้อยู่ได้' });
  if (ip === '127.0.0.1' || ip === '::1') return res.status(400).json({ error: 'ไม่สามารถบล็อก localhost ได้' });

  try {
    await db.query('INSERT INTO blocked_ips (ip, reason, blocked_by) VALUES (?, ?, ?)', [ip, reason, req.admin.id]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'IP นี้ถูกบล็อกอยู่แล้ว' });
    throw err;
  }
  await writeLog(req, `บล็อก IP ${ip}${reason ? ` (${reason})` : ''}`, { category: 'security', level: 'warning' });
  res.status(201).json({ ok: true });
}));

router.delete('/blocked-ips/:ip', ah(async (req, res) => {
  const ip = req.params.ip;
  const [r] = await db.query('DELETE FROM blocked_ips WHERE ip = ?', [ip]);
  if (!r.affectedRows) return res.status(404).json({ error: 'ไม่พบ IP นี้' });
  await writeLog(req, `ปลดบล็อก IP ${ip}`, { category: 'security' });
  res.json({ ok: true });
}));

export default router;
