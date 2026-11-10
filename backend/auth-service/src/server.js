import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // นำเข้า cors
import authRoutes from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// เปิดใช้งาน CORS เพื่อให้ Frontend ยิง API ข้าม Port มาได้ แก้ปัญหาที่ไม่ได้ถูกเรียกใช้
app.use(cors());

// Middleware สำหรับแปลง Request Body เป็น JSON
app.use(express.json());

// ใช้งาน Routes
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service is running on port ${PORT}`);
});