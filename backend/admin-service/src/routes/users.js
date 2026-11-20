import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { ah, validId } from '../middleware.js';
import { writeLog } from '../audit.js';
import { STAFF_ROLES, getSettings, checkPassword, tempPassword, USERNAME_RE, GENDERS } from '../policy.js';

const router = express.Router();
router.param('id', validId);

// ?role=a&role=b จะได้ array — รับเฉพาะ string กัน SQL พัง
const str = (v) => (typeof v === 'string' ? v : '');

const USER_COLS = `u.id, u.username, u.first_name, u.last_name, u.gender, u.phone_number, u.avatar_url,
  u.role, u.status, u.suspend_reason, u.last_login, u.locked_until, u.created_at`;

const findUser = async (id) => {
  const [rows] = await db.query(`SELECT ${USER_COLS} FROM users u WHERE u.id = ?`, [id]);
  return rows[0];
};

const countActiveAdmins = async () => {
  const [[r]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'");
  return r.n;
};

// GET /users?q=&role=&status=
router.get('/', ah(async (req, res) => {
  const [q, role, status] = [str(req.query.q), str(req.query.role), str(req.query.status)];
  const where = [];
  const vals = [];
  if (role && role !== 'all') { where.push('u.role = ?'); vals.push(role); }
  if (status && status !== 'all') { where.push('u.status = ?'); vals.push(status); }
  if (q) {
    where.push("(u.username LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.phone_number LIKE ?)");
    const k = `%${q}%`;
    vals.push(k, k, k);
  }
  const [rows] = await db.query(
    `SELECT ${USER_COLS} FROM users u ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY u.created_at DESC, u.id DESC`,
    vals
  );
  res.json(rows);
}));

// POST /users — สร้างบัญชีเจ้าหน้าที่
// (บัญชีผู้ป่วยต้องสร้างผ่าน flow ของพยาบาล เพราะต้องมี patient_info คู่กัน)
router.post('/', ah(async (req, res) => {
  const { username, password, first_name, last_name, phone_number, gender, role } = req.body || {};

  if (!username || !password || !first_name || !last_name || !role) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username ใช้ได้เฉพาะ a-z, 0-9, _ และ . (3–50 ตัว)' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: 'บัญชีผู้ป่วยต้องสร้างผ่านหน้า "เพิ่มผู้ป่วยใหม่" ของพยาบาล' });
  }
  if (gender && !GENDERS.includes(gender)) return res.status(400).json({ error: 'เพศไม่ถูกต้อง' });

  const pwErr = checkPassword(password, await getSettings());
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, phone_number, gender, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hash, first_name, last_name, phone_number || null, gender || null, role]
    );
    await writeLog(req, `สร้างบัญชี ${username} (${role})`);
    res.status(201).json(await findUser(r.insertId));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username นี้ถูกใช้แล้ว' });
    throw err;
  }
}));

// PATCH /users/:id/role { role }
router.patch('/:id/role', ah(async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  const target = await findUser(id);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

  if (!STAFF_ROLES.includes(role) || target.role === 'patient') {
    return res.status(400).json({ error: 'เปลี่ยน Role ได้เฉพาะบัญชีเจ้าหน้าที่ (ไม่รวมผู้ป่วย)' });
  }
  if (id === req.admin.id) return res.status(400).json({ error: 'ไม่สามารถเปลี่ยน Role ของตัวเองได้' });
  if (target.role === role) return res.json(target);

  await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  await writeLog(req, `เปลี่ยน Role ${target.username}: ${target.role} → ${role}`, { level: 'warning' });
  res.json(await findUser(id));
}));

// PATCH /users/:id/status { status: 'active' | 'suspended', reason? }
router.patch('/:id/status', ah(async (req, res) => {
  const id = Number(req.params.id);
  const { status, reason } = req.body || {};
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });

  const target = await findUser(id);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  if (id === req.admin.id) return res.status(400).json({ error: 'ไม่สามารถเปลี่ยนสถานะบัญชีของตัวเองได้' });
  if (status === 'suspended' && target.role === 'admin' && (await countActiveAdmins()) <= 1) {
    return res.status(400).json({ error: 'ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 บัญชี' });
  }

  if (status === 'suspended') {
    const why = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 255) : null;
    await db.query("UPDATE users SET status = 'suspended', suspend_reason = ? WHERE id = ?", [why, id]);
    await writeLog(req, `ระงับบัญชี ${target.username}${why ? ` (เหตุผล: ${why})` : ''}`, { level: 'warning' });
  } else {
    await db.query(
      "UPDATE users SET status = 'active', suspend_reason = NULL, failed_attempts = 0, locked_until = NULL WHERE id = ?",
      [id]
    );
    await writeLog(req, `เปิดใช้งานบัญชี ${target.username}`);
  }
  res.json(await findUser(id));
}));

// POST /users/:id/reset-password → คืนรหัสชั่วคราวครั้งเดียว (ไม่เก็บ plain text)
router.post('/:id/reset-password', ah(async (req, res) => {
  const id = Number(req.params.id);
  const target = await findUser(id);
  if (!target) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

  const pw = tempPassword(await getSettings());
  const hash = await bcrypt.hash(pw, 10);
  await db.query('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [hash, id]);
  await writeLog(req, `รีเซ็ตรหัสผ่านของ ${target.username}`, { category: 'security', level: 'warning' });
  res.json({ ok: true, tempPassword: pw });
}));

export default router;
