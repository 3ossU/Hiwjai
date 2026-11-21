import express from 'express';
import db from '../db.js';
import { validId, ah } from '../middleware.js';

const router = express.Router();

router.param('id', validId);

// 1. ดึงรายการกิจกรรมทั้งหมด พร้อมจำนวนผู้ลงทะเบียน
router.get(
  '/',
  ah(async (_req, res) => {
    const [rows] = await db.query(`
      SELECT 
        ha.id,
        ha.title,
        ha.description,
        ha.location,
        ha.start_at,
        ha.capacity,
        COUNT(ar.id) AS registered_count
      FROM hospital_activities ha
      LEFT JOIN activity_registrations ar ON ha.id = ar.activity_id
      GROUP BY ha.id
      ORDER BY ha.start_at DESC
    `);
    res.json(rows);
  })
);

// 2. ดูรายชื่อผู้ป่วยที่ลงทะเบียนกิจกรรมนั้นๆ
router.get(
  '/:id/registrations',
  ah(async (req, res) => {
    const [rows] = await db.query(
      `SELECT 
        ar.id,
        ar.created_at AS registered_at,
        pi.hn,
        u.first_name,
        u.last_name,
        u.phone_number
      FROM activity_registrations ar
      JOIN patient_info pi ON ar.patient_id = pi.id
      JOIN users u ON pi.user_id = u.id
      WHERE ar.activity_id = ?
      ORDER BY ar.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  })
);

// 3. แอดมินเพิ่มกิจกรรมใหม่
router.post(
  '/',
  ah(async (req, res) => {
    const { title, description, location, start_at, capacity } = req.body;

    if (!title || !String(title).trim() || !start_at) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อกิจกรรมและวันเวลาที่จัด' });
    }

    const cap = capacity !== undefined ? Number(capacity) : 30;
    if (!Number.isInteger(cap) || cap < 1) {
      return res.status(400).json({ error: 'จำนวนที่รับต้องเป็นตัวเลขมากกว่า 0' });
    }

    const [result] = await db.query(
      `INSERT INTO hospital_activities (title, description, location, start_at, capacity)
       VALUES (?, ?, ?, ?, ?)`,
      [String(title).trim(), description || null, location || null, start_at, cap]
    );

    res.status(201).json({
      message: 'เพิ่มกิจกรรมเรียบร้อยแล้ว',
      id: result.insertId,
    });
  })
);

// 4. แก้ไขข้อมูลกิจกรรม
router.put(
  '/:id',
  ah(async (req, res) => {
    const { title, description, location, start_at, capacity } = req.body;

    if (!title || !String(title).trim() || !start_at) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อกิจกรรมและวันเวลาที่จัด' });
    }

    const cap = capacity !== undefined ? Number(capacity) : 30;
    if (!Number.isInteger(cap) || cap < 1) {
      return res.status(400).json({ error: 'จำนวนที่รับต้องเป็นตัวเลขมากกว่า 0' });
    }

    const [result] = await db.query(
      `UPDATE hospital_activities 
       SET title = ?, description = ?, location = ?, start_at = ?, capacity = ?
       WHERE id = ?`,
      [String(title).trim(), description || null, location || null, start_at, cap, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการแก้ไข' });
    }

    res.json({ message: 'อัปเดตข้อมูลกิจกรรมเรียบร้อยแล้ว' });
  })
);

// 5. ลบกิจกรรม
router.delete(
  '/:id',
  ah(async (req, res) => {
    await db.query('DELETE FROM activity_registrations WHERE activity_id = ?', [req.params.id]);
    const [result] = await db.query('DELETE FROM hospital_activities WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบกิจกรรมที่ต้องการลบ' });
    }

    res.json({ message: 'ลบกิจกรรมเรียบร้อยแล้ว' });
  })
);

export default router;