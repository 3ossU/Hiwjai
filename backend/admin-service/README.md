# admin-service (port 4001)

Backend ของผู้ดูแลระบบ Hiwjai — จัดการบัญชี/Role, ผู้ให้คำปรึกษา, รายงานภาพรวม, Audit log และความปลอดภัย

## ติดตั้ง

1. รัน migration ครั้งเดียว (หลัง import `database/hiwjai.sql`)
   ```
   mysql -u root -p hiwjai < ../database/admin_migration.sql
   ```
   จะได้บัญชี `admin_hiwjai` (รหัสผ่านเดียวกับบัญชีตัวอย่างอื่นใน seed — เปลี่ยนทันที)
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า DB และ `JWT_SECRET` **ให้ตรงกับ auth-service**
3. `npm install` แล้ว `npm run start:dev`

## Endpoints (ทั้งหมดต้องมี `Authorization: Bearer <accessToken>` ของ admin ที่ active)

| Method | Path | ใช้ทำอะไร |
|---|---|---|
| GET | `/api/admin/users?q=&role=&status=` | รายชื่อบัญชีทั้งหมด |
| POST | `/api/admin/users` | สร้างบัญชีเจ้าหน้าที่ (ไม่รวมผู้ป่วย) |
| PATCH | `/api/admin/users/:id/role` | เปลี่ยน Role `{ role }` |
| PATCH | `/api/admin/users/:id/status` | ระงับ/เปิดใช้งาน `{ status, reason? }` |
| POST | `/api/admin/users/:id/reset-password` | สร้างรหัสชั่วคราว + ปลดล็อก |
| GET / POST | `/api/admin/counselors` | รายชื่อ / เพิ่มผู้ให้คำปรึกษา |
| PUT | `/api/admin/counselors/:id` | แก้ไขข้อมูลผู้ให้คำปรึกษา |
| GET | `/api/admin/reports/overview` | ข้อมูลหน้ารายงานภาพรวม |
| GET | `/api/admin/security/logs?q=&level=&category=&limit=` | Audit log |
| GET | `/api/admin/security/summary` | ตัวเลขสรุปความปลอดภัย |
| GET / PUT | `/api/admin/security/settings` | นโยบายความปลอดภัย |
| GET / POST / DELETE | `/api/admin/security/blocked-ips[/:ip]` | จัดการ IP ที่ถูกบล็อก |

## กฎที่บังคับใน backend

- admin เปลี่ยน Role / ระงับบัญชีตัวเองไม่ได้ และต้องเหลือ admin ที่ active อย่างน้อย 1 คน
- ตรวจ role + status จาก DB ทุก request (ถูกถอดสิทธิ์แล้ว token เดิมใช้ต่อไม่ได้)
- รหัสผ่านใหม่ต้องผ่านนโยบาย (ความยาวขั้นต่ำ / สัญลักษณ์) จาก `security_settings`
- auth-service ใช้ `blocked_ips`, `failed_attempts`/`locked_until` และ `status` ตอน login และเขียน `audit_logs`
