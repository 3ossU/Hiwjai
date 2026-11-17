require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { ROLES, VIEWERS, WRITERS } = require('./config');
const { auth, role } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const isId = v => Number.isInteger(Number(v)) && Number(v) > 0;
const bad = (res, msg) => res.status(400).json({ success: false, error: msg });
const fail = (res, e) => {
  console.error(e);
  res.status(500).json({ success: false, error: 'Server Error' });
};

// users.id ใน token patient_info.id
async function getPatientInfoId(userId) {
  const [rows] = await pool.query('SELECT id FROM patient_info WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].id : null;
}

// ตัวช่วยแปลงข้อมูล
// DATETIME รับ YYYY-MM-DD HH:mm[:ss] หรือ YYYY-MM-DDTHH:mm[:ss] (ไม่ถูกต้อง null)
const dt = v => {
  if (!v) return null;
  const s = String(v).replace('T', ' ').slice(0, 19);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) return null;
  return s.length === 16 ? `${s}:00` : s;
};
// DATE รับ YYYY-MM-DD ไม่ถูกต้อง null
const dOnly = v => {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const cleanRx = v =>
  (Array.isArray(v) ? v : [])
    .filter(p => p && String(p.name || '').trim())
    .map(p => ({
      name: String(p.name).trim().slice(0, 100),
      dose: String(p.dose || '').slice(0, 100),
      duration: String(p.duration || '').slice(0, 100),
    }));
const parseRx = v => {
  if (v == null) return [];
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
  return v; // mysql2 แปลงคอลัมน์ JSON เป็น object ให้แล้ว
};
const shape = r => ({ ...r, prescription: parseRx(r.prescription) });

const FIELDS = `
  r.id, r.patient_id, r.doctor_id, r.booking_id, r.visit_date, r.chief_complaint,
  r.diagnosis, r.treatment_note, r.prescription, r.follow_up_date,
  d.first_name AS doctor_first_name, d.last_name AS doctor_last_name`;

app.get('/health', (_, res) => res.json({ service: 'record', status: 'ok' }));

// ผู้ป่วย 

// ประวัติการรักษาของตัวเอง
app.get('/api/records/my', auth, role(ROLES.patient), async (req, res) => {
  try {
    const pid = await getPatientInfoId(req.user.id);
    if (!pid) return res.json({ success: true, data: [] });
    const [rows] = await pool.query(
      `SELECT ${FIELDS} FROM medical_records r
         JOIN users d ON d.id = r.doctor_id
        WHERE r.patient_id = ? ORDER BY r.visit_date DESC`, [pid]);
    res.json({ success: true, data: rows.map(shape) });
  } catch (e) { fail(res, e); }
});

// รายละเอียดรายการเดียว เฉพาะของตัวเอง
app.get('/api/records/my/:id', auth, role(ROLES.patient), async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 'id ไม่ถูกต้อง');
    const pid = await getPatientInfoId(req.user.id);
    if (!pid) return res.status(404).json({ success: false, error: 'ไม่พบประวัติ' });
    const [rows] = await pool.query(
      `SELECT ${FIELDS} FROM medical_records r
         JOIN users d ON d.id = r.doctor_id
        WHERE r.id = ? AND r.patient_id = ?`, [req.params.id, pid]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'ไม่พบประวัติ' });
    res.json({ success: true, data: shape(rows[0]) });
  } catch (e) { fail(res, e); }
});

// บุคลากร 

