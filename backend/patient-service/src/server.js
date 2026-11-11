const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

// แปะไว้ก่อง จาเอาไป hash รหัสใส่ db 
const sampleHash = bcrypt.hashSync('123456', 10);
console.log("ค่า Hash ของรหัสผ่านใหม่ที่ถูกต้อง:", sampleHash);

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


// add user
app.post('/api/patients', async (req, res) => {
    // ประกาศ pool.getConnection 
    // คล้าย pool.query แต่เพราะเราจะสร้างที effect กับตั้ง 2 table เลยต้องใช้
    const connection = await pool.getConnection();
    
    try {
        // รับค่าจากหน้าบ้านที่เรากรอก
        const {
            username, password, first_name, last_name, phone_number,
            hn, gender, age, weight, height, blood_group, allergies, address, emergency_contact
        } = req.body;

        // เช็คข้อมูลพื้นฐานที่ห้ามเป็น null ว่าได้รับมามั้ย ถ้าไม่มีก็ไม่ทำ เชิ่ดใส่เยย
        if (!username || !password || !first_name || !last_name || !hn) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // hash รหัสเพราะว่าเราจะสร้าง add password ด้วยตอน add user
        const hashedPassword = await bcrypt.hash(password, 10);


        // เริ่มทำ Transaction ซึ่งมันก็คือการที่ทุกคำสั่งที่เราคิวรี่ไป มันจะต้องถูกทั้งหมด db มันถึงจะทำงาน
        await connection.beginTransaction();


        // เตรียมคิวรี่ว่าเราจะ insert ข้อมูลไปใน column พวกนี้ (user)
        const userQuery = `
            INSERT INTO users (username, password, first_name, last_name, phone_number, role)
            VALUES (?, ?, ?, ?, ?, 'patient')
        `;

        // set ลง db จริง ๆ โดยเอาข้อมูลที่รับจากฟ้อนเอนไปแปะใน ? ด้านบน
        const [userResult] = await connection.query(userQuery, [
            username, 
            hashedPassword,
            first_name, 
            last_name, 
            phone_number || null
        ]);

        // ตัว id ที่พึ่งสร้างใหม่สด ๆ จากตาราง users เก็บมันไว้ในชื่อ newUserId แล้วเอา fk ที่ตาราง patient_info ด้านล่าง
        const newUserId = userResult.insertId;

        // เตรียมคิวรี่ว่าเราจะ insert ข้อมูลไปใน column พวกนี้ (patient_info)
        const patientQuery = `
            INSERT INTO patient_info (user_id, hn, gender, age, weight, height, blood_group, allergies, address, emergency_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // set ลง db จริง ๆ โดยเอาข้อมูลที่รับจากฟ้อนเอนไปแปะใน ? ด้านบน
        await connection.query(patientQuery, [
            newUserId,
            hn,
            gender || null,
            age || null,
            weight || null,
            height || null,
            blood_group || null,
            allergies || null,
            address || null,
            emergency_contact || null
        ]);

        // สั่ง db ทำงาน
        await connection.commit();

        connection.release(); // ปิดการทำงาน pool.getConnection 


        res.status(201).json({
            success: true,
            message: 'Patient registered successfully with hashed password',
            userId: newUserId // ส่ง id ใหม่ที่สร้างกลับไปหน้าบ้านด้วย
        });

    } 
    catch (err) {
        // ถ้ามันมีอะไรสักอย่างผิดพลาด ก็คือล้างไพ่ไปเลย rollback กลับไปว่าชั้นไม่ทำจ้า
        await connection.rollback();
        connection.release(); // ปิดการทำงาน pool.getConnection 

        console.error('Error registering patient:', err);
        res.status(500).json({ success: false, error: 'Server Error or Duplicate Data (Username/HN already exists)' });
    }
});



app.listen(PORT, () => {
    console.log(`Patient Service is running on port ${PORT}`);
});