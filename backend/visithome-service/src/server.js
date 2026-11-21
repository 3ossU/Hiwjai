const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// เชื่อม db
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hiwjai',
    port: process.env.DB_PORT || 3307
});

// ดึงรายการรอบเยี่ยมบ้านทั้งหมด พร้อมรายชื่อผู้ป่วย
app.get('/api/home-visits', async (req, res) => {
    try {
        // ดึงข้อมูลรอบเยี่ยมบ้าน + ชื่อหัวหน้าทีมแพทย์
        const [visits] = await pool.query(`
            SELECT hv.id, hv.team_name, hv.lead_doctor_id, hv.visit_date, hv.start_time, hv.end_time, hv.status,
                   u.first_name AS doctor_first_name, u.last_name AS doctor_last_name, u.gender AS doctor_gender
            FROM home_visits hv
            LEFT JOIN users u ON hv.lead_doctor_id = u.id
            ORDER BY hv.visit_date ASC, hv.start_time ASC, hv.id ASC
        `);

        // ดึงข้อมูลคนไข้ + สถานะการเยี่ยม
        const [visitPatients] = await pool.query(`
            SELECT hvp.home_visit_id, hvp.patient_id, hvp.status AS patient_status,
                   pi.hn, u.first_name, u.last_name, u.avatar_url
            FROM home_visit_patients hvp
            JOIN patient_info pi ON hvp.patient_id = pi.id
            JOIN users u ON pi.user_id = u.id
        `);

        // ประกอบข้อมูลทั้ง 2 ส่วนเข้าด้วยกัน
        const formatted = visits.map((v) => ({
            ...v, // ข้อมูลนัดเยี่ยมบ้าน + ชื่อหัวหน้าทีมแพทย์
            lead_doctor_name: `${v.doctor_first_name || ''} ${v.doctor_last_name || ''}`.trim(),
            lead_doctor_gender: v.doctor_gender,
            patients: visitPatients
                .filter((p) => p.home_visit_id === v.id)
                .map((p) => ({
                    patient_id: p.patient_id,
                    patient_status: p.patient_status,
                    hn: p.hn,
                    patient_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
                    avatar_url: p.avatar_url
                }))
        }));

        res.json({ success: true, data: formatted });
    } catch (err) {
        console.error('Error fetching home visits:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// สร้างรอบเยี่ยมบ้านใหม่
app.post('/api/home-visits', async (req, res) => {
    // ประกาศ pool.getConnection 
    // คล้าย pool.query แต่เพราะเราจะสร้างที effect กับตั้ง 2 table เลยต้องใช้
    const connection = await pool.getConnection();
    try {
        const { team_name, lead_doctor_id, visit_date, start_time, end_time, patient_ids } = req.body;

        // เช็คข้อมูลพื้นฐานที่ห้ามเป็น null ว่าได้รับมามั้ย ถ้าไม่มีก็ไม่ทำ
        if (!team_name || !lead_doctor_id || !visit_date || !start_time || !end_time || !Array.isArray(patient_ids) || patient_ids.length === 0) {
            connection.release();
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // เช็คว่าหมอมีรอบเยี่ยมบ้านอื่นที่เวลาทับกันไหม
        const [visitConflicts] = await connection.query(
            `SELECT id, team_name FROM home_visits
             WHERE lead_doctor_id = ?
               AND status <> 'cancelled'
               AND start_time < ?
               AND end_time > ?`,
            [lead_doctor_id, end_time, start_time]
        );
        if (visitConflicts.length > 0) {
            connection.release();
            return res.status(409).json({ success: false, error: 'แพทย์มีรอบเยี่ยมบ้านอื่นในช่วงเวลานี้แล้ว' });
        }

        // เช็คว่าหมอมีนัดหมายในตาราง booking ที่เวลาทับกันไหม
        const [bookingConflicts] = await connection.query(
            `SELECT id FROM booking
             WHERE doctor_id = ?
               AND status <> 'cancelled'
               AND start_time < ?
               AND end_time > ?`,
            [lead_doctor_id, end_time, start_time]
        );
        if (bookingConflicts.length > 0) {
            connection.release();
            return res.status(409).json({ success: false, error: 'แพทย์มีตารางนัดหมายผู้ป่วยในช่วงเวลานี้แล้ว' });
        }

        // เริ่มทำ Transaction ซึ่งมันก็คือการที่ทุกคำสั่งที่เราคิวรี่ไป มันจะต้องถูกทั้งหมด db มันถึงจะทำงาน
        await connection.beginTransaction();

        // ข้อมูลฝั่งนัดเยี่ยมบ้าน + ชื่อหัวหน้าทีมแพทย์
        const [result] = await connection.query(
            `INSERT INTO home_visits (team_name, lead_doctor_id, visit_date, start_time, end_time, status)
             VALUES (?, ?, ?, ?, ?, 'planned')`,
            [team_name.trim(), lead_doctor_id, visit_date, start_time, end_time]
        );

        const visitId = result.insertId;

        for (const patientId of patient_ids) {
            await connection.query(
                `INSERT INTO home_visit_patients (home_visit_id, patient_id, status)
                 VALUES (?, ?, 'scheduled')`,
                [visitId, patientId]
            );
        }

        // ยืนยันกับระบบ Transaction ว่าให้ save สิ่งที่ db ทำงานไป
        await connection.commit();
        connection.release();

        res.status(201).json({ success: true, visitId });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error creating home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// แก้ไขรอบเยี่ยมบ้าน (เช่น เปลี่ยนแพทย์หัวหน้าทีม / แก้ชื่อทีม / แก้วันเวลา / รายชื่อผู้ป่วย)
app.put('/api/home-visits/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { team_name, lead_doctor_id, visit_date, start_time, end_time, status, patient_ids } = req.body;

        // เช็คว่ามีรอบเยี่ยมบ้านนี้อยู่จริงไหม
        const [existingRows] = await connection.query(`SELECT * FROM home_visits WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }

        const existing = existingRows[0];
        const nextTeamName = (team_name || existing.team_name).trim();
        const nextDoctorId = lead_doctor_id || existing.lead_doctor_id;
        const nextVisitDate = visit_date || existing.visit_date;
        const nextStartTime = start_time || existing.start_time;
        const nextEndTime = end_time || existing.end_time;
        const nextStatus = status || existing.status;

        // ถ้าไม่ได้ยกเลิก ให้เช็คเวลาทับซ้อนก่อน
        if (nextStatus !== 'cancelled') {
            // เช็คว่าหมอมีรอบเยี่ยมบ้านอื่น (ที่ไม่ใช่รอบนี้) ที่เวลาทับกันไหม
            const [visitConflicts] = await connection.query(
                `SELECT id, team_name FROM home_visits
                 WHERE lead_doctor_id = ?
                   AND id <> ?
                   AND status <> 'cancelled'
                   AND start_time < ?
                   AND end_time > ?`,
                [nextDoctorId, id, nextEndTime, nextStartTime]
            );
            if (visitConflicts.length > 0) {
                connection.release();
                return res.status(409).json({ success: false, error: 'แพทย์มีรอบเยี่ยมบ้านอื่นในช่วงเวลานี้แล้ว' });
            }

            // เช็คว่าหมอมีนัดหมายในตาราง booking ที่เวลาทับกันไหม
            const [bookingConflicts] = await connection.query(
                `SELECT id FROM booking
                 WHERE doctor_id = ?
                   AND status <> 'cancelled'
                   AND start_time < ?
                   AND end_time > ?`,
                [nextDoctorId, nextEndTime, nextStartTime]
            );
            if (bookingConflicts.length > 0) {
                connection.release();
                return res.status(409).json({ success: false, error: 'แพทย์มีตารางนัดหมายผู้ป่วยในช่วงเวลานี้แล้ว' });
            }
        }

        // เริ่มทำ Transaction
        await connection.beginTransaction();

        // อัปเดตข้อมูลหลักของรอบเยี่ยมบ้าน
        await connection.query(
            `UPDATE home_visits
             SET team_name = ?, lead_doctor_id = ?, visit_date = ?, start_time = ?, end_time = ?, status = ?
             WHERE id = ?`,
            [nextTeamName, nextDoctorId, nextVisitDate, nextStartTime, nextEndTime, nextStatus, id]
        );

        // ถ้ามีการส่งรายชื่อผู้ป่วยใหม่มา ให้ล้างของเก่าแล้วใส่ใหม่
        if (Array.isArray(patient_ids) && patient_ids.length > 0) {
            await connection.query(`DELETE FROM home_visit_patients WHERE home_visit_id = ?`, [id]);
            for (const patientId of patient_ids) {
                await connection.query(
                    `INSERT INTO home_visit_patients (home_visit_id, patient_id, status)
                     VALUES (?, ?, 'scheduled')`,
                    [id, patientId]
                );
            }
        }

        // ยืนยันกับระบบ Transaction
        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'อัปเดตรอบเยี่ยมบ้านสำเร็จ' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error updating home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// อัปเดตสถานะทั้งรอบเยี่ยมบ้านเป็นเสร็จสิ้น (completed) และอัปเดตผู้ป่วยที่ยังรอเยี่ยมให้เป็นเยี่ยมแล้ว (visited)
app.patch('/api/home-visits/:id/complete', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        // เช็คว่ามีทริปนี้อยู่จริงไหม
        const [existingRows] = await connection.query(`SELECT id, status FROM home_visits WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            connection.release();
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }

        // ทริปที่ถูกยกเลิกไปแล้ว จะกดเสร็จสิ้นไม่ได้
        if (existingRows[0].status === 'cancelled') {
            connection.release();
            return res.status(400).json({ success: false, error: 'Cannot complete a cancelled home visit' });
        }

        await connection.beginTransaction();

        // อัปเดตสถานะทริปหลัก
        await connection.query(
            `UPDATE home_visits SET status = 'completed' WHERE id = ?`,
            [id]
        );

        // อัปเดตคนไข้ที่ยังรอเยี่ยมให้เป็นเยี่ยมแล้วทั้งหมด
        await connection.query(
            `UPDATE home_visit_patients
             SET status = 'visited'
             WHERE home_visit_id = ? AND status = 'scheduled'`,
            [id]
        );

        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'อัปเดตสถานะทั้งรอบเยี่ยมบ้านสำเร็จ' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error completing home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// อัปเดตสถานะผู้ป่วยรายคนในรอบเยี่ยมบ้าน
app.patch('/api/home-visits/:visitId/patients/:patientId/status', async (req, res) => {
    try {
        const { visitId, patientId } = req.params;
        const { status } = req.body;

        // เปลี่ยน status ใน db
        const [result] = await pool.query(
            `UPDATE home_visit_patients
             SET status = ?
             WHERE home_visit_id = ? AND patient_id = ?`,
            [status, visitId, patientId]
        );

        // ดูว่านัดหมายกันจริงมั้ย ถ้าไม่มีก็ไม่ทำ
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Patient in visit not found' });
        }

        res.json({ success: true, message: 'อัปเดตสถานะผู้ป่วยสำเร็จ' });
    } catch (err) {
        console.error('Error updating patient status:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// ยกเลิกรอบเยี่ยมบ้าน
app.delete('/api/home-visits/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // เปลี่ยนสถานะการนัดหมายเป็น cancelled
        const [result] = await pool.query(
            `UPDATE home_visits SET status = 'cancelled' WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }

        res.json({ success: true, message: 'ยกเลิกรอบเยี่ยมบ้านสำเร็จ' });
    } catch (err) {
        console.error('Error cancelling home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Home Visit Service is running on port ${PORT}`);
});
