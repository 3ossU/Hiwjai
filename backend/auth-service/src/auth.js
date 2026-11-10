import jwt from 'jsonwebtoken';

export function sign(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
}