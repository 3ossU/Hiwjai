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
            VALUES (?, ?, ?, ?, ?, 'approved')
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



app.listen(PORT, () => {
    console.log(`Leave Service is running on port ${PORT}`);
});