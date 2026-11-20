import jwt from 'jsonwebtoken';
import db from './db.js';

// ตรวจ access token (ออกโดย auth-service ด้วย JWT_SECRET เดียวกัน)
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    return res.status(401).json({ error: 'Token หมดอายุหรือไม่ถูกต้อง' });
  }
}

// ต้องเป็น admin ที่ยัง active อยู่ในฐานข้อมูลจริง
// (กันกรณีถูกถอด role / ถูกระงับ ระหว่างที่ token เดิมยังไม่หมดอายุ)
export async function requireAdmin(req, res, next) {
  try {
    const [rows] = await db.query('SELECT id, username, role, status FROM users WHERE id = ?', [req.user?.id]);
    const me = rows[0];
    if (!me || me.role !== 'admin' || me.status !== 'active') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ใช้งาน' });
    }
    req.admin = me;
    next();
  } catch (err) {
    next(err);
  }
}

// ใช้กับ router.param('id', validId) — id ต้องเป็นจำนวนเต็มบวก
// (ถ้าปล่อย NaN ลง SQL จะได้ ER_BAD_FIELD_ERROR แล้วผู้ใช้เห็นข้อความ "ให้รัน migration" ผิดๆ)
export function validId(req, res, next, value) {
  if (!/^[1-9]\d{0,9}$/.test(value)) return res.status(400).json({ error: 'รหัสผู้ใช้ไม่ถูกต้อง' });
  next();
}

// ห่อ async handler ให้ error ไปที่ error handler กลาง
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
