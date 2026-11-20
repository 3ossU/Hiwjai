require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hiwjai',
  port: Number(process.env.DB_PORT) || 3307,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true,
});

// ตรวจ token
const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'ไม่พบ token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

const patientOnly = (req, res, next) =>
  req.user.role === 'patient'
    ? next()
    : res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' });

const fail = (res, e) => {
  console.error(e);
  res.status(500).json({ success: false, error: 'Server Error' });
};

// users.id ใน token -> patient_info.id
async function getPatientInfoId(userId) {
  const [rows] = await pool.query('SELECT id FROM patient_info WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].id : null;
}

app.get('/health', (_, res) => res.json({ service: 'activity', status: 'ok' }));

// รายการกิจกรรมที่ยังไม่เริ่ม พร้อมจำนวนผู้ลงทะเบียนและสถานะของตัวเอง
app.get('/api/activities', auth, patientOnly, async (req, res) => {
  try {
    const pid = await getPatientInfoId(req.user.id);
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.location, a.start_at, a.capacity,
              (SELECT COUNT(*) FROM activity_registrations r WHERE r.activity_id = a.id) AS registered_count,
              EXISTS(SELECT 1 FROM activity_registrations r
                      WHERE r.activity_id = a.id AND r.patient_id = ?) AS is_registered
         FROM hospital_activities a
        WHERE a.start_at >= NOW()
        ORDER BY a.start_at ASC`,
      [pid || 0]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        registered_count: Number(r.registered_count),
        is_registered: !!r.is_registered,
      })),
    });
  } catch (e) { fail(res, e); }
});

// ลงทะเบียนเข้าร่วม
app.post('/api/activities/:id/register', auth, patientOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const activityId = Number(req.params.id);
    if (!Number.isInteger(activityId) || activityId <= 0)
      return res.status(400).json({ success: false, error: 'id ไม่ถูกต้อง' });

    const pid = await getPatientInfoId(req.user.id);
    if (!pid)
      return res.status(403).json({ success: false, error: 'ไม่พบข้อมูลผู้ป่วย กรุณาติดต่อเคาน์เตอร์โรงพยาบาล' });

    await conn.beginTransaction();

    // ล็อกแถวกิจกรรม กันคนลงทะเบียนพร้อมกันจนเกินจำนวนที่รับ
    const [acts] = await conn.query(
      'SELECT id, capacity, start_at FROM hospital_activities WHERE id = ? FOR UPDATE',
      [activityId]
    );
    if (!acts.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: 'ไม่พบกิจกรรม' });
    }
    if (new Date(String(acts[0].start_at).replace(' ', 'T')) < new Date()) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'กิจกรรมนี้เริ่มไปแล้ว' });
    }

    const [[cnt]] = await conn.query(
      'SELECT COUNT(*) AS n FROM activity_registrations WHERE activity_id = ?',
      [activityId]
    );
    if (cnt.n >= acts[0].capacity) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: 'กิจกรรมนี้เต็มแล้ว' });
    }

    await conn.query(
      'INSERT INTO activity_registrations (activity_id, patient_id) VALUES (?, ?)',
      [activityId, pid]
    );
    await conn.commit();
    res.status(201).json({ success: true, message: 'ลงทะเบียนสำเร็จ' });
  } catch (e) {
    await conn.rollback().catch(() => {});
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ success: false, error: 'คุณลงทะเบียนกิจกรรมนี้แล้ว' });
    fail(res, e);
  } finally {
    conn.release();
  }
});

// ยกเลิกการเข้าร่วม (ก่อนกิจกรรมเริ่มเท่านั้น)
app.delete('/api/activities/:id/register', auth, patientOnly, async (req, res) => {
  try {
    const activityId = Number(req.params.id);
    if (!Number.isInteger(activityId) || activityId <= 0)
      return res.status(400).json({ success: false, error: 'id ไม่ถูกต้อง' });

    const pid = await getPatientInfoId(req.user.id);
    if (!pid) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้ป่วย' });

    const [r] = await pool.query(
      `DELETE r FROM activity_registrations r
         JOIN hospital_activities a ON a.id = r.activity_id
        WHERE r.activity_id = ? AND r.patient_id = ? AND a.start_at >= NOW()`,
      [activityId, pid]
    );
    if (r.affectedRows === 0)
      return res.status(404).json({ success: false, error: 'ไม่พบการลงทะเบียน หรือกิจกรรมเริ่มไปแล้ว' });
    res.json({ success: true, message: 'ยกเลิกแล้ว' });
  } catch (e) { fail(res, e); }
});

app.use((req, res) => res.status(404).json({ success: false, error: 'ไม่พบ endpoint' }));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`activity-service on ${PORT}`));