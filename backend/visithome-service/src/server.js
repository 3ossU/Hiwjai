const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());
app.use(cors());

// เชื่อม db
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hiwjai',
    port: process.env.DB_PORT || 3307, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


// ดูตารางเยี่ยมบ้านพร้อมข้อมูลภายใน
app.get('/api/home-visits', async (req, res) => {
    try {

        // ดึงข้อมูลนัดเยี่ยมบ้าน + ชื่อหัวหน้าทีมแพทย์
        const [visits] = await pool.query(`
            SELECT hv.*, CONCAT(u.first_name, ' ', u.last_name) as lead_doctor_name 
            FROM home_visits hv
            LEFT JOIN users u ON hv.lead_doctor_id = u.id
            ORDER BY hv.visit_date DESC, hv.start_time DESC
        `);

        const result = [];

        // ดึงข้อมูลคนไข้ + สถานะการเยี่ยม
        for (let visit of visits) {
            const [patients] = await pool.query(`
                SELECT p.id as patient_id, p.hn, CONCAT(u.first_name, ' ', u.last_name) as patient_name, u.phone_number as phone, p.address, hvp.status as patient_status
                FROM home_visit_patients hvp
                JOIN patient_info p ON hvp.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE hvp.home_visit_id = ?
            `, [visit.id]);

            // ข้อมูลทั้งหมดที่เราจะส่งกลับไปให้ฟ้อนเอน
            result.push({
                ...visit, // ข้อมูลนัดเยี่ยมบ้าน + ชื่อหัวหน้าทีมแพทย์
                patients: patients // ข้อมูลคนไข้ + สถานะการเยี่ยม
            });
        }

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('Error fetching home visits:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// สร้างนัดหมายการเยี่ยมบ้านใหม่
app.post('/api/home-visits', async (req, res) => {
    // ประกาศ pool.getConnection 
    // คล้าย pool.query แต่เพราะเราจะสร้างที effect กับตั้ง 2 table เลยต้องใช้
    const connection = await pool.getConnection(); 
    
    try {
        const { team_name, lead_doctor_id, visit_date, start_time, end_time, patient_ids } = req.body;

        // เช็คข้อมูลพื้นฐานที่ห้ามเป็น null ว่าได้รับมามั้ย ถ้าไม่มีก็ไม่ทำ เชิ่ดใส่เยย
        if (!team_name || !lead_doctor_id || !visit_date || !start_time || !end_time || !patient_ids || !Array.isArray(patient_ids)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields or patient_ids must be an array.' 
            });
        }

        // เริ่มทำ Transaction ซึ่งมันก็คือการที่ทุกคำสั่งที่เราคิวรี่ไป มันจะต้องถูกทั้งหมด db มันถึงจะทำงาน
        await connection.beginTransaction(); 

        // ข้อมูลฝั่งนัดเยี่ยมบ้าน + ชื่อหัวหน้าทีมแพทย์
        // เตรียมคิวรี่ว่าเราจะ insert ข้อมูลไปใน column พวกนี้
        const insertVisitQuery = `
            INSERT INTO home_visits (team_name, lead_doctor_id, visit_date, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, 'planned')
        `;

        // set ลง db จริง ๆ โดยเอาข้อมูลที่รับจากฟ้อนเอนไปแปะใน ? ด้านบน
        const [visitResult] = await connection.query(insertVisitQuery, [
            team_name,
            lead_doctor_id,
            visit_date,
            start_time,
            end_time
        ]);

        // ตัว id (Auto-Increment) ที่พึ่งสร้างใหม่สด ๆ จากตาราง home_visits 
        // เก็บมันไว้ในชื่อ homeVisitId แล้วเอา fk ที่ตาราง home_visit_patients ด้านล่าง
        const homeVisitId = visitResult.insertId;

        // ข้อมูลฝั่งคนไข้ + สถานะการเยี่ยม
        for (const patientId of patient_ids) {
            const insertPatientQuery = `
                INSERT INTO home_visit_patients (home_visit_id, patient_id, status)
                VALUES (?, ?, 'scheduled')
            `;

            // สั่ง db ทำงาน
            await connection.query(insertPatientQuery, [homeVisitId, patientId]);
        }

        // ยืนยันกับระบบ Transaction ว่าให้ save สิ่งที่ db ทำงานไป
        await connection.commit(); 
        connection.release(); // ปิดการทำงาน pool.getConnection 

        res.status(201).json({
            success: true,
            message: 'Home visit created successfully',
            homeVisitId: homeVisitId // ส่ง id ของการนัดหมายใหม่ไปด้วย
        });

    } catch (err) {
        await connection.rollback(); 
        connection.release(); // // ปิดการทำงาน pool.getConnection 
        console.error('Error creating home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// อัพเดตสถานะการนัดเยี่ยม
app.patch('/api/home-visits/:id/patients/:patientId/status', async (req, res) => {
    try {
        const { id, patientId } = req.params; // รับจาก url
        const { status } = req.body;

        // status ที่ส่งมาต้องเป็น 3 ค่านี้เท่านั้น ทะลึ่งเป็นค่าอื่นไม่แก้ให้หรอกจ้า
        if (!['scheduled', 'visited', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status value' });
        }

        // เปลี่ยน status ใน db
        const [result] = await pool.query(`
            UPDATE home_visit_patients 
            SET status = ? 
            WHERE home_visit_id = ? AND patient_id = ?
        `, [status, id, patientId]);

        // ดูว่านัดหมายกันจริงมั้ย ถ้าไม่มีก็ไม่ทำเหมือนกันย่ะ
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Home visit or patient record not found' });
        }

        res.status(200).json({
            success: true,
            message: `Patient ID ${patientId} status updated to '${status}' successfully`
        });

    } catch (err) {
        console.error('Error updating patient status:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// ยกเลิกการนัดเยี่ยมบ้านคนไข้
app.delete('/api/home-visits/:id', async (req, res) => {
    try {
        const { id } = req.params; // ดึง id การนัดหมายมา

        // เอา id ที่รับมาไปหาดูว่ามีใน db มั้ย
        const [existing] = await pool.query('SELECT * FROM home_visits WHERE id = ?', [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Home visit not found' });
        }

        // แก้สถานะการนัดหมายเป็น cancelled ก็คือยกเลิกไป
        await pool.query('UPDATE home_visits SET status = ? WHERE id = ?', ['cancelled', id]);

        res.status(200).json({
            success: true,
            message: `Home visit ID ${id} has been cancelled successfully`
        });

    } catch (err) {
        console.error('Error cancelling home visit:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Visit Home Service is running on port ${PORT}`);
});