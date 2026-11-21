import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hiwjai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
});

// MySQL ใน Docker ใช้เวลา UTC: ให้ทุก connection ใช้เวลาไทย
// เพื่อให้ NOW() / CURDATE() / paid_at ตรงกับเวลาเคาน์เตอร์ (ไม่งั้นช่วง 00:00-07:00 จะนับเป็นเมื่อวาน)
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+07:00'");
});

export default pool;