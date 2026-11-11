import jwt from 'jsonwebtoken';

// ตรวจ access token จาก header Authorization Bearer <token>
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    // frontend จะจับ 401 นี้ไปขอ token ใหม่ด้วย refresh token
    return res.status(401).json({ error: 'Token หมดอายุหรือไม่ถูกต้อง' });
  }
}

// จำกัดสิทธิ์ตาม role เช่น requireRole('admin', 'nurse')
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์ใช้งาน' });
  }
  next();
};