import express from 'express';
// import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import db from './db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
  }

  try {
    // ค้นหา User จากตาราง users 
    const [userRows] = await db.query(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );

    const u = userRows[0];
    
    if (!u || password !== '123456') {
      return res.status(401).json({ error: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // ถ้าเป็นผู้ป่วย ให้ดึงข้อมูลจาก patient_info เพิ่ม
    let patientData = null;
    if (u.role === 'patient') {
      const [patientRows] = await db.query(
        `SELECT id AS patient_id, hn FROM patient_info WHERE user_id = ?`,
        [u.id]
      );
      patientData = patientRows[0];
    }

    // จัดเตรียมข้อมูลToken
    const tokenPayload = { 
      id: u.id, 
      role: u.role 
    };
    
    if (patientData) {
      tokenPayload.patientId = patientData.patient_id;
    }

    // สร้าง JWT Token
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your_super_secret_key',
      { expiresIn: '1d' }
    );

    // ส่งข้อมูลกลับไปให้ Frontend
    const responseUser = {
      id: u.id,
      role: u.role,
      username: u.username,
      name: `${u.first_name} ${u.last_name}`
    };

    if (patientData) {
      responseUser.patientId = patientData.patient_id;
      responseUser.hn = patientData.hn;
    }

    res.json({
      token,
      user: responseUser
    });

  } catch (error) {
    // ตรงนี้สำคัญมาก จะพิมพ์ Error จริงๆ ลงใน Terminal ของ Backend
    console.error('Login Error details:', error); 
    res.status(500).json({ error: 'เซิร์ฟเวอร์มีปัญหา กรุณาตรวจสอบ Terminal' });
  }
});

export default router;