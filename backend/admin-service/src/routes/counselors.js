import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { ah, validId } from '../middleware.js';
import { writeLog } from '../audit.js';
import { getSettings, checkPassword, USERNAME_RE, GENDERS } from '../policy.js';

const router = express.Router();
router.param('id', validId);

// ผู้ให้คำปรึกษา = users.role 'doctor' + counselor_profiles
// sessions = นัดที่ทำเสร็จแล้ว, upcoming = นัดที่รออยู่ (จากตาราง booking)
const SELECT = `
  SELECT u.id, u.username, u.first_name, u.last_name, u.gender, u.phone_number, u.avatar_url,
         u.status, u.suspend_reason, u.last_login, u.created_at,
         p.specialty, p.license, p.bio,
         (SELECT COUNT(*) FROM booking b WHERE b.doctor_id = u.id AND b.status = 'completed') AS sessions,
         (SELECT COUNT(*) FROM booking b WHERE b.doctor_id = u.id AND b.status = 'scheduled') AS upcoming
  FROM users u
  LEFT JOIN counselor_profiles p ON p.user_id = u.id
  WHERE u.role = 'doctor'`;

const findCounselor = async (id) => {
  const [rows] = await db.query(`${SELECT} AND u.id = ?`, [id]);
  return rows[0];
};

const clean = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

router.get('/', ah(async (_req, res) => {
  const [rows] = await db.query(`${SELECT} ORDER BY u.status ASC, u.first_name`);
  res.json(rows);
}));

router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.username || !b.password || !b.first_name || !b.last_name || !clean(b.license, 50)) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
  }
  if (!USERNAME_RE.test(b.username)) {
    return res.status(400).json({ error: 'Username ใช้ได้เฉพาะ a-z, 0-9, _ และ . (3–50 ตัว)' });
  }
  if (b.gender && !GENDERS.includes(b.gender)) return res.status(400).json({ error: 'เพศไม่ถูกต้อง' });
  const pwErr = checkPassword(b.password, await getSettings());
  if (pwErr) return res.status(400).json({ error: pwErr });

  const hash = await bcrypt.hash(b.password, 10);
  const conn = await db.getConnection();
  let newId;
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, phone_number, gender, avatar_url, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'doctor')`,
      [b.username, hash, b.first_name, b.last_name, clean(b.phone_number, 20), b.gender || null, clean(b.avatar_url, 255)]
    );
    newId = r.insertId;
    await conn.query(
      'INSERT INTO counselor_profiles (user_id, specialty, license, bio) VALUES (?, ?, ?, ?)',
      [newId, clean(b.specialty, 100), clean(b.license, 50), clean(b.bio, 2000)]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username นี้ถูกใช้แล้ว' });
    throw err;
  } finally {
    conn.release();
  }
  await writeLog(req, `เพิ่มผู้ให้คำปรึกษา ${b.username}`);
  res.status(201).json(await findCounselor(newId));
}));

// แก้ไขข้อมูล (username / รหัสผ่าน ไม่แก้ที่นี่ — ใช้ reset-password ของ /users)
router.put('/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const current = await findCounselor(id);
  if (!current) return res.status(404).json({ error: 'ไม่พบผู้ให้คำปรึกษา' });
  if (!b.first_name || !b.last_name || !clean(b.license, 50)) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ' });
  }
  if (b.gender && !GENDERS.includes(b.gender)) return res.status(400).json({ error: 'เพศไม่ถูกต้อง' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE users SET first_name = ?, last_name = ?, phone_number = ?, gender = ?, avatar_url = ? WHERE id = ?',
      [b.first_name, b.last_name, clean(b.phone_number, 20), b.gender || null, clean(b.avatar_url, 255), id]
    );
    await conn.query(
      `INSERT INTO counselor_profiles (user_id, specialty, license, bio) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE specialty = VALUES(specialty), license = VALUES(license), bio = VALUES(bio)`,
      [id, clean(b.specialty, 100), clean(b.license, 50), clean(b.bio, 2000)]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  await writeLog(req, `แก้ไขข้อมูลผู้ให้คำปรึกษา ${current.username}`);
  res.json(await findCounselor(id));
}));

export default router;
