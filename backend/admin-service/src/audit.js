import db from './db.js';

// เชื่อ X-Forwarded-For เฉพาะเมื่ออยู่หลัง reverse proxy ที่ไว้ใจได้ (TRUST_PROXY=1)
// ไม่งั้น client ปลอม header นี้เพื่อปลอม IP ใน log / หลบการบล็อก IP ได้
export const clientIp = (req) => {
  const fwd = process.env.TRUST_PROXY === '1' ? req.headers['x-forwarded-for'] : null;
  const ip = (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '').slice(0, 45);
};

// บันทึก audit log — ห้ามทำให้ request หลักล้ม ถ้าเขียน log ไม่ได้
export async function writeLog(req, action, { category = 'account', level = 'info' } = {}) {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, actor, action, category, level, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin?.id ?? null, req.admin?.username ?? 'unknown', action.slice(0, 255), category, level, clientIp(req)]
    );
  } catch (err) {
    console.error('writeLog failed:', err.message);
  }
}
