import bcrypt from 'bcryptjs';
import db from '../src/db.js';

const [username, newPassword] = process.argv.slice(2);

if (!username || !newPassword) {
  console.log('วิธีใช้: node scripts/set-password.js <username> <รหัสผ่านใหม่>');
  process.exit(1);
}
if (newPassword.length < 8) {
  console.log('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  process.exit(1);
}

const hash = await bcrypt.hash(newPassword, 10);
const [r] = await db.query(
  'UPDATE users SET password_hash = ? WHERE username = ?',
  [hash, username]
);

console.log(r.affectedRows ? `เปลี่ยนรหัสของ ${username} แล้ว` : `ไม่พบ username: ${username}`);
await db.end();

// อันนี้คือเราไว้เซตเปลี่ยนรหัสผ่าน