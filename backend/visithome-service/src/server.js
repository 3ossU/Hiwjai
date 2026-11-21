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

// กำหนดคำหน้าหมอ (เหมือนฝั่ง booking) ใช้ใน error message ให้อ่านง่าย
const formatDoctorName = (gender, firstName, lastName) => {
    let title = '';
    if (gender === 'male') title = 'นพ.';
    else if (gender === 'female') title = 'พญ.';
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    return `${title ? `${title} ` : ''}${fullName}`.trim();
};

// whitelist สถานะของผู้ป่วยในรอบเยี่ยมบ้าน กันคนส่งค่ามั่วลง db
const ALLOWED_PATIENT_STATUSES = ['scheduled', 'visited', 'missed', 'cancelled'];

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
            lead_doctor_display_name: formatDoctorName(v.doctor_gender, v.doctor_first_name, v.doctor_last_name), // เผื่อ frontend อยากได้แบบมีคำนำหน้า
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
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // เช็คว่าเวลาเริ่มต้องน้อยกว่าเวลาจบ
        if (String(start_time) >= String(end_time)) {
            return res.status(400).json({ success: false, error: 'เวลาเริ่มต้องน้อยกว่าเวลาจบ' });
        }

        // ลบ patient_ids ที่ซ้ำออก เพื่อลดภาระ db และกัน insert ซ้ำ
        const uniquePatientIds = Array.from(new Set(patient_ids));

        // ดึงข้อมูลแพทย์หัวหน้าทีม เพื่อเอาไปใส่ใน error message ให้อ่านง่าย
        const [doctorInfoRows] = await connection.query(
            `SELECT first_name, last_name, gender FROM users WHERE id = ? AND role = 'doctor'`,
            [lead_doctor_id]
        );
        if (doctorInfoRows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลแพทย์' });
        }
        const currentDoctor = doctorInfoRows[0];
        const currentDoctorName = formatDoctorName(currentDoctor.gender, currentDoctor.first_name, currentDoctor.last_name);

        // เช็คว่าหมอมีวันลาที่อนุมัติแล้วตรงกับวันที่ออกเยี่ยมบ้านไหม
        const [doctorLeaveConflicts] = await connection.query(
            `SELECT l.id, l.leave_type, l.start_date, l.end_date
             FROM \`leave\` l
             WHERE l.user_id = ?
               AND l.status = 'approved'
               AND ? BETWEEN DATE_FORMAT(l.start_date, '%Y-%m-%d') AND DATE_FORMAT(l.end_date, '%Y-%m-%d')`,
            [lead_doctor_id, String(visit_date).slice(0, 10)]
        );
        if (doctorLeaveConflicts.length > 0) {
            return res.status(409).json({ success: false, error: `${currentDoctorName} มีวันลาตรงกับวันที่ออกเยี่ยมบ้าน` });
        }

        // เช็คว่าหมอมีรอบเยี่ยมบ้านอื่นที่เวลาทับกันไหม
        const [visitConflicts] = await connection.query(
            `SELECT id, team_name FROM home_visits
             WHERE lead_doctor_id = ?
               AND status <> 'cancelled'
               AND visit_date = ?
               AND start_time < ?
               AND end_time > ?`,
            [lead_doctor_id, visit_date, end_time, start_time]
        );
        if (visitConflicts.length > 0) {
            return res.status(409).json({ success: false, error: `${currentDoctorName} มีรอบเยี่ยมบ้านอื่นในช่วงเวลานี้แล้ว` });
        }

        // เช็คว่าหมอมีนัดหมายในตาราง booking ที่เวลาทับกันไหม
        const [bookingConflicts] = await connection.query(
            `SELECT id FROM booking
             WHERE doctor_id = ?
               AND status <> 'cancelled'
               AND appointment_date = ?
               AND start_time < ?
               AND end_time > ?`,
            [lead_doctor_id, visit_date, end_time, start_time]
        );
        if (bookingConflicts.length > 0) {
            return res.status(409).json({ success: false, error: `${currentDoctorName} มีตารางนัดหมายผู้ป่วยในช่วงเวลานี้แล้ว` });
        }

        // เช็คฝั่งคนไข้ว่ามีรอบเยี่ยมบ้านอื่นที่เวลาทับกันไหม
        const [patientVisitConflicts] = await connection.query(
            `SELECT hvp.patient_id, hv.id AS home_visit_id, hv.team_name,
                    hv.visit_date, hv.start_time, hv.end_time,
                    u.first_name AS patient_first_name, u.last_name AS patient_last_name, pi.hn
             FROM home_visit_patients hvp
             JOIN home_visits hv ON hvp.home_visit_id = hv.id
             JOIN patient_info pi ON hvp.patient_id = pi.id
             JOIN users u ON pi.user_id = u.id
             WHERE hvp.patient_id IN (?)
               AND hv.status <> 'cancelled'
               AND hv.visit_date = ?
               AND hv.start_time < ?
               AND hv.end_time > ?`,
            [uniquePatientIds, visit_date, end_time, start_time]
        );
        if (patientVisitConflicts.length > 0) {
            const c = patientVisitConflicts[0];
            const patientName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.trim();
            return res.status(409).json({
                success: false,
                error: `ผู้ป่วย ${patientName} (HN: ${c.hn}) มีรอบเยี่ยมบ้านอื่น (ทีม ${c.team_name}) ในช่วงเวลานี้แล้ว`
            });
        }

        // เช็คฝั่งคนไข้ว่ามีนัดหมายที่เวลาทับกันไหม
        const [patientBookingConflicts] = await connection.query(
            `SELECT b.patient_id, b.id AS booking_id,
                    b.appointment_date, b.start_time, b.end_time,
                    u_doctor.first_name AS doctor_first_name,
                    u_doctor.last_name AS doctor_last_name,
                    u_doctor.gender AS doctor_gender,
                    u_patient.first_name AS patient_first_name,
                    u_patient.last_name AS patient_last_name,
                    pi.hn
             FROM booking b
             JOIN patient_info pi ON b.patient_id = pi.id
             JOIN users u_patient ON pi.user_id = u_patient.id
             JOIN users u_doctor ON b.doctor_id = u_doctor.id
             WHERE b.patient_id IN (?)
               AND b.status <> 'cancelled'
               AND b.appointment_date = ?
               AND b.start_time < ?
               AND b.end_time > ?`,
            [uniquePatientIds, visit_date, end_time, start_time]
        );
        if (patientBookingConflicts.length > 0) {
            const c = patientBookingConflicts[0];
            const patientName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.trim();
            const conflictDoctorName = formatDoctorName(c.doctor_gender, c.doctor_first_name, c.doctor_last_name);
            return res.status(409).json({
                success: false,
                error: `ผู้ป่วย ${patientName} (HN: ${c.hn}) มีนัดหมายกับ ${conflictDoctorName} ในช่วงเวลานี้แล้ว`
            });
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

        // ข้อมูลฝั่งคนไข้ + สถานะการเยี่ยม
        for (const patientId of uniquePatientIds) {
            await connection.query(
                `INSERT INTO home_visit_patients (home_visit_id, patient_id, status)
                 VALUES (?, ?, 'scheduled')`,
                [visitId, patientId]
            );
        }

        // ยืนยันกับระบบ Transaction ว่าให้ save สิ่งที่ db ทำงานไป
        await connection.commit();

        res.status(201).json({ success: true, visitId });
    } catch (err) {
        // ถ้ามีอะไรพัง ให้ rollback กลับ (ถ้ายังไม่ begin จะ rollback ก็ไม่เป็นไร)
        try { await connection.rollback(); } catch (_) { /* ignore */ }
        console.error('Error creating home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    } finally {
        // คืน connection กลับ pool เสมอ ไม่ว่าจะสำเร็จหรือ error
        connection.release();
    }
});

