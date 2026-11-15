require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const cfg = require('./config');
const { auth, role } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ['clinic', 'online', 'home'];

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const addMinutes = (hhmm, mins) => {
  const t = toMin(hhmm) + mins;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

// users.id (ใน token) -> patient_info.id (ที่ตาราง booking ใช้)
async function getPatientInfoId(userId) {
  const [rows] = await pool.query('SELECT id FROM patient_info WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].id : null;
}

// หมอลาแบบอนุมัติแล้วในวันนั้นหรือไม่ (อ่านตาราง `leave` ของเพื่อน)
async function doctorOnLeave(db, doctorId, date) {
  const [rows] = await db.query(
    'SELECT 1 FROM `leave` WHERE nurse_id = ? AND status = ? AND ? BETWEEN start_date AND end_date LIMIT 1',
    [doctorId, 'approved', date]
  );
  return rows.length > 0;
}

// ช่วงเวลาที่หมอไม่ว่างในวันนั้น (นัดของพยาบาลและของผู้ป่วยอยู่ตารางเดียวกัน)
async function busyRanges(db, doctorId, date) {
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(start_time, '%H:%i') AS s, DATE_FORMAT(end_time, '%H:%i') AS e
       FROM booking
      WHERE doctor_id = ? AND appointment_date = ? AND status <> ?`,
    [doctorId, date, cfg.STATUS_CANCELLED]
  );
  return rows.map(r => ({ s: toMin(r.s), e: toMin(r.e) }));
}

app.get('/health', (_, res) => res.json({ service: 'patient-booking', status: 'ok' }));

/* ---------- รายชื่อหมอ ---------- */
app.get('/api/doctors', auth, async (_, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE role = ? ORDER BY first_name',
      [cfg.ROLES.doctor]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

/* ---------- ช่วงเวลาว่าง ---------- */
// GET /api/availability?doctor_id=1&date=2026-11-25
app.get('/api/availability', auth, async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    if (!Number.isInteger(Number(doctor_id)) || !date || !DATE_RE.test(date))
      return res.status(400).json({ success: false, error: 'ต้องระบุ doctor_id และ date (YYYY-MM-DD)' });

    const leave = await doctorOnLeave(pool, doctor_id, date);
    const busy = leave ? [] : await busyRanges(pool, doctor_id, date);

    const data = cfg.SLOTS.map(slot => {
      const s = toMin(slot), e = s + cfg.SLOT_MINUTES;
      const clash = busy.some(b => b.s < e && b.e > s);
      return { slot, available: !leave && !clash };
    });
    res.json({ success: true, onLeave: leave, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

/* ---------- ผู้ป่วยจองเอง ---------- */
app.post('/api/patient-bookings', auth, role(cfg.ROLES.patient), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { doctor_id, appointment_type = 'clinic', appointment_date, slot, addon_note } = req.body;

    if (!doctor_id || !appointment_date || !slot)
      return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบ' });
    if (!Number.isInteger(Number(doctor_id)) || !DATE_RE.test(appointment_date))
      return res.status(400).json({ success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    if (!TYPES.includes(appointment_type))
      return res.status(400).json({ success: false, error: 'ประเภทนัดไม่ถูกต้อง' });
    if (!cfg.SLOTS.includes(slot))
      return res.status(400).json({ success: false, error: 'ช่วงเวลาไม่ถูกต้อง' });

    const when = new Date(`${appointment_date}T${slot}:00`);
    if (isNaN(when.getTime()))
      return res.status(400).json({ success: false, error: 'วันที่ไม่ถูกต้อง' });
    if (when < new Date())
      return res.status(400).json({ success: false, error: 'ไม่สามารถจองย้อนหลังได้' });

    const patientInfoId = await getPatientInfoId(req.user.id);
    if (!patientInfoId)
      return res.status(403).json({ success: false, error: 'ไม่พบข้อมูลผู้ป่วย กรุณาติดต่อเคาน์เตอร์โรงพยาบาล' });

    const [doc] = await conn.query(
      'SELECT id FROM users WHERE id = ? AND role = ?', [doctor_id, cfg.ROLES.doctor]);
    if (!doc.length)
      return res.status(404).json({ success: false, error: 'ไม่พบผู้ให้คำปรึกษา' });

    const startDT = `${appointment_date} ${slot}:00`;
    const endDT = `${appointment_date} ${addMinutes(slot, cfg.SLOT_MINUTES)}:00`;

    await conn.beginTransaction();

    // ล็อกแถวหมอ กันหลายคนจองเวลาเดียวกันพร้อมกัน (ตาราง booking ไม่มี unique key)
    await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [doctor_id]);

    if (await doctorOnLeave(conn, doctor_id, appointment_date)) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: 'ผู้ให้คำปรึกษาลาในวันดังกล่าว' });
    }

    // หมอไม่ว่าง (ช่วงเวลาทับกับนัดใด ๆ ที่ยังไม่ยกเลิก)
    const [clash] = await conn.query(
      `SELECT id FROM booking
        WHERE doctor_id = ? AND status <> ? AND start_time < ? AND end_time > ?
        LIMIT 1`,
      [doctor_id, cfg.STATUS_CANCELLED, endDT, startDT]
    );
    if (clash.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: 'ช่วงเวลานี้ถูกจองแล้ว' });
    }

    // ผู้ป่วยคนนี้มีนัดอื่นทับเวลาเดียวกัน
    const [mine] = await conn.query(
      `SELECT id FROM booking
        WHERE patient_id = ? AND status <> ? AND start_time < ? AND end_time > ?
        LIMIT 1`,
      [patientInfoId, cfg.STATUS_CANCELLED, endDT, startDT]
    );
    if (mine.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: 'คุณมีนัดอื่นในช่วงเวลานี้แล้ว' });
    }

    // INSERT แถวใหม่ลงตาราง booking (created_by_nurse_id = NULL หมายถึงผู้ป่วยจองเอง)
    const [r] = await conn.query(
      `INSERT INTO booking
         (patient_id, doctor_id, created_by_nurse_id, appointment_date, start_time, end_time, status, note)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
      [patientInfoId, doctor_id, appointment_date, startDT, endDT, cfg.STATUS_BOOKED, 'ผู้ป่วยจองเอง']
    );

    await conn.query(
      `INSERT INTO patient_booking_meta (booking_id, appointment_type, addon_note, booked_by_user_id)
       VALUES (?, ?, ?, ?)`,
      [r.insertId, appointment_type, String(addon_note || '').slice(0, 1000) || null, req.user.id]
    );

    await conn.commit();
    res.status(201).json({ success: true, message: 'จองสำเร็จ', bookingId: r.insertId });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('Error creating patient booking:', e);
    res.status(500).json({ success: false, error: 'Server Error' });
  } finally {
    conn.release();
  }
});

