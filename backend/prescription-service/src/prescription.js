
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


// ======================================
// API ดึงรายการยาจากตาราง medicines
// ======================================
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


// ======================================
// API บันทึกประวัติการรักษา
// + ใบสั่งยา
// + สร้างนัดหมายติดตาม
// ======================================
router.post('/', verifyDoctor, async (req, res) => {

    const {
        user_id,
        booking_id,
        DoctorNote,
        Medicines,
        visit_date,
        chief_complaint,
        diagnosis,
        treatment_note,
        follow_up_date,
        follow_up_start_time,
        follow_up_end_time
    } = req.body;

    // ตรวจสอบข้อมูลผู้ป่วยและรายการยา
    if (!user_id || !Array.isArray(Medicines)) {
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลผู้ป่วยหรือรายการยาไม่ถูกต้อง'
        });
    }

    // ต้องกรอกข้อมูลการรักษาอย่างน้อย 1 ช่อง
    if (
        !chief_complaint?.trim() &&
        !diagnosis?.trim() &&
        !treatment_note?.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: 'กรุณากรอกอาการ การวินิจฉัย หรือรายละเอียดการรักษาอย่างน้อย 1 ช่อง'
        });
    }

    // ตรวจสอบวันและเวลานัด
    if (follow_up_date) {

        if (!follow_up_start_time || !follow_up_end_time) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุเวลาเริ่มนัดและเวลาสิ้นสุดนัด'
            });
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(follow_up_date) ||
            !/^\d{2}:\d{2}$/.test(follow_up_start_time) ||
            !/^\d{2}:\d{2}$/.test(follow_up_end_time)
        ) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบวันหรือเวลานัดไม่ถูกต้อง'
            });
        }

        const dateParts = follow_up_date.split('-').map(Number);

        const year = dateParts[0];
        const month = dateParts[1];
        const day = dateParts[2];

        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            dateParts.length !== 3 ||
            !Number.isFinite(year) ||
            !Number.isFinite(month) ||
            !Number.isFinite(day) ||
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return res.status(400).json({
                success: false,
                message: 'วันที่นัดไม่ถูกต้อง'
            });
        }

        if (follow_up_start_time >= follow_up_end_time) {
            return res.status(400).json({
                success: false,
                message: 'เวลาสิ้นสุดนัดต้องมากกว่าเวลาเริ่มนัด'
            });
        }

    } else if (follow_up_start_time || follow_up_end_time) {
        return res.status(400).json({
            success: false,
            message: 'กรุณาระบุวันนัดติดตามด้วย'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();

        await connection.beginTransaction();

        const doctorId = req.user.id;

        // 1. ค้นหา patient_info.id จาก users.id
        const [patients] = await connection.query(
            `SELECT id
             FROM patient_info
             WHERE user_id = ?`,
            [user_id]
        );

        if (patients.length === 0) {
            throw new Error('ไม่พบข้อมูลผู้ป่วย');
        }

        const patientId = patients[0].id;

        // ใช้ booking เดิม หากมีการส่งมา
        let bookingId = booking_id || null;

        // ======================================
        // 2. สร้างนัดหมายติดตามในตาราง booking
        // ======================================
        if (follow_up_date) {

            const appointmentNote = [
                'นัดติดตามอาการ',
                diagnosis ? `การวินิจฉัย: ${diagnosis}` : '',
                chief_complaint ? `อาการ: ${chief_complaint}` : ''
            ].filter(Boolean).join(' | ');

            const [booking] = await connection.query(
                `INSERT INTO booking
                    (
                        patient_id,
                        doctor_id,
                        created_by_nurse_id,
                        appointment_date,
                        start_time,
                        end_time,
                        status,
                        note
                    )
                 VALUES (
                    ?, ?,
                    NULL,
                    ?,
                    CONCAT(?, ' ', ?),
                    CONCAT(?, ' ', ?),
                    'scheduled',
                    ?
                 )`,
                [
                    patientId,
                    doctorId,
                    follow_up_date,
                    follow_up_date,
                    follow_up_start_time,
                    follow_up_date,
                    follow_up_end_time,
                    appointmentNote
                ]
            );

            // เก็บ ID นัดหมายที่เพิ่งสร้าง
            bookingId = booking.insertId;
        }

        // ======================================
        // 3. เตรียมรายการยาเพื่อบันทึกประวัติ
        // ======================================
        const medicineHistory = Medicines.map(medicine => ({
            name: medicine.name,
            dose: [
                medicine.dosage,
                medicine.frequency,
                medicine.meal
            ].filter(Boolean).join(' / '),
            duration: medicine.duration
        }));

        // ======================================
        // 4. บันทึกประวัติการรักษา
        // ======================================
        const [record] = await connection.query(
            `INSERT INTO medical_records
                (
                    patient_id,
                    doctor_id,
                    booking_id,
                    visit_date,
                    chief_complaint,
                    diagnosis,
                    treatment_note,
                    prescription,
                    follow_up_date
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                doctorId,
                bookingId,
                visit_date || new Date(),
                chief_complaint || null,
                diagnosis || null,
                treatment_note || null,
                JSON.stringify(medicineHistory),
                follow_up_date || null
            ]
        );

        const medicalRecordId = record.insertId;

        // ======================================
        // 5. บันทึกใบสั่งยา
        // ======================================
        const [prescription] = await connection.query(
            `INSERT INTO prescriptions
                (
                    user_id,
                    BookingId,
                    DoctorId,
                    Diagnosis,
                    DoctorNote,
                    medical_record_id
                )
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                bookingId,
                doctorId,
                diagnosis || null,
                DoctorNote || null,
                medicalRecordId
            ]
        );

        const prescriptionId = prescription.insertId;

        // ======================================
        // 6. บันทึกรายการยา
        // ======================================
        for (const medicine of Medicines) {

            if (
                !medicine.name ||
                !medicine.dosage ||
                !medicine.frequency ||
                !medicine.duration ||
                !medicine.quantity ||
                Number(medicine.quantity) <= 0
            ) {
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

        // ======================================
        // 7. ยืนยันการบันทึกทั้งหมด
        // ======================================
        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'บันทึกประวัติการรักษาและใบสั่งยาสำเร็จ',
            medicalRecordId,
            PrescriptionId: prescriptionId,
            bookingId
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.error('Save treatment and prescription error:', error);

        res.status(500).json({
            success: false,
            message: error.message || 'ไม่สามารถบันทึกข้อมูลได้'
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
});


// ======================================
// API ค้นหาผู้ป่วย
// ======================================
router.get('/patients', verifyDoctor, async (req, res) => {
    try {
        const q = (req.query.q || '').trim();

        if (!q) {
            return res.json({
                success: true,
                data: []
            });
        }

        const keyword = `%${q}%`;

        const [rows] = await pool.query(
            `SELECT
                pi.id AS patient_id,
                pi.user_id,
                pi.HN AS hn,
                u.first_name,
                u.last_name
             FROM patient_info pi
             JOIN users u ON u.id = pi.user_id
             WHERE pi.HN LIKE ?
                OR u.first_name LIKE ?
                OR u.last_name LIKE ?
             ORDER BY u.first_name ASC
             LIMIT 30`,
            [keyword, keyword, keyword]
        );

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Search patients error:', error);

        res.status(500).json({
            success: false,
            message: 'ค้นหาผู้ป่วยไม่สำเร็จ'
        });
    }
});


// ======================================
// API ดึงประวัติใบสั่งยาเดิมของผู้ป่วย
// ======================================
router.get('/patient/:userId', verifyDoctor, async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผู้ป่วยไม่ถูกต้อง'
            });
        }

        const [prescriptions] = await pool.query(
            `SELECT
                PrescriptionId,
                user_id,
                DoctorId,
                BookingId,
                Diagnosis,
                DoctorNote,
                PrescriptionDate,
                Status
             FROM prescriptions
             WHERE user_id = ?
             ORDER BY PrescriptionDate DESC, PrescriptionId DESC`,
            [userId]
        );

        if (prescriptions.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const ids = prescriptions.map(p => p.PrescriptionId);
        const placeholders = ids.map(() => '?').join(',');

        const [items] = await pool.query(
            `SELECT
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
             FROM prescription_items
             WHERE PrescriptionId IN (${placeholders})
             ORDER BY ItemId ASC`,
            ids
        );

        const data = prescriptions.map(p => ({
            ...p,
            medicines: items.filter(
                item => item.PrescriptionId === p.PrescriptionId
            )
        }));

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Fetch prescription history error:', error);

        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงประวัติใบสั่งยาได้'
        });
    }
});


export default router;
