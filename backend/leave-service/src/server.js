const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;

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

// ขอลา
app.post('/api/leaves', async (req, res) => {
    try {
        const { user_id, leave_type, start_date, end_date, reason } = req.body; // รับค่ามาจากหน้าบ้าน

        // เช็คข้อมูลพื้นฐานที่ห้ามเป็น null ว่าได้รับมามั้ย ถ้าไม่มีก็ไม่ทำ
        if (!user_id || !leave_type || !start_date || !end_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields (user_id, leave_type, start_date, end_date)' 
            });
        }


        // เช็คว่าวันสุดท้ายที่ลาต้องไม่เริ่มก่อนวันลา กลัวโดนออท็อปเตะ
        const leaveStartDate = new Date(start_date); // ดึงวันที่จากปฏิทินที่ตรงกับ start_date ที่เรากรอก เก็บไว้ในตัวแปรชื่อ leaveStartDate
        const leaveEndDate = new Date(end_date); // ดึงวันที่จากปฏิทินที่ตรงกับ end_date ที่เรากรอก เก็บไว้ในตัวแปรชื่อ leaveEndDate

        // set เวลาให้เป็น 00:00:00 เหมือนกัน ให้เทียบแค่วันพอ
        leaveStartDate.setHours(0, 0, 0, 0);
        leaveEndDate.setHours(0, 0, 0, 0);

        // วันสุดที่ลามันก็เลขมากกว่าวันแรก ดังนั้นเลยห้ามน้อยกว่า
        if (leaveEndDate < leaveStartDate) {
            return res.status(400).json({ 
                success: false, 
                error: 'End date cannot be earlier than start date.' 
            });
        }

        
        // เช็ค condition ที่ต้องยื่นล่วงหน้าอย่างน้อย 1 เดือน
        const today = new Date(); // ดึงวันที่ปัจจุบันจากปฏิทินมาเป็น today
        today.setHours(0, 0, 0, 0); // set เวลาให้เป็น 00:00:00 เหมือนกัน ให้เทียบแค่วันพอ

        // เอาวันที่ปัจจุบันมา แล้ว + ไปอีก 1 เดือน
        const oneMonthFromToday = new Date(today);
        oneMonthFromToday.setMonth(oneMonthFromToday.getMonth() + 1);

        // ถ้าโลกของปฏิทิน ตัวเลขที่น้อยกว่า < ถือว่าเกิดขึ้นก่อน
        // และเลขวันเดือนปีในระบบคอมมันจะรันไปเรื่อย ๆ วันที่เกิดก่อนเลขจะน้อยกว่าวันที่เกิดทีหลังเสมอ
        // oneMonthFromToday มันจะคือวันแรกที่เริ่มลาได้ ดังนั้น leaveStartDate จะน้อยกว่าไม่ได้
        if (leaveStartDate < oneMonthFromToday) {
            return res.status(400).json({ 
                success: false, 
                error: 'Leave request must be submitted at least 1 month in advance.' 
            });
        }

        // เช็คว่าคนลาใช่หมอไหม
        const [userRows] = await pool.query(
            `SELECT id, first_name, last_name, role FROM users WHERE id = ?`,
            [user_id]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้' });
        }
        const leaveOwner = userRows[0];

        // ถ้าคนลาเป็นหมอ ต้องไปเช็คว่ามันทับนัดตรวจหรือเยี่ยมบ้าน
        if (leaveOwner.role === 'doctor') {
            
            // เช็คว่าหมอลาทับวันที่มีนัดตรวจผู้ป่วยไหม
            const [bookingConflicts] = await pool.query(
                `SELECT b.id, b.appointment_date, b.start_time, b.end_time,
                        pi.hn, u_p.first_name AS patient_first_name, u_p.last_name AS patient_last_name
                 FROM booking b
                 JOIN patient_info pi ON b.patient_id = pi.id
                 JOIN users u_p ON pi.user_id = u_p.id
                 WHERE b.doctor_id = ?
                   AND b.status <> 'cancelled'
                   AND b.appointment_date BETWEEN ? AND ?
                 ORDER BY b.appointment_date ASC, b.start_time ASC`,
                [user_id, String(start_date).slice(0, 10), String(end_date).slice(0, 10)]
            );
            if (bookingConflicts.length > 0) {
                const first = bookingConflicts[0];
                const patientName = `${first.patient_first_name || ''} ${first.patient_last_name || ''}`.trim();
                return res.status(409).json({
                    success: false,
                    error: `ไม่สามารถลาได้ เนื่องจากมีนัดหมายผู้ป่วยในช่วงวันที่ลาอยู่ (${bookingConflicts.length} รายการ) เช่น ${patientName} (HN: ${first.hn}) วันที่ ${String(first.appointment_date).slice(0,10)} เวลา ${first.start_time}-${first.end_time}`,
                    conflicts: bookingConflicts
                });
            }

            // เช็คว่าหมอลาทับวันที่มีรอบเยี่ยมบ้านไหม
            const [visitConflicts] = await pool.query(
                `SELECT hv.id, hv.visit_date, hv.start_time, hv.end_time, hv.team_name
                 FROM home_visits hv
                 WHERE hv.lead_doctor_id = ?
                   AND hv.status <> 'cancelled'
                   AND hv.visit_date BETWEEN ? AND ?
                 ORDER BY hv.visit_date ASC, hv.start_time ASC`,
                [user_id, String(start_date).slice(0, 10), String(end_date).slice(0, 10)]
            );
            if (visitConflicts.length > 0) {
                const first = visitConflicts[0];
                return res.status(409).json({
                    success: false,
                    error: `ไม่สามารถลาได้ เนื่องจากมีรอบเยี่ยมบ้านในช่วงวันที่ลาอยู่ (${visitConflicts.length} รายการ) เช่น ทีม ${first.team_name} วันที่ ${String(first.visit_date).slice(0,10)} เวลา ${first.start_time}-${first.end_time}`,
                    conflicts: visitConflicts
                });
            }
        }

        // เช็คว่าคนที่ลามันเคยลาเวลานี้ไปยัง แต่เช็คเฉพาะใบที่ยังไม่ถูกปฏิเสธ (pending หรือ approved)
        const [selfConflicts] = await pool.query(
            `SELECT id, start_date, end_date, status
             FROM \`leave\`
             WHERE user_id = ?
               AND status IN ('pending', 'approved')
               AND DATE(start_date) <= ?
               AND DATE(end_date) >= ?
             ORDER BY start_date ASC`,
            [user_id, String(end_date).slice(0, 10), String(start_date).slice(0, 10)]
        );
        if (selfConflicts.length > 0) {
            return res.status(409).json({
                success: false,
                error: `มีใบลาที่ทับซ้อนกับช่วงเวลานี้อยู่แล้ว (${selfConflicts.length} รายการ)`,
                conflicts: selfConflicts
            });
        }


        // เตรียมคิวรี่ว่าเราจะ insert ข้อมูลไปใน column พวกนี้
        const query = `
            INSERT INTO \`leave\` (user_id, leave_type, start_date, end_date, reason, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;

        // set ลง db จริง ๆ โดยเอาข้อมูลที่รับจากฟ้อนต์เอนไปแปะใน ? ด้านบน
        const [result] = await pool.query(query, [
            user_id,
            leave_type,
            start_date,
            end_date,
            reason || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Leave request submitted successfully',
            leaveId: result.insertId // ส่ง leave id กลับไปหน้าบ้านด้วย
        });

    } 
    catch (err) {
        console.error('Error submitting leave:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// ดึงประวัติการลารายบุคคล
app.get('/api/leaves/:userId', async (req, res) => {
    try {
        const { userId } = req.params; // รับค่า id ของคนนั้นมาก่อน

        // ดึงข้อมูลการลา เรียงจากวันที่ล่าสุดขึ้นก่อน
        const query = `
            SELECT id, leave_type, start_date, end_date, reason, status, created_at
            FROM \`leave\` 
            WHERE user_id = ? 
            ORDER BY created_at ASC
        `;
        
        // สั่ง db ทำงาน
        const [rows] = await pool.query(query, [userId]);

        res.json({ 
            success: true, 
            data: rows // ส่งกลับฟ้อนเอน
        });
    } 
    catch (err) {
        console.error('Error fetching leave history:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// หัวหน้าพยาบาล

// ดึงประวัติใบลาทั้งหมด
app.get('/api/leaves/history/all', async (req, res) => {
    try {
        // ดึงใบลาทั้งหมดที่มีสถานะเป็น approved กับ rejected
        const query = `
            SELECT l.id, l.user_id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
                   u.first_name, u.last_name, u.role, u.avatar_url
            FROM \`leave\` l
            JOIN users u ON l.user_id = u.id
            WHERE l.status IN ('approved', 'rejected')
            ORDER BY l.created_at DESC
        `;

        // สั่ง db ทำงาน
        const [rows] = await pool.query(query);

        res.json({ 
            success: true, 
            data: rows 
        });
    } 
    catch (err) {
        console.error('Error fetching leave history:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// ดึงใบลาที่รออนุมัติ
app.get('/api/leaves/pending/all', async (req, res) => {
    try {
        // ดึงข้อมูลในใบลามา
        const query = `
            SELECT l.id, l.user_id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
                   u.first_name, u.last_name, u.role, u.avatar_url
            FROM \`leave\` l
            JOIN users u ON l.user_id = u.id
            WHERE l.status = 'pending'
            ORDER BY l.created_at ASC
        `;

        // สั่งให้ db ทำงาน
        const [rows] = await pool.query(query);

        res.json({ 
            success: true, 
            data: rows 
        });
    } 
    catch (err) {
        console.error('Error fetching pending leaves:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// approve or reject ใบลา
app.patch('/api/leaves/:id/status', async (req, res) => {
    try {
        const { id } = req.params; // รับค่า id ของใบลา
        const { status, approver_id } = req.body; // รับค่า 'approved' หรือ 'rejected' และ ID ของคนที่กดอนุมัติ

        // เช็คว่าค่าที่ส่งมามันถูกมั้ย ไม่ทะลึ่งส่งอย่างอื่นนอกจาก approved กับ rejected นะ
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        if (!approver_id) {
            return res.status(400).json({ success: false, error: 'Missing approver_id' });
        }

        // ดึงมาว่าใบลานี่คือของใคร
        const [leaveRows] = await pool.query(`SELECT user_id, status FROM \`leave\` WHERE id = ?`, [id]);
        
        if (leaveRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        const leaveOwnerId = leaveRows[0].user_id;

        // เช็คว่าใบลานี้เคยถูกอนุมัติไปแล้วรึยัง
        if (leaveRows[0].status !== 'pending') {
            return res.status(409).json({
                success: false,
                error: `ใบลานี้ถูกดำเนินการไปแล้ว (สถานะ: ${leaveRows[0].status})`
            });
        }

        // ไม่ให้หัวหน้าพยาบาล approve or reject ใบลาของตัวเองได้
        if (Number(leaveOwnerId) === Number(approver_id)) {
            return res.status(403).json({ 
                success: false, 
                error: 'คุณไม่สามารถอนุมัติหรือปฏิเสธใบลาของตัวเองได้' 
            });
        }

        // ถ้าจะกด approved ให้เช็คซ้ำอีกทีว่าหมอยังไม่มีนัดตรวจหรือทริปเยี่ยมบ้านทับช่วงวันลาหรือไม่
        // เพราะระหว่างที่รออนุมัติ อาจมีคนสร้างนัด/ทริปใหม่เข้ามาแทรกได้
        if (status === 'approved') {
            const [leaveDetailRows] = await pool.query(
                `SELECT start_date, end_date FROM \`leave\` WHERE id = ?`, [id]
            );
            const startDate = String(leaveDetailRows[0].start_date).slice(0, 10);
            const endDate = String(leaveDetailRows[0].end_date).slice(0, 10);

            // ดึงข้อมูลผู้ขอลาเพื่อเช็ค role
            const [ownerRows] = await pool.query(
                `SELECT id, first_name, last_name, role FROM users WHERE id = ?`, [leaveOwnerId]
            );
            const owner = ownerRows[0] || {};

            if (owner.role === 'doctor') {
                // เช็ค booking ทับ
                const [bookingConflicts] = await pool.query(
                    `SELECT b.id, b.appointment_date, b.start_time, b.end_time,
                            pi.hn, u_p.first_name AS patient_first_name, u_p.last_name AS patient_last_name
                     FROM booking b
                     JOIN patient_info pi ON b.patient_id = pi.id
                     JOIN users u_p ON pi.user_id = u_p.id
                     WHERE b.doctor_id = ?
                       AND b.status <> 'cancelled'
                       AND b.appointment_date BETWEEN ? AND ?
                     ORDER BY b.appointment_date ASC, b.start_time ASC`,
                    [leaveOwnerId, startDate, endDate]
                );
                if (bookingConflicts.length > 0) {
                    const first = bookingConflicts[0];
                    const patientName = `${first.patient_first_name || ''} ${first.patient_last_name || ''}`.trim();
                    return res.status(409).json({
                        success: false,
                        error: `ไม่สามารถอนุมัติได้ มีนัดหมายผู้ป่วยในช่วงวันที่ลา (${bookingConflicts.length} รายการ) เช่น ${patientName} (HN: ${first.hn}) กรุณายกเลิกนัดก่อนอนุมัติ`,
                        conflicts: bookingConflicts
                    });
                }

                // เช็ค home_visits ทับ
                const [visitConflicts] = await pool.query(
                    `SELECT hv.id, hv.visit_date, hv.start_time, hv.end_time, hv.team_name
                     FROM home_visits hv
                     WHERE hv.lead_doctor_id = ?
                       AND hv.status <> 'cancelled'
                       AND hv.visit_date BETWEEN ? AND ?
                     ORDER BY hv.visit_date ASC, hv.start_time ASC`,
                    [leaveOwnerId, startDate, endDate]
                );
                if (visitConflicts.length > 0) {
                    const first = visitConflicts[0];
                    return res.status(409).json({
                        success: false,
                        error: `ไม่สามารถอนุมัติได้ มีรอบเยี่ยมบ้านในช่วงวันที่ลา (${visitConflicts.length} รายการ) เช่น ทีม ${first.team_name} กรุณายกเลิกก่อนอนุมัติ`,
                        conflicts: visitConflicts
                    });
                }
            }
        }

        // อัพเดตสถานะใบลา
        const query = `UPDATE \`leave\` SET status = ? WHERE id = ?`;
        const [result] = await pool.query(query, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        res.json({ 
            success: true, 
            message: `Leave request ${status} successfully` 
        });
    } 
    catch (err) {
        console.error('Error updating leave status:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});



app.listen(PORT, () => {
    console.log(`Leave Service is running on port ${PORT}`);
});