
import express from 'express';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const router = express.Router();

// ตรวจสอบ Token และสิทธิ์แพทย์
function verifyDoctor(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบ'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your_super_secret_key'
        );

        if (decoded.role !== 'doctor') {
            return res.status(403).json({
                success: false,
                message: 'เฉพาะแพทย์เท่านั้นที่สามารถดูข้อมูลนี้ได้'
            });
        }

        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
        });
    }
}

// ดึงข้อมูลนัดหมายเฉพาะแพทย์ที่เข้าสู่ระบบ
router.get('/', verifyDoctor, async (req, res) => {
    try {
        const { date } = req.query;

        // ใช้ ID จาก Token เท่านั้น
        const doctorId = req.user.id;

        let query = `
            SELECT
                b.id AS booking_id,

                -- รหัสคนไข้จากตาราง patient_info
                b.patient_id AS patient_id,

                -- รหัสผู้ใช้จากตาราง users
                p.user_id AS user_id,

                b.appointment_date,
                b.start_time,
                b.end_time,
                b.status,
                b.note,

                p.hn,

                u_patient.first_name AS patient_first_name,
                u_patient.last_name AS patient_last_name,

                u_doctor.first_name AS doctor_first_name,
                u_doctor.last_name AS doctor_last_name,

                u_nurse.first_name AS nurse_first_name,
                u_nurse.last_name AS nurse_last_name

            FROM booking b

            JOIN patient_info p
                ON b.patient_id = p.id

            JOIN users u_patient
                ON p.user_id = u_patient.id

            JOIN users u_doctor
                ON b.doctor_id = u_doctor.id

            LEFT JOIN users u_nurse
                ON b.created_by_nurse_id = u_nurse.id

            WHERE b.doctor_id = ?
        `;

        const params = [doctorId];

        // กรองวันที่
        if (date) {
            query += ' AND b.appointment_date = ?';
            params.push(date);
        }

        query += ' ORDER BY b.appointment_date ASC, b.start_time ASC';

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            doctor: {
                id: req.user.id,
                role: req.user.role
            },
            data: rows
        });

    } catch (error) {
        console.error('Error fetching appointments:', error);

        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลนัดหมายได้'
        });
    }
});

export default router;
