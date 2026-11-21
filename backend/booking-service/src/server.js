const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

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


// กำหนดคำหน้าหมอ
const formatDoctorName = (gender, firstName, lastName) => {
    let title = '';
    if (gender === 'male') title = 'นพ.';
    else if (gender === 'female') title = 'พญ.';
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    return `${title ? `${title} ` : ''}${fullName}`.trim();
};

// ดูตารางนัดหมายทั้งหมด และเลือกดูตามวันที่หรือดูตามหมอได้
app.get('/api/bookings', async (req, res) => {
    try {
        const { date, doctor_id } = req.query; // ดึง id หมอ หรือ วันที่ จากตอนที่ request

        // ดึงข้อมูลการนัดหมายทั้งหมด
        let query = `
            SELECT b.id, b.doctor_id, b.patient_id, b.appointment_date, b.start_time, b.end_time, b.status, b.note,
                   p.hn, u_patient.first_name AS patient_first_name, u_patient.last_name AS patient_last_name,
                   u_doctor.first_name AS doctor_first_name, u_doctor.last_name AS doctor_last_name, u_doctor.gender AS doctor_gender,
                   u_nurse.first_name AS nurse_first_name, u_nurse.last_name AS nurse_last_name
            FROM booking b
            JOIN patient_info p ON b.patient_id = p.id
            JOIN users u_patient ON p.user_id = u_patient.id
            JOIN users u_doctor ON b.doctor_id = u_doctor.id
            LEFT JOIN users u_nurse ON b.created_by_nurse_id = u_nurse.id
        `;
        
        let queryParams = [];
        let conditions = [];

        // เลือกดูเฉพาะวันที่
        if (date) {
            conditions.push(`b.appointment_date = ?`);
            queryParams.push(date);
        }
        // เลือกดูเฉพาะหมอ
        if (doctor_id) {
            conditions.push(`b.doctor_id = ?`);
            queryParams.push(doctor_id);
        }

        // หาตามคอนดิชั่นที่เราเลือก อาจจะวันที่ก็ได้ หมอก็ได้
        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        // เรียงข้อมูลจากน้อยไปมาก ก็คือจากเช้าไปเย็นอะไรงี้
        query += ` ORDER BY b.start_time ASC`;


        // สาดไปสมาชิก สั่ง db ทำงานครับผม
        const [rows] = await pool.query(query, queryParams);

        // ดึงวันลาหมอ
        let leaveQuery = `
            SELECT l.id, l.user_id AS doctor_id, l.leave_type,
                   l.start_date, l.end_date,
                   u.first_name AS doctor_first_name, u.last_name AS doctor_last_name, u.gender AS doctor_gender
            FROM \`leave\` l
            JOIN users u ON l.user_id = u.id
            WHERE l.status = 'approved'
              AND u.role = 'doctor'
        `;
        let leaveParams = [];

        // ถ้าระบุ date มา ให้กรองเฉพาะวันลาที่ทับกับวันนั้น
        if (date) {
            leaveQuery += ` AND ? BETWEEN DATE(l.start_date) AND DATE(l.end_date)`;
            leaveParams.push(date);
        }

        leaveQuery += ` ORDER BY l.start_date ASC`;

        const [doctorLeaves] = await pool.query(leaveQuery, leaveParams);

        // ส่งกลับหน้าบ้านแบบ JSON
        res.json({ 
            success: true, 
            data: rows,
            doctor_leaves: doctorLeaves
        });
    } 
    catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});



