import db from './db.js';

// ฟังก์ชันด้านความปลอดภัยของการ login (ใช้ตาราง/คอลัมน์จาก database/admin_migration.sql)
// ทุกฟังก์ชันเขียนแบบ "ล้มแบบนุ่ม" ถ้ายังไม่ได้รัน migration ระบบ login เดิมยังใช้ได้ตามปกติ

const DEFAULTS = { lock_after_fails: 1, max_attempts: 5, lock_minutes: 15 };

export const clientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '').slice(0, 45);
};

const safe = async (fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
      console.error('[auth security]', err.message);
    }
    return fallback;
  }
};

export const getSettings = () =>
  safe(async () => {
    const [rows] = await db.query('SELECT lock_after_fails, max_attempts, lock_minutes FROM security_settings WHERE id = 1');
    return rows[0] || DEFAULTS;
  }, DEFAULTS);

export const isBlocked = (ip) =>
  safe(async () => {
    const [rows] = await db.query('SELECT 1 FROM blocked_ips WHERE ip = ?', [ip]);
    return rows.length > 0;
  }, false);

// คืนจำนวนนาทีที่ยังถูกล็อกอยู่ (0 = ไม่ได้ล็อก)
export const lockedMinutesLeft = (userId) =>
  safe(async () => {
    const [[r]] = await db.query(
      `SELECT IF(locked_until > NOW(), GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), locked_until) / 60), 1), 0) AS mins
       FROM users WHERE id = ?`,
      [userId]
    );
    return Number(r?.mins || 0);
  }, 0);

// นับครั้งที่ login ผิด ถ้าครบตามนโยบายจะล็อกบัญชี — คืน { attempts, locked }
export const recordFailure = (u, s) =>
  safe(async () => {
    const attempts = (u.failed_attempts || 0) + 1;
    const locked = !!s.lock_after_fails && attempts >= s.max_attempts;
    await db.query(
      `UPDATE users SET failed_attempts = ?, locked_until = IF(?, NOW() + INTERVAL ? MINUTE, locked_until) WHERE id = ?`,
      [locked ? 0 : attempts, locked, s.lock_minutes, u.id]
    );
    return { attempts, locked };
  }, { attempts: 0, locked: false });

export const recordSuccess = (userId) =>
  safe(() => db.query('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?', [userId]), null);

export const logEvent = ({ userId = null, actor = 'unknown', action, category = 'auth', level = 'info', ip = null }) =>
  safe(
    () =>
      db.query(
        'INSERT INTO audit_logs (user_id, actor, action, category, level, ip) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, String(actor).slice(0, 50), String(action).slice(0, 255), category, level, ip]
      ),
    null
  );
