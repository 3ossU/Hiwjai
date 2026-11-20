import crypto from 'node:crypto';
import db from './db.js';

export const STAFF_ROLES = ['admin', 'doctor', 'nurse', 'head_nurse', 'pharmacist', 'cashier', 'finance'];

export async function getSettings() {
  const [rows] = await db.query('SELECT * FROM security_settings WHERE id = 1');
  return rows[0] || { min_password_length: 8, require_symbol: 1 };
}

// คืนข้อความ error ถ้ารหัสผ่านไม่ผ่านนโยบาย, null ถ้าผ่าน
export function checkPassword(pw, s) {
  if (typeof pw !== 'string' || pw.length < s.min_password_length) {
    return `รหัสผ่านต้องมีอย่างน้อย ${s.min_password_length} ตัวอักษร`;
  }
  if (s.require_symbol && !/[^A-Za-z0-9]/.test(pw)) {
    return 'รหัสผ่านต้องมีสัญลักษณ์อย่างน้อย 1 ตัว เช่น ! @ # $';
  }
  return null;
}

// รหัสชั่วคราวที่ผ่านนโยบายเสมอ
export function tempPassword(s) {
  const len = Math.max(12, s.min_password_length);
  const body = crypto.randomBytes(len).toString('base64url').slice(0, len - 2);
  return `${body}#7`;
}

export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,50}$/;
export const GENDERS = ['male', 'female', 'other'];