// นัดหมายแทนผู้ป่วย
app.post('/api/bookings', async (req, res) => {
    try {
        const { patient_id, doctor_id, created_by_nurse_id, appointment_date, start_time, end_time, note } = req.body; // รับค่ามา

        // เช็คข้อมูลพื้นฐานที่ห้ามเป็น null ว่าได้รับมามั้ย ถ้าไม่มีก็ไม่ทำ เชิ่ดใส่เยย
        if (!patient_id || !doctor_id || !appointment_date || !start_time || !end_time) {
            return res.status(400).json({ success: false, error: 'Missing required booking fields' });
        }

        const normalizedAppointmentDate = String(appointment_date).slice(0, 10);

        // ดึงข้อมูลแพทย์ที่กำลังจะจอง โดยดึง gender เอาไปกำหนดคำหน้าว่าใช้ นพ หรือ พญ
        const [doctorInfoRows] = await pool.query(
            `SELECT first_name, last_name, gender FROM users WHERE id = ? AND role = 'doctor'`,
            [doctor_id]
        );
        if (doctorInfoRows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลแพทย์' });
        }
        const currentDoctor = doctorInfoRows[0];
        const currentDoctorName = formatDoctorName(currentDoctor.gender, currentDoctor.first_name, currentDoctor.last_name);

        // เช็คว่าหมอมีวันลาที่อนุมัติแล้วตรงกับวันที่นัดหมายไหม
        const [doctorLeaveConflicts] = await pool.query(
            `SELECT l.id, l.leave_type, l.start_date, l.end_date
             FROM \`leave\` l
             WHERE l.user_id = ?
               AND l.status = 'approved'
               AND ? BETWEEN DATE_FORMAT(l.start_date, '%Y-%m-%d') AND DATE_FORMAT(l.end_date, '%Y-%m-%d')`,
            [doctor_id, normalizedAppointmentDate]
        );
        console.log('DEBUG DOCTOR LEAVE:', { doctor_id, normalizedAppointmentDate, conflicts: doctorLeaveConflicts });
        if (doctorLeaveConflicts.length > 0) {
            return res.status(409).json({ success: false, error: `${currentDoctorName} มีวันลาตรงกับวันที่นัดหมาย` });
        }

        // เช็คว่าหมอมีนัดหมายในตาราง booking ที่เวลาทับกันไหม
        const [bookingConflicts] = await pool.query(
            `SELECT id FROM booking
             WHERE doctor_id = ?
               AND status <> 'cancelled'
               AND start_time < ?
               AND end_time > ?`,
            [doctor_id, end_time, start_time]
        );
        if (bookingConflicts.length > 0) {
            return res.status(409).json({ success: false, error: `${currentDoctorName} มีตารางนัดหมายอื่นในช่วงเวลานี้แล้ว` });
        }

        // เช็คว่าคนไข้มีนัดหมายซ้อนกับหมอคนอื่นไหม
        const [patientConflicts] = await pool.query(
            `SELECT b.id, b.doctor_id, u_doctor.first_name AS doctor_first_name, u_doctor.last_name AS doctor_last_name, u_doctor.gender AS doctor_gender,
                    b.start_time, b.end_time
             FROM booking b
             JOIN users u_doctor ON b.doctor_id = u_doctor.id
             WHERE b.patient_id = ?
               AND b.status <> 'cancelled'
               AND b.start_time < ?
               AND b.end_time > ?`,
            [patient_id, end_time, start_time]
        );
        if (patientConflicts.length > 0) {
            const conflictDoctor = patientConflicts[0];
            const conflictDoctorName = formatDoctorName(conflictDoctor.doctor_gender, conflictDoctor.doctor_first_name, conflictDoctor.doctor_last_name);
            return res.status(409).json({ 
                success: false, 
                error: `ผู้ป่วยมีนัดหมายซ้อนกับ ${conflictDoctorName} ในช่วงเวลานี้แล้ว` 
            });
        }

        // เช็คว่าหมอมีตารางออกเยี่ยมบ้านใน home_visits ที่วันเวลาทับกันไหม
        const [visitConflicts] = await pool.query(
            `SELECT id, team_name FROM home_visits
             WHERE lead_doctor_id = ?
               AND status <> 'cancelled'
               AND start_time < ?
               AND end_time > ?`,
            [doctor_id, end_time, start_time]
        );
        if (visitConflicts.length > 0) {
            return res.status(409).json({ success: false, error: `${currentDoctorName} ติดตารางเยี่ยมบ้านในช่วงเวลานี้แล้ว` });
        }

        // เตรียมคิวรี่ว่าเราจะ insert ข้อมูลไปใน column พวกนี้
        const query = `
            INSERT INTO booking (patient_id, doctor_id, created_by_nurse_id, appointment_date, start_time, end_time, status, note)
            VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `;
        
        // set ลง db จริง ๆ โดยเอาข้อมูลที่รับจากฟ้อนเอนไปแปะใน ? ด้านบน
        const [result] = await pool.query(query, [
            patient_id, 
            doctor_id, 
            created_by_nurse_id || null, 
            appointment_date, 
            start_time, 
            end_time, 
            note || null
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Booking created successfully',
            bookingId: result.insertId // ส่ง booking id ไปให้หน้าบ้านด้วย
        });
    } 
    catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});



// cancelled นัดหมาย 
app.patch('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params; // รับ id การนัดหมายมา

        // เปลี่ยน status เป็น cancelled ของ booking id อันนั้น
        const query = `UPDATE booking SET status = 'cancelled' WHERE id = ?`;
        // สั่ง db ทำงาน
        const [result] = await pool.query(query, [id]);

        // ถ้าไม่มี booking id อันนั้นก็ตีเก๊ไม่ทำแม่ง
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        res.json({ 
            success: true, 
            message: 'Booking cancelled successfully' 
        });
    } 
    catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// ดึงรายชื่อหมอทั้งหมดเพื่อไปใส่ในตารางนัดหมาย
app.get('/api/doctors', async (req, res) => {
    try {
        const query = `
            SELECT id, first_name, last_name , gender
            FROM users 
            WHERE role = 'doctor'
            ORDER BY first_name ASC
        `;
        const [rows] = await pool.query(query);
        
        res.json({ 
            success: true, 
            data: rows 
        });
    } 
    catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Booking Service is running on port ${PORT}`);
});