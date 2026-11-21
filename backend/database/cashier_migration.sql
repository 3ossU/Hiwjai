-- ============================================================
-- Hiwjai : ตารางของระบบแคชเชียร์ (cashier-service :4002)
-- รันหลัง hiwjai.sql + admin_migration.sql + cashier_seed.sql
--   docker exec -i hiwjai_mysql_db mysql -uroot -prootpassword hiwjai < cashier_migration.sql
--
-- รันซ้ำได้: สร้างตารางแบบ IF NOT EXISTS และใส่บิลตัวอย่างเฉพาะตอนที่ยังไม่มีบิลเลย
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- บิลค่าบริการ 1 ใบต่อการเข้ารับบริการ 1 ครั้ง
-- status: 'ready' = พร้อมชำระ, 'paid' = ชำระแล้ว, อื่น ๆ = ข้อความสถานะที่ยังไม่พร้อม เช่น 'รอฝ่ายยา'
CREATE TABLE IF NOT EXISTS `billing_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'ready',
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_billing_status` (`status`),
  KEY `patient_id` (`patient_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `billing_invoices_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `billing_invoices_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `billing_invoices_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- รายการในบิล  item_type: 'แพทย์' | 'ฝ่ายยา' | 'บริการ' (ตรงกับที่หน้า cashier ใช้แยกยอด)
CREATE TABLE IF NOT EXISTS `billing_invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_type` enum('แพทย์','ฝ่ายยา','บริการ') NOT NULL,
  `qty` int NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `billing_invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- การรับชำระ 1 ครั้ง = ใบเสร็จ 1 ใบ
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_no` varchar(30) NOT NULL,
  `invoice_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `cashier_id` int NOT NULL,
  `payment_method` enum('เงินสด','PromptPay','บัตรเครดิต') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `received_amount` decimal(10,2) NOT NULL,
  `change_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_detail` json DEFAULT NULL,
  `paid_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_sent_to_finance` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_receipt_no` (`receipt_no`),
  UNIQUE KEY `uniq_invoice` (`invoice_id`),
  KEY `idx_paid_at` (`paid_at`),
  KEY `patient_id` (`patient_id`),
  KEY `cashier_id` (`cashier_id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `payment_transactions_ibfk_3` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- บิลตัวอย่าง (ใส่เฉพาะตอนที่ตาราง billing_invoices ยังว่าง)
-- ผูกกับผู้ป่วยด้วย HN และแพทย์ด้วย username เพื่อไม่ขึ้นกับเลข id
-- ============================================================
DROP PROCEDURE IF EXISTS `seed_cashier_invoices`;
DELIMITER $$
CREATE PROCEDURE `seed_cashier_invoices`()
BEGIN
  DECLARE inv INT;

  IF (SELECT COUNT(*) FROM billing_invoices) = 0 THEN

    INSERT INTO billing_invoices (patient_id, doctor_id, status)
      SELECT p.id, d.id, 'ready' FROM patient_info p, users d WHERE p.hn = 'HN001' AND d.username = 'dr_lalina';
    SET inv = LAST_INSERT_ID();
    INSERT INTO billing_invoice_items (invoice_id, item_name, item_type, qty, unit_price) VALUES
      (inv, 'ค่าปรึกษาจิตแพทย์ (45 นาที)', 'แพทย์', 1, 1500),
      (inv, 'Sertraline 50 mg (30 เม็ด)', 'ฝ่ายยา', 1, 450),
      (inv, 'Lorazepam 0.5 mg (10 เม็ด)', 'ฝ่ายยา', 1, 150),
      (inv, 'ค่าบริการโรงพยาบาล/คลินิก', 'บริการ', 1, 200);

    INSERT INTO billing_invoices (patient_id, doctor_id, status)
      SELECT p.id, d.id, 'รอฝ่ายยา' FROM patient_info p, users d WHERE p.hn = 'HN002' AND d.username = 'dr_noppakao';
    SET inv = LAST_INSERT_ID();
    INSERT INTO billing_invoice_items (invoice_id, item_name, item_type, qty, unit_price) VALUES
      (inv, 'ค่าปรึกษานักจิตวิทยา (50 นาที)', 'แพทย์', 1, 1200),
      (inv, 'Fluoxetine 20 mg (30 เม็ด)', 'ฝ่ายยา', 1, 380);

    INSERT INTO billing_invoices (patient_id, doctor_id, status)
      SELECT p.id, d.id, 'ready' FROM patient_info p, users d WHERE p.hn = 'HN003' AND d.username = 'dr_kajbhunditt';
    SET inv = LAST_INSERT_ID();
    INSERT INTO billing_invoice_items (invoice_id, item_name, item_type, qty, unit_price) VALUES
      (inv, 'ค่าปรึกษาจิตแพทย์ (30 นาที)', 'แพทย์', 1, 1000),
      (inv, 'ค่าบริการโรงพยาบาล/คลินิก', 'บริการ', 1, 200);

    INSERT INTO billing_invoices (patient_id, doctor_id, status)
      SELECT p.id, d.id, 'ready' FROM patient_info p, users d WHERE p.hn = 'HN005' AND d.username = 'dr_lalina';
    SET inv = LAST_INSERT_ID();
    INSERT INTO billing_invoice_items (invoice_id, item_name, item_type, qty, unit_price) VALUES
      (inv, 'ค่าปรึกษาจิตแพทย์ (45 นาที)', 'แพทย์', 1, 1500),
      (inv, 'Escitalopram 10 mg (30 เม็ด)', 'ฝ่ายยา', 1, 520),
      (inv, 'ค่าแบบประเมินสุขภาพจิต', 'บริการ', 1, 300);

    -- เติมยอดรวมให้ตรงกับรายการ
    UPDATE billing_invoices bi
      SET total_amount = (SELECT COALESCE(SUM(qty * unit_price), 0) FROM billing_invoice_items WHERE invoice_id = bi.id);
  END IF;
END$$
DELIMITER ;

CALL `seed_cashier_invoices`();
DROP PROCEDURE IF EXISTS `seed_cashier_invoices`;
