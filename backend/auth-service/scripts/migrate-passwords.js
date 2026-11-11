import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../src/db.js';

// เฉพาะ user ที่ยังไม่ใช่ bcrypt hash 
const [users] = await db.query(
  `SELECT id, username FROM users WHERE password_hash NOT LIKE '$2%'`
);

for (const u of users) {
  const temp = crypto.randomBytes(6).toString('base64url');
  const hash = await bcrypt.hash(temp, 10);
  await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, u.id]);
  console.log(`${u.username}\t${temp}`);
}

await db.end();