import express from 'express';
import db from '../db.js';
import { ah } from '../middleware.js';

const router = express.Router();

const ymd = (d) => d.toISOString().slice(0, 10);

// GET /reports/overview — ข้อมูลทั้งหมดของหน้า "รายงานภาพรวม"
router.get('/overview', ah(async (_req, res) => {
  // ใช้วันที่ของ DB เป็นหลัก กันเวลา server กับ DB ไม่ตรงกัน
  const [[{ today }]] = await db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return ymd(d);
  });

  const [
    [byRole],
    [[userTotals]],
    [[patientTotals]],
    [bookingsPerDay],
    [activitiesPerDay],
    [loginsPerDay],
    [bookingStatus],
    [[security]],
    [topCounselors],
    [recentLogs],
  ] = await Promise.all([
    db.query('SELECT role, COUNT(*) AS n FROM users GROUP BY role ORDER BY n DESC'),
    db.query(`SELECT COUNT(*) AS total,
                     SUM(status = 'active') AS active,
                     SUM(status = 'suspended') AS suspended
              FROM users`),
    db.query(`SELECT COUNT(*) AS total,
                     SUM(created_at >= CURDATE() - INTERVAL 6 DAY) AS new_this_week
              FROM users WHERE role = 'patient'`),
    db.query(`SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') AS d, COUNT(*) AS n FROM booking
              WHERE appointment_date >= CURDATE() - INTERVAL 6 DAY AND appointment_date <= CURDATE()
              GROUP BY d`),
    db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS n FROM activity_registrations
              WHERE created_at >= CURDATE() - INTERVAL 6 DAY GROUP BY d`),
    db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS n FROM audit_logs
              WHERE category = 'auth' AND level = 'info' AND action = 'เข้าสู่ระบบ'
                AND created_at >= CURDATE() - INTERVAL 6 DAY GROUP BY d`),
    db.query(`SELECT status, COUNT(*) AS n FROM booking
              WHERE appointment_date >= CURDATE() - INTERVAL 30 DAY GROUP BY status`),
    db.query(`SELECT SUM(level <> 'info') AS events, SUM(level = 'danger') AS danger FROM audit_logs
              WHERE created_at >= CURDATE() - INTERVAL 6 DAY`),
    db.query(`SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.username, u.status, p.specialty,
                     (SELECT COUNT(*) FROM booking b WHERE b.doctor_id = u.id AND b.status = 'completed') AS sessions
              FROM users u LEFT JOIN counselor_profiles p ON p.user_id = u.id
              WHERE u.role = 'doctor' ORDER BY sessions DESC, u.first_name LIMIT 5`),
    db.query(`SELECT id, created_at AS time, actor, action, category, level, ip
              FROM audit_logs ORDER BY id DESC LIMIT 5`),
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.d, Number(r.n)]));
  const b = toMap(bookingsPerDay);
  const a = toMap(activitiesPerDay);
  const l = toMap(loginsPerDay);

  const [[counselorTotals]] = await db.query(
    "SELECT COUNT(*) AS total, SUM(status = 'active') AS active FROM users WHERE role = 'doctor'"
  );

  res.json({
    users: {
      total: Number(userTotals.total),
      active: Number(userTotals.active || 0),
      suspended: Number(userTotals.suspended || 0),
      byRole: byRole.map((r) => ({ role: r.role, n: Number(r.n) })),
    },
    patients: { total: Number(patientTotals.total), newThisWeek: Number(patientTotals.new_this_week || 0) },
    counselors: {
      total: Number(counselorTotals.total),
      active: Number(counselorTotals.active || 0),
      top: topCounselors.map((c) => ({ ...c, sessions: Number(c.sessions) })),
    },
    weekly: days.map((d) => ({ date: d, bookings: b[d] || 0, logins: l[d] || 0, activities: a[d] || 0 })),
    bookingStatus: Object.fromEntries(bookingStatus.map((r) => [r.status, Number(r.n)])),
    security: { events7d: Number(security.events || 0), danger7d: Number(security.danger || 0) },
    recentLogs,
  });
}));

export default router;
