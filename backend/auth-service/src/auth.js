import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { requireAuth, requireRole } from './middleware.js';

const router = express.Router();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('กรุณาตั้ง JWT_SECRET และ JWT_REFRESH_SECRET ใน .env');
}

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

// กันเดารหัสผ่านคับ
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

// สร้างข้อมูลที่ใส่ใน token และข้อมูล user ที่ส่งกลับ frontend
async function buildSession(u) {
  const payload = { id: u.id, role: u.role };
  const user = {
    id: u.id,
    role: u.role,
    username: u.username,
    name: `${u.first_name} ${u.last_name}`,
  };

  if (u.role === 'patient') {
    const [rows] = await db.query(
      `SELECT id AS patient_id, hn FROM patient_info WHERE user_id = ?`,
      [u.id]
    );
    if (rows[0]) {
      payload.patientId = rows[0].patient_id;
      user.patientId = rows[0].patient_id;
      user.hn = rows[0].hn;
    }
  }
  return { payload, user };
}

const signAccess = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

const signRefresh = (userId) =>
  jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });

// อันนี้ส่วนของ Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
  }

  try {
    const [rows] = await db.query(`SELECT * FROM users WHERE username = ?`, [username]);
    const u = rows[0];

    // เทียบรหัสกับ hash ใน DB ไม่มีรหัสฮาร์ดโค้ดในโค้ด
    const ok = await bcrypt.compare(password, u?.password_hash || DUMMY_HASH);
    if (!u || !ok) {
      return res.status(401).json({ error: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const { payload, user } = await buildSession(u);

    res.json({
      accessToken: signAccess(payload),
      refreshToken: signRefresh(u.id),
      user,
    });
  } catch (error) {
    console.error('Login Error details:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา กรุณาตรวจสอบ Terminal' });
  }
});

// ส่วนของรีเฟรชอยู่ตรงนี้น้าาาา
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'ไม่พบ refresh token' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token ไม่ถูกต้อง' });
    }

    // โหลดข้อมูลล่าสุดจาก DB ถ้า user ถูกลบ จะรีเฟรชไม่ได้
    const [rows] = await db.query(`SELECT * FROM users WHERE id = ?`, [decoded.id]);
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'ไม่พบผู้ใช้' });

    const { payload, user } = await buildSession(u);

    res.json({
      accessToken: signAccess(payload),
      refreshToken: signRefresh(u.id), // ต่ออายุทุกครั้งที่ใช้
      user,
    });
  } catch (error) {
    console.error('Refresh Error:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
  }
});

// ใช้เปลี่ยนรหัสชั่วคราวที่โรงพยาบาลตั้งให้
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'รหัสใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร' });
  }

  try {
    const [rows] = await db.query(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    const u = rows[0];
    const ok = await bcrypt.compare(oldPassword, u?.password_hash || DUMMY_HASH);
    if (!u || !ok) return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, u.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Change password Error:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
  }
});

// สร้างบัญชีผู้ป่วย เฉพาะเจ้าหน้าที่ที่ login แล้ว
// ผู้ป่วยสมัครเองไม่ได้ เจ้าหน้าที่โรงพยาบาลเป็นผู้สร้างให้
router.post('/staff/create-patient', requireAuth, requireRole('admin', 'nurse'), async (req, res) => {
  const {
    username, first_name, last_name, phone_number,
    hn, gender, age, weight, height, blood_group,
    allergies, address, emergency_contact,
  } = req.body || {};

  if (!username || !first_name || !last_name || !hn || !gender || !age || !blood_group) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  // สุ่มรหัสชั่วคราว ส่งกลับครั้งเดียวให้เจ้าหน้าที่แจ้งผู้ป่วย ไม่เก็บ plain text 
  const tempPassword = Math.random().toString(36).slice(2, 6) +
    Math.random().toString(36).slice(2, 6).toUpperCase() + '#7';
  const hash = await bcrypt.hash(tempPassword, 10);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [r] = await conn.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, phone_number, role)
       VALUES (?, ?, ?, ?, ?, 'patient')`,
      [username, hash, first_name, last_name, phone_number || null]
    );

    await conn.query(
      `INSERT INTO patient_info
         (user_id, hn, gender, age, weight, height, blood_group, allergies, address, emergency_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.insertId, hn, gender, age, weight || null, height || null, blood_group,
       allergies || null, address || null, emergency_contact || null]
    );

    await conn.commit();
    res.status(201).json({ ok: true, userId: r.insertId, tempPassword });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username หรือ HN นี้ถูกใช้แล้ว' });
    }
    console.error('Create patient Error:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
  } finally {
    conn.release();
  }
});

export default router;