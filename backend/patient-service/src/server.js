const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

// เชื่อม db
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hiwjai',
    port: process.env.DB_PORT || 3306
});


// ดึงข้อมูลคนไข้ทั้งหมด
app.get('/api/patients', async (req, res) => {
    try {
        const { search } = req.query; // ดึงค่า search จากตอนที่ request ไปหลังบ้าน

        // ดึงข้อมูลของคนไข้มา
        let query = `
            SELECT p.id, p.hn, u.first_name, u.last_name, u.phone_number, 
                   p.gender, p.age, p.blood_group, p.allergies, p.address, p.emergency_contact
            FROM patient_info p
            JOIN users u ON p.user_id = u.id
        `;
        let queryParams = [];


        // แต่ถ้ามีการ search ก็ให้กรองหา ชื่อ, นามสกุล, hn ที่ตรงกับที่ search
        if (search) {
            query += ` WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR p.hn LIKE ?`;
            queryParams = [`%${search}%`, `%${search}%`, `%${search}%`];
        }

        // สาดไปสมาชิก สั่ง db ทำงานครับผม
        const [rows] = await pool.query(query, queryParams);

        // ส่งกลับหน้าบ้านแบบ JSON
        res.json({ 
            success: true, 
            data: rows 
        });
    } 
    catch (err) {
        console.error('Error fetching patients:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});


// ดูข้อมูลคนไข้รายคน
app.get('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params; // ดึงค่า id จากตอนที่ request ไปหลังบ้าน

        // ดึงข้อมูลคนไข้จาก id ที่เราหาเท่านั้น
        const query = `
            SELECT p.id, p.hn, u.first_name, u.last_name, u.phone_number, u.username,
                   p.gender, p.age, p.weight, p.height, p.blood_group, 
                   p.allergies, p.address, p.emergency_contact
            FROM patient_info p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `;
        const [rows] = await pool.query(query, [id]); // สั่ง db ทำงาน


        // ไม่เจอ id คนไข้ก็สาด 404 ไปครับสมาชิก
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        // ส่งข้อมูลคนไข้รายนั้นกลับไปในรูปแบบ JSON
        res.json({ 
            success: true, 
            data: rows[0] 
        });
    } 
    catch (err) {
        console.error('Error fetching patient detail:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});



app.listen(PORT, () => {
    console.log(`Patient Service is running on port ${PORT}`);
});