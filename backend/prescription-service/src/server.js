
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './db.js';

import prescriptionRoutes from './prescription.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// อนุญาตให้ Frontend เชื่อมต่อ Backend
app.use(cors());

// อ่านข้อมูล JSON จาก Frontend
app.use(express.json());

// อ่านข้อมูล จาก prescriptionRoutes
app.use('/api/prescriptions', prescriptionRoutes);

// ทดสอบการเชื่อมต่อ Database
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            success: true,
            message: 'Prescription Service connected to MySQL'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Cannot connect to MySQL'
        });
    }
});

// เปิด Server
app.listen(PORT, () => {
    console.log(`Prescription Service running on port ${PORT}`);
});
