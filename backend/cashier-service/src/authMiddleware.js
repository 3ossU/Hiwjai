import jwt from 'jsonwebtoken';

export function authenticateCashier(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'ไม่พบ Token กรุณาเข้าสู่ระบบใหม่' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'cashier' && decoded.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงระบบการเงิน (Cashier only)' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
}