/* ---------- นัดของฉัน (ทั้งที่จองเองและที่พยาบาลจองให้) ---------- */
app.get('/api/patient-bookings/my', auth, role(cfg.ROLES.patient), async (req, res) => {
  try {
    const patientInfoId = await getPatientInfoId(req.user.id);
    if (!patientInfoId) return res.json({ success: true, data: [] });

    const [rows] = await pool.query(
      `SELECT b.id, b.appointment_date,
              DATE_FORMAT(b.start_time, '%H:%i') AS start_time,
              DATE_FORMAT(b.end_time, '%H:%i') AS end_time,
              b.status, b.note,
              (b.created_by_nurse_id IS NOT NULL) AS booked_by_nurse,
              COALESCE(m.appointment_type, 'clinic') AS appointment_type,
              m.addon_note,
              d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
         FROM booking b
         JOIN users d ON b.doctor_id = d.id
         LEFT JOIN patient_booking_meta m ON m.booking_id = b.id
        WHERE b.patient_id = ?
        ORDER BY b.appointment_date DESC, b.start_time DESC`,
      [patientInfoId]
    );
    res.json({ success: true, data: rows.map(r => ({ ...r, booked_by_nurse: !!r.booked_by_nurse })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

/* ---------- ยกเลิก (เฉพาะนัดที่ผู้ป่วยจองเอง ไม่ยุ่งกับนัดที่พยาบาลจอง) ---------- */
app.patch('/api/patient-bookings/:id/cancel', auth, role(cfg.ROLES.patient), async (req, res) => {
  try {
    const [r] = await pool.query(
      `UPDATE booking b
         JOIN patient_booking_meta m ON m.booking_id = b.id
          SET b.status = ?
        WHERE b.id = ? AND m.booked_by_user_id = ? AND b.status = ?`,
      [cfg.STATUS_CANCELLED, req.params.id, req.user.id, cfg.STATUS_BOOKED]
    );
    if (r.affectedRows === 0)
      return res.status(404).json({ success: false, error: 'ไม่พบนัด หรือยกเลิกไม่ได้' });
    res.json({ success: true, message: 'ยกเลิกนัดแล้ว' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`patient-booking-service on ${PORT}`));