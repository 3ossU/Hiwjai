import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { requireAuth, requireRole } from './middleware.js';
import { checkPassword, clientIp, getSettings, isBlocked, lockedMinutesLeft, recordFailure, recordSuccess, logEvent } from './security.js';

const router = express.Router();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('กรุณาตั้ง JWT_SECRET และ JWT_REFRESH_SECRET ใน .env');
}

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const RESET_TTL = '10m';

// กันเดารหัสผ่านคับ
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

// สุ่มรหัสชั่วคราวด้วย crypto (ปลอดภัยกว่า Math.random)
const genTempPassword = () => crypto.randomBytes(6).toString('base64url') + '#7';

// จำกัดจำนวนครั้งที่ลองต่อ key (ใน memory พอสำหรับเครื่องเดียว)
const attempts = new Map();
function tooMany(key, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.reset) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}

const digits = (s) => String(s || '').replace(/\D/g, '');

// สร้างข้อมูลที่ใส่ใน token และข้อมูล user ที่ส่งกลับ frontend
async function buildSession(u) {
  const payload = { id: u.id, role: u.role };
  const user = {
    id: u.id,
    role: u.role,
    username: u.username,
    name: `${u.first_name} ${u.last_name}`,
    avatar_url: u.avatar_url
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

// token รีเซ็ตรหัส: ผูกกับ password_hash ปัจจุบัน
// พอเปลี่ยนรหัสแล้ว hash เปลี่ยน token เดิมจะใช้ซ้ำไม่ได้ (ใช้ได้ครั้งเดียว)
const resetSecret = (u) => process.env.JWT_REFRESH_SECRET + u.password_hash;

// อันนี้ส่วนของ Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
  }

  try {
    const ip = clientIp(req);

    // IP ที่ admin บล็อกไว้
    if (await isBlocked(ip)) {
      await logEvent({ actor: username, action: 'ปฏิเสธการเข้าสู่ระบบจาก IP ที่ถูกบล็อก', category: 'security', level: 'danger', ip });
      return res.status(403).json({ error: 'ไม่สามารถเข้าถึงระบบจากเครือข่ายนี้ได้ กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const [rows] = await db.query(`SELECT * FROM users WHERE username = ?`, [username]);
    const u = rows[0];

    // บัญชีถูกล็อกชั่วคราวจากการใส่รหัสผิดซ้ำ
    if (u) {
      const mins = await lockedMinutesLeft(u.id);
      if (mins > 0) {
        await logEvent({ userId: u.id, actor: u.username, action: 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', level: 'warning', ip });
        return res.status(423).json({ error: `บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ในอีก ${mins} นาที` });
      }
    }

    // เทียบรหัสกับ hash ใน DB ไม่มีรหัสฮาร์ดโค้ดในโค้ด
    const ok = await bcrypt.compare(password, u?.password_hash || DUMMY_HASH);
    if (!u || !ok) {
      if (u) {
        const s = await getSettings();
        const { attempts, locked } = await recordFailure(u, s);
        await logEvent({
          userId: u.id,
          actor: u.username,
          action: locked
            ? `เข้าสู่ระบบล้มเหลว ${s.max_attempts} ครั้ง — ล็อกบัญชี ${s.lock_minutes} นาที`
            : `เข้าสู่ระบบล้มเหลว (ครั้งที่ ${attempts})`,
          level: locked ? 'danger' : 'warning',
          ip,
        });
      } else {
        await logEvent({ action: `เข้าสู่ระบบล้มเหลว: ไม่พบ username "${String(username).slice(0, 50)}"`, level: 'warning', ip });
      }
      return res.status(401).json({ error: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // ตรวจหลังรหัสถูกแล้ว เพื่อไม่บอกคนนอกว่าบัญชีนี้มีอยู่จริง
    if (u.status === 'suspended') {
      await logEvent({ userId: u.id, actor: u.username, action: 'บัญชีที่ถูกระงับพยายามเข้าสู่ระบบ', category: 'security', level: 'warning', ip });
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    await recordSuccess(u.id);
    await logEvent({ userId: u.id, actor: u.username, action: 'เข้าสู่ระบบ', ip });

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

    // ถูกระงับ / ถูกบล็อก IP ระหว่างใช้งาน → ไม่ต่ออายุ session
    if (u.status === 'suspended') {
      return res.status(401).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' });
    }
    if (await isBlocked(clientIp(req))) {
      return res.status(401).json({ error: 'ไม่สามารถเข้าถึงระบบจากเครือข่ายนี้ได้' });
    }

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

// ลืมรหัสผ่าน ขั้นที่ 1: ยืนยันตัวตนด้วย Username + HN + เบอร์โทรที่ลงทะเบียนไว้กับโรงพยาบาล
// ถ้าตรงทั้งหมดจะได้ resetToken อายุ 10 นาที (ไม่ต้อง login)
router.post('/forgot-password', async (req, res) => {
  const { username, hn, phone_number } = req.body || {};
  if (!username || !hn || !phone_number) {
    return res.status(400).json({ error: 'กรุณากรอก Username, HN และเบอร์โทรให้ครบ' });
  }

  // จำกัดการเดาข้อมูล ต่อ IP + username
  if (tooMany(`forgot:${req.ip}:${username}`)) {
    return res.status(429).json({ error: 'ลองหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.* FROM users u
         JOIN patient_info p ON p.user_id = u.id
        WHERE u.username = ? AND p.hn = ? AND u.role = 'patient'`,
      [username, hn]
    );
    const u = rows[0];

    // ข้อความเดียวกันทุกกรณี ไม่บอกว่าผิดที่ช่องไหน กันคนเดา username
    if (!u || digits(u.phone_number) !== digits(phone_number)) {
      return res.status(400).json({ error: 'ข้อมูลไม่ตรงกับที่ลงทะเบียนไว้ กรุณาติดต่อเจ้าหน้าที่' });
    }

    const resetToken = jwt.sign({ id: u.id, type: 'reset' }, resetSecret(u), {
      expiresIn: RESET_TTL,
    });
    res.json({ resetToken });
  } catch (error) {
    console.error('Forgot password Error:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
  }
});

// ลืมรหัสผ่าน ขั้นที่ 2: ตั้งรหัสใหม่ด้วย resetToken
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'รหัสใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร' });
  }

  const invalid = () =>
    res.status(400).json({ error: 'ลิงก์รีเซ็ตหมดอายุหรือไม่ถูกต้อง กรุณาเริ่มใหม่' });

  try {
    // อ่าน id จาก token ก่อน (ยังไม่เชื่อ) เพื่อไปเอา hash มาประกอบ secret
    const peek = jwt.decode(resetToken);
    if (!peek?.id) return invalid();

    const [rows] = await db.query(`SELECT * FROM users WHERE id = ?`, [peek.id]);
    const u = rows[0];
    if (!u) return invalid();

    let decoded;
    try {
      decoded = jwt.verify(resetToken, resetSecret(u));
    } catch {
      return invalid();
    }
    if (decoded.type !== 'reset') return invalid();

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, u.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Reset password Error:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
  }
});

// ใช้เปลี่ยนรหัสชั่วคราวที่โรงพยาบาลตั้งให้
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่' });
  }

  try {
    // ใช้นโยบายรหัสผ่านที่ admin ตั้งไว้ (ความยาวขั้นต่ำ / ต้องมีสัญลักษณ์)
    const pwErr = checkPassword(newPassword, await getSettings());
    if (pwErr) return res.status(400).json({ error: pwErr });

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

// เจ้าหน้าที่รีเซ็ตรหัสให้ผู้ป่วย (กรณีผู้ป่วยยืนยันตัวตนเองไม่ได้ เช่น เปลี่ยนเบอร์)
// ส่งรหัสชั่วคราวกลับครั้งเดียว ให้เจ้าหน้าที่แจ้งผู้ป่วย
router.post('/staff/reset-password', requireAuth, requireRole('admin', 'nurse', 'head_nurse'), async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'กรุณาระบุ Username ผู้ป่วย' });

  try {
    const [rows] = await db.query(
      `SELECT id FROM users WHERE username = ? AND role = 'patient'`,
      [username]
    );
    if (!rows[0]) return res.status(404).json({ error: 'ไม่พบผู้ป่วย' });

    const tempPassword = genTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, rows[0].id]);
    res.json({ ok: true, tempPassword });
  } catch (error) {
    console.error('Staff reset Error:', error);
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา' });
  }
});

// สร้างบัญชีผู้ป่วย เฉพาะเจ้าหน้าที่ที่ login แล้ว
// ผู้ป่วยสมัครเองไม่ได้ เจ้าหน้าที่โรงพยาบาลเป็นผู้สร้างให้
router.post('/staff/create-patient', requireAuth, requireRole('admin', 'nurse', 'head_nurse'), async (req, res) => {
  const {
    username, first_name, last_name, phone_number,
    hn, gender, age, weight, height, blood_group,
    allergies, address, emergency_contact, avatar_url
  } = req.body || {};

  if (!username || !first_name || !last_name || !hn || !gender || !age || !blood_group) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  // สุ่มรหัสชั่วคราว ส่งกลับครั้งเดียวให้เจ้าหน้าที่แจ้งผู้ป่วย ไม่เก็บ plain text
  const tempPassword = genTempPassword();
  const hash = await bcrypt.hash(tempPassword, 10);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [r] = await conn.query(
      `INSERT INTO users (username, password_hash, first_name, last_name, phone_number, role, avatar_url)
       VALUES (?, ?, ?, ?, ?, 'patient', ?)`,
      [username, hash, first_name, last_name, phone_number, avatar_url || null]
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