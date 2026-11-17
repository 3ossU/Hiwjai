
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
                message: 'เฉพาะแพทย์เท่านั้น'
            });
        }

        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token ไม่ถูกต้องหรือหมดอายุ'
        });
    }
}


// API ดึงรายการยาจากตาราง medicines
router.get('/medicines', verifyDoctor, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                MedicineId,
                MedicineName,
                Strength,
                DosageForm,
                Unit
             FROM medicines
             WHERE Status = 'active'
             ORDER BY MedicineName ASC`
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Fetch medicines error:', error);

        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลยาได้'
        });
    }
});





// API บันทึกใบสั่งยา
router.post('/', verifyDoctor, async (req, res) => {

    const {
        user_id,
        booking_id,
        DoctorNote,
        Medicines
    } = req.body;

    if (!user_id || !Array.isArray(Medicines)) {
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลใบสั่งยาไม่ครบ'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();

        await connection.beginTransaction();

        // ใช้ ID แพทย์จาก Token
        const doctorId = req.user.id;

        // บันทึกใบสั่งยาหลัก
        const [prescription] = await connection.query(
            `INSERT INTO prescriptions
                (user_id, BookingId, DoctorId, Diagnosis, DoctorNote)
                VALUES (?, ?, ?, ?, ?)`,
            [
                user_id,
                booking_id,
                doctorId,
                null,
                DoctorNote || null
            ]
        );

        const prescriptionId = prescription.insertId;

        // บันทึกรายการยา
        for (const medicine of Medicines) {

            if (!medicine.name || !medicine.dosage ||
                !medicine.frequency || !medicine.duration ||
                !medicine.quantity) {
                throw new Error('กรุณากรอกข้อมูลรายการยาให้ครบ');
            }

            await connection.query(
                `INSERT INTO prescription_items
                    (
                        PrescriptionId,
                        MedicineId,
                        MedicineName,
                        Strength,
                        Dosage,
                        Route,
                        Frequency,
                        Meal,
                        Duration,
                        Quantity,
                        Instructions
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    prescriptionId,
                    medicine.medicineId || null,
                    medicine.name,
                    medicine.strength || null,
                    medicine.dosage,
                    medicine.route || null,
                    medicine.frequency,
                    medicine.meal || null,
                    medicine.duration,
                    Number(medicine.quantity),
                    medicine.instruction || null
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'บันทึกใบสั่งยาสำเร็จ',
            PrescriptionId: prescriptionId
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.error('Prescription Error:', error);

        res.status(500).json({
            success: false,
            message: error.message || 'ไม่สามารถบันทึกใบสั่งยาได้'
        });

    } finally {

        if (connection) {
            connection.release();
        }

    }
});

export default router;
