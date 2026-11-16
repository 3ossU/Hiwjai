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
            SELECT l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
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
            SELECT l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
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
        const { id } = req.params; // รับค่า id ของพยาบาลคนที่ส่งใบลามา
        const { status } = req.body; // รับค่า 'approved' หรือ 'rejected'

        // เช็คว่าค่าที่ส่งมามันถูกมั้ย ไม่ทะลึ่งส่งอย่างอื่นนอกจาก approved กับ rejected นะ
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
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