// ค้นหาผู้ป่วย HN หรือชื่อ
app.get('/api/patients', auth, role(...VIEWERS), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 50);
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT pi.id, pi.hn, u.first_name, u.last_name
         FROM patient_info pi JOIN users u ON u.id = pi.user_id
        WHERE (? = '' OR pi.hn LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)
        ORDER BY pi.hn LIMIT 50`,
      [q, like, like, like]);
    res.json({ success: true, data: rows });
  } catch (e) { fail(res, e); }
});

// ประวัติของผู้ป่วยรายคน patientId = patient_info.id
app.get('/api/records/patient/:patientId', auth, role(...VIEWERS), async (req, res) => {
  try {
    if (!isId(req.params.patientId)) return bad(res, 'id ไม่ถูกต้อง');
    const [rows] = await pool.query(
      `SELECT ${FIELDS} FROM medical_records r
         JOIN users d ON d.id = r.doctor_id
        WHERE r.patient_id = ? ORDER BY r.visit_date DESC`, [req.params.patientId]);
    res.json({ success: true, data: rows.map(shape) });
  } catch (e) { fail(res, e); }
});

// สร้างประวัติ หมอ / admin
app.post('/api/records', auth, role(...WRITERS), async (req, res) => {
  try {
    const b = req.body || {};
    if (!isId(b.patient_id)) return bad(res, 'ต้องระบุ patient_id');

    const doctorId = req.user.role === ROLES.doctor ? req.user.id : b.doctor_id;
    if (!isId(doctorId)) return bad(res, 'ต้องระบุ doctor_id');

    if (!b.chief_complaint && !b.diagnosis && !b.treatment_note)
      return bad(res, 'กรุณากรอกอาการ การวินิจฉัย หรือบันทึกการรักษาอย่างน้อย 1 ช่อง');

    const visitDate = b.visit_date ? dt(b.visit_date) : null;
    if (b.visit_date && !visitDate) return bad(res, 'รูปแบบ visit_date ไม่ถูกต้อง');
    const followUp = b.follow_up_date ? dOnly(b.follow_up_date) : null;
    if (b.follow_up_date && !followUp) return bad(res, 'รูปแบบ follow_up_date ไม่ถูกต้อง');

    const [p] = await pool.query('SELECT id FROM patient_info WHERE id = ?', [b.patient_id]);
    if (!p.length) return res.status(404).json({ success: false, error: 'ไม่พบผู้ป่วย' });

    const [d] = await pool.query('SELECT id FROM users WHERE id = ? AND role = ?', [doctorId, ROLES.doctor]);
    if (!d.length) return res.status(404).json({ success: false, error: 'ไม่พบแพทย์' });

    let bookingId = null;
    if (isId(b.booking_id)) {
      const [bk] = await pool.query('SELECT id FROM booking WHERE id = ? AND patient_id = ?', [b.booking_id, b.patient_id]);
      if (!bk.length) return res.status(404).json({ success: false, error: 'ไม่พบการจองของผู้ป่วยรายนี้' });
      bookingId = bk[0].id;
    }

    const [r] = await pool.query(
      `INSERT INTO medical_records
         (patient_id, doctor_id, booking_id, visit_date, chief_complaint, diagnosis,
          treatment_note, prescription, follow_up_date)
       VALUES (?, ?, ?, COALESCE(?, NOW()), ?, ?, ?, ?, ?)`,
      [b.patient_id, doctorId, bookingId, visitDate,
      b.chief_complaint || null, b.diagnosis || null, b.treatment_note || null,
      JSON.stringify(cleanRx(b.prescription)), followUp]
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) { fail(res, e); }
});

// แก้ไข หมอแก้ได้เฉพาะรายการที่ตัวเองเขียน, admin แก้ได้ทั้งหมด
app.put('/api/records/:id', auth, role(...WRITERS), async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 'id ไม่ถูกต้อง');
    const b = req.body || {};
    const sets = [], vals = [];
    const add = (col, v) => { sets.push(`${col} = ?`); vals.push(v); };

    if ('visit_date' in b && b.visit_date) {
      const v = dt(b.visit_date);
      if (!v) return bad(res, 'รูปแบบ visit_date ไม่ถูกต้อง');
      add('visit_date', v);
    }
    if ('chief_complaint' in b) add('chief_complaint', b.chief_complaint || null);
    if ('diagnosis' in b) add('diagnosis', b.diagnosis || null);
    if ('treatment_note' in b) add('treatment_note', b.treatment_note || null);
    if ('prescription' in b) add('prescription', JSON.stringify(cleanRx(b.prescription)));
    if ('follow_up_date' in b) {
      const f = b.follow_up_date ? dOnly(b.follow_up_date) : null;
      if (b.follow_up_date && !f) return bad(res, 'รูปแบบ follow_up_date ไม่ถูกต้อง');
      add('follow_up_date', f);
    }
    if (!sets.length) return bad(res, 'ไม่มีข้อมูลที่จะแก้ไข');

    let where = 'WHERE id = ?';
    vals.push(req.params.id);
    if (req.user.role === ROLES.doctor) { where += ' AND doctor_id = ?'; vals.push(req.user.id); }

    const [r] = await pool.query(`UPDATE medical_records SET ${sets.join(', ')} ${where}`, vals);
    if (r.affectedRows === 0)
      return res.status(404).json({ success: false, error: 'ไม่พบประวัติ หรือไม่มีสิทธิ์แก้ไข' });
    res.json({ success: true, message: 'แก้ไขแล้ว' });
  } catch (e) { fail(res, e); }
});

// ลบ admin เท่านั้น
app.delete('/api/records/:id', auth, role(ROLES.admin), async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 'id ไม่ถูกต้อง');
    const [r] = await pool.query('DELETE FROM medical_records WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ success: false, error: 'ไม่พบประวัติ' });
    res.json({ success: true, message: 'ลบแล้ว' });
  } catch (e) { fail(res, e); }
});

// 404 และ error handler 
app.use((req, res) => res.status(404).json({ success: false, error: 'ไม่พบ endpoint' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return bad(res, 'JSON ไม่ถูกต้อง');
  fail(res, err);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`record-service on ${PORT}`));