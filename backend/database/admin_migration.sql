-- ============================================================
-- Hiwjai : Admin migration
-- รันครั้งเดียวหลัง import hiwjai.sql
--   mysql -u root -p hiwjai < admin_migration.sql
-- ============================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ---------- users : สถานะบัญชี + ล็อกเมื่อ login ผิดซ้ำ ----------
ALTER TABLE `users`
  ADD COLUMN `status` enum('active','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' AFTER `role`,
  ADD COLUMN `suspend_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `status`,
  ADD COLUMN `last_login` datetime DEFAULT NULL AFTER `suspend_reason`,
  ADD COLUMN `failed_attempts` int NOT NULL DEFAULT 0 AFTER `last_login`,
  ADD COLUMN `locked_until` datetime DEFAULT NULL AFTER `failed_attempts`;

-- ---------- ข้อมูลเพิ่มเติมของผู้ให้คำปรึกษา (role = doctor) ----------
CREATE TABLE IF NOT EXISTS `counselor_profiles` (
  `user_id` int NOT NULL,
  `specialty` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `counselor_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- บันทึกการใช้งาน ----------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `actor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('auth','account','data','security','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `level` enum('info','warning','danger') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_level` (`level`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- IP ที่ถูกบล็อก ----------
CREATE TABLE IF NOT EXISTS `blocked_ips` (
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blocked_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ip`),
  CONSTRAINT `blocked_ips_ibfk_1` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- นโยบายความปลอดภัย (มีแถวเดียว id = 1) ----------
CREATE TABLE IF NOT EXISTS `security_settings` (
  `id` tinyint NOT NULL DEFAULT 1,
  `two_factor` tinyint(1) NOT NULL DEFAULT 1,
  `lock_after_fails` tinyint(1) NOT NULL DEFAULT 1,
  `max_attempts` int NOT NULL DEFAULT 5,
  `lock_minutes` int NOT NULL DEFAULT 15,
  `session_minutes` int NOT NULL DEFAULT 30,
  `min_password_length` int NOT NULL DEFAULT 8,
  `require_symbol` tinyint(1) NOT NULL DEFAULT 1,
  `mask_patient_data` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `security_settings` (`id`) VALUES (1);

-- ---------- seed ----------
-- บัญชี admin (ใช้รหัสผ่านเดียวกับบัญชีตัวอย่างอื่นใน hiwjai.sql — ควรเปลี่ยนทันทีหลัง login)
INSERT IGNORE INTO `users` (`username`, `password_hash`, `first_name`, `last_name`, `gender`, `phone_number`, `role`)
VALUES ('admin_hiwjai', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Hiwjai', 'Admin', 'other', '02-000-0000', 'admin');

INSERT IGNORE INTO `counselor_profiles` (`user_id`, `specialty`, `license`, `bio`) VALUES
(1,  'ภาวะซึมเศร้าและวิตกกังวล', 'ว.12345', 'ดูแลผู้ที่มีภาวะซึมเศร้าด้วยความเข้าใจ'),
(13, 'จิตเวชเด็กและวัยรุ่น',       'ว.23456', 'รับฟังวัยรุ่นอย่างไม่ตัดสิน'),
(16, 'การเสพติด',                  'ว.34567', 'ช่วยให้กลับมาเป็นตัวเองอีกครั้ง');

INSERT INTO `audit_logs` (`actor`, `action`, `category`, `level`, `ip`)
VALUES ('system', 'ติดตั้งระบบผู้ดูแล (admin migration)', 'system', 'info', '127.0.0.1');

COMMIT;
