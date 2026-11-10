import express from 'express';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { sign } from './auth.js';

const app = express();
app.use(express.json());

const GENDERS = ['male', 'female', 'other'];
const BLOODS = ['A', 'B', 'AB', 'O'];

const session = (u, patientId, hn) => ({
  token: sign({ id: u.id, role: 'patient', patientId }),
  user: { id: u.id, patientId, hn, username: u.username, name: `${u.first_name} ${u.last_name}` }
});

app.post('/api/auth/register', async (req, res) => {
  const b = req.body || {};
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(b.username || '')) return res.status(400).json({ error: 'Username ต้องเป็น a-z, 0-9, _ ยาว 3-50 ตัว' });
  if ((b.password || '').length < 6) return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  if (!b.first_name?.trim() || !b.last_name?.trim()) return res.status(400).json({ error: 'กรุณากรอกชื่อและนามสกุล' });
  if (!GENDERS.includes(b.gender)) return res.status(400).json({ error: 'เพศไม่ถูกต้อง' });
  if (!Number.isInteger(b.age) || b.age < 0 || b.age > 120) return res.status(400).json({ error: 'อายุไม่ถูกต้อง' });
  if (!BLOODS.includes(b.blood_group)) return res.status(400).json({ error: 'หมู่เลือดไม่ถูกต้อง' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [dup] = await conn.query('SELECT id FROM users WHERE username=?', [b.username]);
    if (dup.length) { await conn.rollback(); return res.status(409).json({ error: 'Username นี้ถูกใช้แล้ว' }); }
    const hash = await bcrypt.hash(b.password, 10);
    const [u] = await conn.query(
      "INSERT INTO users (username,password_hash,first_name,last_name,phone_number,role) VALUES (?,?,?,?,?,'patient')",
      [b.username, hash, b.first_name.trim(), b.last_name.trim(), b.phone_number || null]);
    const hn = 'HN' + String(u.insertId).padStart(6, '0');
    const [p] = await conn.query(
      'INSERT INTO patient_info (user_id,hn,gender,age,blood_group,allergies) VALUES (?,?,?,?,?,?)',
      [u.insertId, hn, b.gender, b.age, b.blood_group, b.allergies || null]);
    await conn.commit();
    res.status(201).json(session({ id: u.insertId, username: b.username, first_name: b.first_name.trim(), last_name: b.last_name.trim() }, p.insertId, hn));
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username นี้ถูกใช้แล้ว' });
    throw e;
  } finally { conn.release(); }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const [rows] = await db.query(
    "SELECT u.*, p.id AS patient_id, p.hn FROM users u JOIN patient_info p ON p.user_id=u.id WHERE u.username=? AND u.role='patient'",
    [username || '']);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return res.status(401).json({ error: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
  res.json(session(u, u.patient_id, u.hn));
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'เซิร์ฟเวอร์ผิดพลาด' }); });
app.listen(process.env.PORT || 3001, () => console.log('auth-service :3001'));