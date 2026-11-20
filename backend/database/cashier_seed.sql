-- ============================================================
-- Hiwjai : บัญชีแคชเชียร์ (role = cashier)
-- รันหลัง hiwjai.sql + admin_migration.sql
--   mysql -u root -p hiwjai < cashier_seed.sql
--
-- username: cashier_hiwjai
-- password: cashier1234
-- ============================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO `users` (`username`, `password_hash`, `first_name`, `last_name`, `gender`, `phone_number`, `role`)
VALUES ('cashier_hiwjai', '$2b$10$DlpQB8HDZqlwOxIXN2UJJu3bbdUNI.e4UsUZoqQB2l22xnhLCvpam', 'Hiwjai', 'Cashier', 'other', '02-000-0001', 'cashier');
