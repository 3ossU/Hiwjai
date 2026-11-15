const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'ไม่พบ token' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    // รองรับชื่อ field ที่ auth-service อาจใช้ต่างกัน
    p.id = p.id ?? p.userId ?? p.user_id ?? p.sub;
    req.user = p;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

exports.role = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' });