// แก้ไขรอบเยี่ยมบ้าน
app.put('/api/home-visits/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { team_name, lead_doctor_id, visit_date, start_time, end_time, status, patient_ids } = req.body;

        // เช็คว่ามีรอบเยี่ยมบ้านนี้อยู่จริงไหม
        const [existingRows] = await connection.query(`SELECT * FROM home_visits WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }

        const existing = existingRows[0];
        // ใช้ ?? เพื่อให้ค่า 0 หรือ '' ที่ส่งมาถูกใช้จริง
        const nextTeamName = (team_name ?? existing.team_name).trim();
        const nextDoctorId = lead_doctor_id ?? existing.lead_doctor_id;
        const nextVisitDate = visit_date ?? existing.visit_date;
        const nextStartTime = start_time ?? existing.start_time;
        const nextEndTime = end_time ?? existing.end_time;
        const nextStatus = status ?? existing.status;

        // ถ้าไม่ได้ยกเลิก ให้เช็คเวลาทับซ้อนก่อน
        if (nextStatus !== 'cancelled') {
            // เช็คว่าเวลาเริ่มต้องน้อยกว่าเวลาจบ
            if (String(nextStartTime) >= String(nextEndTime)) {
                return res.status(400).json({ success: false, error: 'เวลาเริ่มต้องน้อยกว่าเวลาจบ' });
            }

            // ดึงข้อมูลแพทย์หัวหน้าทีม (คนใหม่) เพื่อเอาไปใส่ใน error message
            const [doctorInfoRows] = await connection.query(
                `SELECT first_name, last_name, gender FROM users WHERE id = ? AND role = 'doctor'`,
                [nextDoctorId]
            );
            if (doctorInfoRows.length === 0) {
                return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลแพทย์' });
            }
            const currentDoctor = doctorInfoRows[0];
            const currentDoctorName = formatDoctorName(currentDoctor.gender, currentDoctor.first_name, currentDoctor.last_name);

            // เช็คว่าหมอมีวันลาที่อนุมัติแล้วตรงกับวันที่ออกเยี่ยมบ้านไหม
            const [doctorLeaveConflicts] = await connection.query(
                `SELECT l.id, l.leave_type, l.start_date, l.end_date
                 FROM \`leave\` l
                 WHERE l.user_id = ?
                   AND l.status = 'approved'
                   AND ? BETWEEN DATE_FORMAT(l.start_date, '%Y-%m-%d') AND DATE_FORMAT(l.end_date, '%Y-%m-%d')`,
                [nextDoctorId, String(nextVisitDate).slice(0, 10)]
            );
            if (doctorLeaveConflicts.length > 0) {
                return res.status(409).json({ success: false, error: `${currentDoctorName} มีวันลาตรงกับวันที่ออกเยี่ยมบ้าน` });
            }

            // เช็คว่าหมอมีรอบเยี่ยมบ้านอื่นที่เวลาทับกันไหม
            const [visitConflicts] = await connection.query(
                `SELECT id, team_name FROM home_visits
                 WHERE lead_doctor_id = ?
                   AND id <> ?
                   AND status <> 'cancelled'
                   AND visit_date = ?
                   AND start_time < ?
                   AND end_time > ?`,
                [nextDoctorId, id, nextVisitDate, nextEndTime, nextStartTime]
            );
            if (visitConflicts.length > 0) {
                return res.status(409).json({ success: false, error: `${currentDoctorName} มีรอบเยี่ยมบ้านอื่นในช่วงเวลานี้แล้ว` });
            }

            // เช็คว่าหมอมีนัดหมายในตาราง booking ที่เวลาทับกันไหม (เพิ่มกรอง appointment_date)
            const [bookingConflicts] = await connection.query(
                `SELECT id FROM booking
                 WHERE doctor_id = ?
                   AND status <> 'cancelled'
                   AND appointment_date = ?
                   AND start_time < ?
                   AND end_time > ?`,
                [nextDoctorId, nextVisitDate, nextEndTime, nextStartTime]
            );
            if (bookingConflicts.length > 0) {
                return res.status(409).json({ success: false, error: `${currentDoctorName} มีตารางนัดหมายผู้ป่วยในช่วงเวลานี้แล้ว` });
            }

            // เช็คฝั่งคนไข้
            if (Array.isArray(patient_ids) && patient_ids.length > 0) {
                const uniquePatientIds = Array.from(new Set(patient_ids));

                // คนไข้มีรอบเยี่ยมบ้านอื่นทับไหม
                const [patientVisitConflicts] = await connection.query(
                    `SELECT hvp.patient_id, hv.id AS home_visit_id, hv.team_name,
                            hv.visit_date, hv.start_time, hv.end_time,
                            u.first_name AS patient_first_name, u.last_name AS patient_last_name, pi.hn
                     FROM home_visit_patients hvp
                     JOIN home_visits hv ON hvp.home_visit_id = hv.id
                     JOIN patient_info pi ON hvp.patient_id = pi.id
                     JOIN users u ON pi.user_id = u.id
                     WHERE hvp.patient_id IN (?)
                       AND hv.status <> 'cancelled'
                       AND hv.id <> ?
                       AND hv.visit_date = ?
                       AND hv.start_time < ?
                       AND hv.end_time > ?`,
                    [uniquePatientIds, id, nextVisitDate, nextEndTime, nextStartTime]
                );
                if (patientVisitConflicts.length > 0) {
                    const c = patientVisitConflicts[0];
                    const patientName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.trim();
                    return res.status(409).json({
                        success: false,
                        error: `ผู้ป่วย ${patientName} (HN: ${c.hn}) มีรอบเยี่ยมบ้านอื่น (ทีม ${c.team_name}) ในช่วงเวลานี้แล้ว`
                    });
                }

                // คนไข้มีนัดหมายทับไหม
                const [patientBookingConflicts] = await connection.query(
                    `SELECT b.patient_id, b.id AS booking_id,
                            b.appointment_date, b.start_time, b.end_time,
                            u_doctor.first_name AS doctor_first_name,
                            u_doctor.last_name AS doctor_last_name,
                            u_doctor.gender AS doctor_gender,
                            u_patient.first_name AS patient_first_name,
                            u_patient.last_name AS patient_last_name,
                            pi.hn
                     FROM booking b
                     JOIN patient_info pi ON b.patient_id = pi.id
                     JOIN users u_patient ON pi.user_id = u_patient.id
                     JOIN users u_doctor ON b.doctor_id = u_doctor.id
                     WHERE b.patient_id IN (?)
                       AND b.status <> 'cancelled'
                       AND b.appointment_date = ?
                       AND b.start_time < ?
                       AND b.end_time > ?`,
                    [uniquePatientIds, nextVisitDate, nextEndTime, nextStartTime]
                );
                if (patientBookingConflicts.length > 0) {
                    const c = patientBookingConflicts[0];
                    const patientName = `${c.patient_first_name || ''} ${c.patient_last_name || ''}`.trim();
                    const conflictDoctorName = formatDoctorName(c.doctor_gender, c.doctor_first_name, c.doctor_last_name);
                    return res.status(409).json({
                        success: false,
                        error: `ผู้ป่วย ${patientName} (HN: ${c.hn}) มีนัดหมายกับ ${conflictDoctorName} ในช่วงเวลานี้แล้ว`
                    });
                }
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
            const uniquePatientIds = Array.from(new Set(patient_ids));
            await connection.query(`DELETE FROM home_visit_patients WHERE home_visit_id = ?`, [id]);
            for (const patientId of uniquePatientIds) {
                await connection.query(
                    `INSERT INTO home_visit_patients (home_visit_id, patient_id, status)
                     VALUES (?, ?, 'scheduled')`,
                    [id, patientId]
                );
            }
        }

        // ยืนยันกับระบบ Transaction
        await connection.commit();

        res.json({ success: true, message: 'อัปเดตรอบเยี่ยมบ้านสำเร็จ' });
    } catch (err) {
        try { await connection.rollback(); } catch (_) { /* ignore */ }
        console.error('Error updating home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    } finally {
        connection.release();
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
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }

        // ทริปที่ถูกยกเลิกไปแล้ว จะกดเสร็จสิ้นไม่ได้
        if (existingRows[0].status === 'cancelled') {
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

        res.json({ success: true, message: 'อัปเดตสถานะทั้งรอบเยี่ยมบ้านสำเร็จ' });
    } catch (err) {
        try { await connection.rollback(); } catch (_) { /* ignore */ }
        console.error('Error completing home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    } finally {
        connection.release();
    }
});

