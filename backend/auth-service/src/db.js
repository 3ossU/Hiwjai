
import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
<<<<<<< HEAD
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'hiwjai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
=======
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    database: process.env.DB_NAME || 'hiwjai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
>>>>>>> 2b601b9f5e803bb2fb27ee472c6447270a073eac
});

export default pool;
