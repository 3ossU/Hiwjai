
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// โหลด .env จากโฟลเดอร์ Service
dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

// ตรวจสอบการเชื่อมต่อ
console.log('Database Configuration:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('User:', process.env.DB_USER);
console.log('Password loaded:', Boolean(process.env.DB_PASSWORD));
console.log('Database:', process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hiwjai',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