// อัปเดตสถานะผู้ป่วยรายคนในรอบเยี่ยมบ้าน
app.patch('/api/home-visits/:visitId/patients/:patientId/status', async (req, res) => {
    try {
        const { visitId, patientId } = req.params;
        const { status } = req.body;

        // เช็คว่า status ที่ส่งมาอยู่ใน whitelist ไหม กันคนส่งค่ามั่วลง db
        if (!ALLOWED_PATIENT_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

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

// ยกเลิกรอบเยี่ยมบ้าน (soft cancel — ใช้ PATCH ตาม semantic ที่ถูกต้อง)
app.patch('/api/home-visits/:id/cancel', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        // เช็คว่ามีทริปนี้อยู่จริงไหม
        const [existingRows] = await connection.query(`SELECT id, status FROM home_visits WHERE id = ?`, [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }
        if (existingRows[0].status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Home visit is already cancelled' });
        }

        await connection.beginTransaction();

        // เปลี่ยนสถานะการนัดหมายเป็น cancelled
        await connection.query(
            `UPDATE home_visits SET status = 'cancelled' WHERE id = ?`,
            [id]
        );

        // อัปเดตคนไข้ที่ยังไม่ถูกเยี่ยมให้เป็น cancelled ด้วย
        await connection.query(
            `UPDATE home_visit_patients
             SET status = 'cancelled'
             WHERE home_visit_id = ? AND status = 'scheduled'`,
            [id]
        );

        await connection.commit();

        res.json({ success: true, message: 'ยกเลิกรอบเยี่ยมบ้านสำเร็จ' });
    } catch (err) {
        try { await connection.rollback(); } catch (_) { /* ignore */ }
        console.error('Error cancelling home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    } finally {
        connection.release();
    }
});

// คง DELETE ไว้เพื่อ backward compatibility
app.delete('/api/home-visits/:id', async (req, res) => {
    // redirect ไปใช้ logic cancel เดียวกัน
    req.url = `/api/home-visits/${req.params.id}/cancel`;
    return app._router.handle(req, res);
});

app.listen(PORT, () => {
    console.log(`Home Visit Service is running on port ${PORT}`);
});
