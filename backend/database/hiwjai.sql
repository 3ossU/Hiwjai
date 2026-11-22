-- MERGED HIWJAI DATABASE (2026-11-22)
-- Sources: hiwjai(1).sql + hiwjai (2)(1).sql
-- Import into a NEW EMPTY MySQL 8.0 database (do not import over existing tables).
-- Reconcile conflicts: newer rows take priority; keep additional older rows without collisions.
CREATE DATABASE IF NOT EXISTS `hiwjai` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hiwjai`;

-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db:3306
-- Generation Time: Nov 22, 2026 at 12:36 PM
-- Server version: 8.0.46
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hiwjai`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_registrations`
--

CREATE TABLE `activity_registrations` (
  `id` int NOT NULL,
  `activity_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_registrations`
--

INSERT INTO `activity_registrations` (`id`, `activity_id`, `patient_id`, `created_at`) VALUES
(1, 1, 2, '2026-11-18 14:56:25');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL,
  `user_id` int DEFAULT NULL,
  `actor` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `action` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('auth','account','data','security','system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `level` enum('info','warning','danger') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `actor`, `action`, `category`, `level`, `ip`, `created_at`) VALUES
(1, NULL, 'system', 'ติดตั้งระบบผู้ดูแล (admin migration)', 'system', 'info', '127.0.0.1', '2026-11-20 18:46:38'),
(2, 21, 'cashier_hiwjai', 'เข้าสู่ระบบล้มเหลว (ครั้งที่ 1)', 'auth', 'warning', '::1', '2026-11-20 18:47:28'),
(3, 21, 'cashier_hiwjai', 'เข้าสู่ระบบล้มเหลว (ครั้งที่ 2)', 'auth', 'warning', '::1', '2026-11-20 18:47:36'),
(4, 21, 'cashier_hiwjai', 'เข้าสู่ระบบล้มเหลว (ครั้งที่ 3)', 'auth', 'warning', '::1', '2026-11-20 18:48:24'),
(5, 21, 'cashier_hiwjai', 'เข้าสู่ระบบล้มเหลว (ครั้งที่ 4)', 'auth', 'warning', '::1', '2026-11-20 18:48:24'),
(6, 21, 'cashier_hiwjai', 'เข้าสู่ระบบล้มเหลว 5 ครั้ง — ล็อกบัญชี 15 นาที', 'auth', 'danger', '::1', '2026-11-20 18:48:24'),
(7, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:48:25'),
(8, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:48:25'),
(9, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:48:25'),
(10, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:48:25'),
(11, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:48:25'),
(12, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:48:25'),
(13, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:49:14'),
(14, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:49:28'),
(15, NULL, 'unknown', 'เข้าสู่ระบบล้มเหลว: ไม่พบ username \"adsf\"', 'auth', 'warning', '::1', '2026-11-20 18:51:34'),
(16, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 18:52:22'),
(17, 22, 'admin_hiwjai', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-20 18:53:58'),
(18, 21, 'cashier_hiwjai', 'พยายามเข้าสู่ระบบขณะบัญชีถูกล็อก', 'auth', 'warning', '::1', '2026-11-20 19:00:32'),
(19, 21, 'cashier_hiwjai', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-20 19:49:23'),
(20, 21, 'cashier_hiwjai', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-20 20:18:05'),
(21, 22, 'admin_hiwjai', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:24:09'),
(22, NULL, 'unknown', 'เข้าสู่ระบบล้มเหลว: ไม่พบ username \"casheir_hiwjai\"', 'auth', 'warning', '::1', '2026-11-21 11:24:49'),
(23, 21, 'cashier_hiwjai', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:25:07'),
(24, 1, 'dr_lalina', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:25:42'),
(25, 1, 'dr_lalina', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:26:08'),
(26, 4, 'pat_tontawan', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:26:28'),
(27, 2, 'nurse_fatima', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:27:00'),
(28, 16, 'dr_kajbhunditt', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:27:26'),
(29, 13, 'dr_noppakao', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:27:49'),
(30, 1, 'dr_lalina', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 11:28:39'),
(31, 2, 'nurse_fatima', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 13:29:36'),
(32, 18, 'nurse_thitiya', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 13:56:50'),
(33, 20, 'nurse_chayanon', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-21 14:19:03'),
(34, 24, 'nurse_jingjing', 'เข้าสู่ระบบ', 'auth', 'info', '::1', '2026-11-22 12:34:57');

-- --------------------------------------------------------

--
-- Table structure for table `billing_invoices`
--

CREATE TABLE `billing_invoices` (
  `id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ready' COMMENT 'ready = พร้อมชำระ, paid = ชำระแล้ว, หรือสถานะรอ เช่น รอฝ่ายยา',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `billing_invoices`
--

INSERT INTO `billing_invoices` (`id`, `patient_id`, `doctor_id`, `booking_id`, `status`, `total_amount`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 23, 'paid', 2300.00, '2026-11-20 20:04:11', '2026-11-20 20:18:55'),
(2, 2, 13, 24, 'รอฝ่ายยา', 1580.00, '2026-11-20 20:04:11', '2026-11-20 20:04:11'),
(3, 3, 16, 25, 'ready', 1200.00, '2026-11-20 20:04:11', '2026-11-20 20:04:11'),
(4, 4, 1, 26, 'paid', 2100.00, '2026-11-20 20:04:11', '2026-11-20 20:04:11');

-- --------------------------------------------------------

--
-- Table structure for table `billing_invoice_items`
--

CREATE TABLE `billing_invoice_items` (
  `id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `item_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('แพทย์','ฝ่ายยา','บริการ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `billing_invoice_items`
--

INSERT INTO `billing_invoice_items` (`id`, `invoice_id`, `item_name`, `item_type`, `qty`, `unit_price`) VALUES
(1, 1, 'ค่าปรึกษาจิตแพทย์ (45 นาที)', 'แพทย์', 1, 1500.00),
(2, 1, 'Sertraline 50 mg (30 เม็ด)', 'ฝ่ายยา', 1, 450.00),
(3, 1, 'Lorazepam 0.5 mg (10 เม็ด)', 'ฝ่ายยา', 1, 150.00),
(4, 1, 'ค่าบริการโรงพยาบาล/คลินิก', 'บริการ', 1, 200.00),
(5, 2, 'ค่าปรึกษานักจิตวิทยา (50 นาที)', 'แพทย์', 1, 1200.00),
(6, 2, 'Fluoxetine 20 mg (30 เม็ด)', 'ฝ่ายยา', 1, 380.00),
(7, 3, 'ค่าปรึกษาจิตแพทย์ (30 นาที)', 'แพทย์', 1, 1000.00),
(8, 3, 'ค่าบริการโรงพยาบาล/คลินิก', 'บริการ', 1, 200.00),
(9, 4, 'ค่าปรึกษาจิตแพทย์ (45 นาที)', 'แพทย์', 1, 1500.00),
(10, 4, 'Sertraline 50 mg (30 เม็ด)', 'ฝ่ายยา', 1, 400.00),
(11, 4, 'ค่าบริการโรงพยาบาล/คลินิก', 'บริการ', 1, 200.00);

-- --------------------------------------------------------

--
-- Table structure for table `blocked_ips`
--

CREATE TABLE `blocked_ips` (
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blocked_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `booking`
--

CREATE TABLE `booking` (
  `id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `created_by_nurse_id` int DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('scheduled','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking`
--

INSERT INTO `booking` (`id`, `patient_id`, `doctor_id`, `created_by_nurse_id`, `appointment_date`, `start_time`, `end_time`, `status`, `note`, `created_at`) VALUES
(1, 1, 1, 2, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 10:00:00', 'scheduled', 'ผู้ป่วยมาตรวจตามนัด', '2026-11-15 22:03:27'),
(2, 2, 1, 17, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 10:00:00', 'scheduled', 'ผู้ป่วยขอเลื่อนเวลาจากเดิม', '2026-11-15 22:03:27'),
(3, 3, 13, 2, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 10:00:00', 'scheduled', 'ตรวจติดตามอาการ', '2026-11-15 22:03:27'),
(4, 4, 16, 2, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 10:00:00', 'completed', 'ตรวจเสร็จเรียบร้อย', '2026-11-15 22:03:27'),
(5, 10, 13, 17, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 10:00:00', 'scheduled', 'นัดตรวจครั้งแรก', '2026-11-15 22:03:27'),
(6, 6, 1, 17, '2026-11-16', '2026-11-16 09:00:00', '2026-11-16 10:00:00', 'scheduled', 'นัดตรวจติดตามอาการ', '2026-11-15 22:03:27'),
(10, 5, 1, 18, '2026-11-19', '2026-11-19 09:00:00', '2026-11-19 10:00:00', 'cancelled', NULL, '2026-11-19 15:16:23'),
(11, 4, 16, 18, '2026-11-25', '2026-11-25 09:00:00', '2026-11-25 10:00:00', 'scheduled', NULL, '2026-11-19 15:16:49'),
(15, 2, 1, 18, '2026-11-25', '2026-11-25 10:00:00', '2026-11-25 11:00:00', 'cancelled', NULL, '2026-11-19 15:42:51'),
(16, 6, 1, 18, '2026-11-25', '2026-11-25 09:00:00', '2026-11-25 10:00:00', 'cancelled', NULL, '2026-11-19 15:45:12'),
(17, 6, 13, 18, '2026-11-25', '2026-11-25 09:00:00', '2026-11-25 10:00:00', 'cancelled', NULL, '2026-11-19 15:45:36'),
(18, 10, 13, 17, '2026-11-19', '2026-11-19 09:00:00', '2026-11-19 10:00:00', 'scheduled', NULL, '2026-11-19 16:03:24'),
(19, 7, 1, 17, '2026-11-25', '2026-11-25 09:00:00', '2026-11-25 10:00:00', 'cancelled', NULL, '2026-11-19 16:06:32'),
(20, 6, 1, 18, '2026-11-25', '2026-11-25 09:00:00', '2026-11-25 10:00:00', 'cancelled', NULL, '2026-11-19 16:10:09'),
(21, 2, 1, 18, '2026-11-25', '2026-11-25 09:00:00', '2026-11-25 10:00:00', 'cancelled', NULL, '2026-11-19 16:11:39'),
(22, 11, 1, 18, '2026-11-25', '2026-11-25 17:00:00', '2026-11-25 19:00:00', 'cancelled', NULL, '2026-11-19 18:23:12'),
(23, 1, 1, 2, '2026-11-20', '2026-11-20 09:00:00', '2026-11-20 10:00:00', 'scheduled', 'ตรวจติดตามอาการความดันโลหิต', '2026-11-19 19:20:39'),
(24, 2, 13, 17, '2026-11-20', '2026-11-20 09:30:00', '2026-11-20 10:30:00', 'scheduled', 'นัดปรึกษาอาการนอนไม่หลับ', '2026-11-19 19:20:39'),
(25, 3, 16, 18, '2026-11-20', '2026-11-20 10:00:00', '2026-11-20 11:00:00', 'scheduled', 'ตรวจประเมินอาการทั่วไป', '2026-11-19 19:20:39'),
(26, 4, 1, 2, '2026-11-20', '2026-11-20 13:00:00', '2026-11-20 14:00:00', 'scheduled', 'ตรวจติดตามผลหลังรับยา', '2026-11-19 19:20:39'),
(27, 5, 13, 17, '2026-11-20', '2026-11-20 14:00:00', '2026-11-20 15:00:00', 'scheduled', 'นัดพูดคุยปรับแผนการดูแล', '2026-11-19 19:20:39'),
(28, 6, 16, 18, '2026-11-21', '2026-11-21 09:00:00', '2026-11-21 10:00:00', 'scheduled', 'ตรวจติดตามอาการตามนัด', '2026-11-19 19:20:39'),
(29, 7, 1, 2, '2026-11-21', '2026-11-21 10:30:00', '2026-11-21 11:30:00', 'scheduled', 'นัดประเมินอาการต่อเนื่อง', '2026-11-19 19:20:39'),
(30, 8, 13, 17, '2026-11-21', '2026-11-21 13:30:00', '2026-11-21 14:30:00', 'scheduled', 'ตรวจติดตามอาการความเครียด', '2026-11-19 19:20:39'),
(31, 9, 16, 18, '2026-11-21', '2026-11-21 15:00:00', '2026-11-21 16:00:00', 'scheduled', 'ผู้ป่วยขอตรวจซ้ำ', '2026-11-19 19:20:39'),
(32, 10, 1, 2, '2026-11-22', '2026-11-22 09:00:00', '2026-11-22 10:00:00', 'scheduled', 'นัดตรวจติดตามอาการรายสัปดาห์', '2026-11-19 19:20:39'),
(33, 11, 13, 17, '2026-11-22', '2026-11-22 10:00:00', '2026-11-22 11:00:00', 'scheduled', 'ตรวจติดตามอาการทั่วไป', '2026-11-19 19:20:39'),
(34, 12, 16, 18, '2026-11-22', '2026-11-22 13:00:00', '2026-11-22 14:00:00', 'scheduled', 'นัดรับคำแนะนำด้านสุขภาพ', '2026-11-19 19:20:39'),
(35, 15, 1, 2, '2026-11-22', '2026-11-22 14:30:00', '2026-11-22 15:30:00', 'scheduled', 'ตรวจติดตามอาการครั้งแรก', '2026-11-19 19:20:39'),
(36, 1, 13, 17, '2026-11-23', '2026-11-23 09:00:00', '2026-11-23 10:00:00', 'scheduled', 'นัดตรวจติดตามผลช่วงเช้า', '2026-11-19 19:20:39'),
(37, 2, 16, 18, '2026-11-23', '2026-11-23 10:00:00', '2026-11-23 11:00:00', 'scheduled', 'ตรวจประเมินอาการต่อเนื่อง', '2026-11-19 19:20:39'),
(38, 4, 1, 2, '2026-11-23', '2026-11-23 11:00:00', '2026-11-23 12:00:00', 'scheduled', 'นัดติดตามอาการประจำเดือน', '2026-11-19 19:20:39'),
(39, 6, 13, 17, '2026-11-23', '2026-11-23 13:30:00', '2026-11-23 14:30:00', 'scheduled', 'ตรวจติดตามอาการช่วงบ่าย', '2026-11-19 19:20:39'),
(40, 8, 16, 18, '2026-11-23', '2026-11-23 15:00:00', '2026-11-23 16:00:00', 'scheduled', 'นัดตรวจทบทวนอาการ', '2026-11-19 19:20:39'),
(41, 1, 13, 2, '2026-11-21', '2026-11-21 18:00:00', '2026-11-21 19:00:00', 'scheduled', NULL, '2026-11-21 13:30:33'),
(42, 5, 13, 2, '2026-11-22', '2026-11-22 18:00:00', '2026-11-22 19:00:00', 'cancelled', NULL, '2026-11-21 13:30:55'),
(43, 12, 13, 2, '2026-11-22', '2026-11-22 13:00:00', '2026-11-22 14:00:00', 'cancelled', NULL, '2026-11-21 13:31:50'),
(44, 6, 13, 2, '2026-11-21', '2026-11-21 11:00:00', '2026-11-21 12:00:00', 'cancelled', NULL, '2026-11-21 13:55:43'),
(45, 11, 13, 2, '2026-11-21', '2026-11-21 09:00:00', '2026-11-21 10:00:00', 'scheduled', NULL, '2026-11-21 13:56:21');

-- --------------------------------------------------------

--
-- Table structure for table `counselor_profiles`
--

CREATE TABLE `counselor_profiles` (
  `user_id` int NOT NULL,
  `specialty` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `counselor_profiles`
--

INSERT INTO `counselor_profiles` (`user_id`, `specialty`, `license`, `bio`, `updated_at`) VALUES
(1, 'ภาวะซึมเศร้าและวิตกกังวล', 'ว.12345', 'ดูแลผู้ที่มีภาวะซึมเศร้าด้วยความเข้าใจ', '2026-11-20 18:46:38'),
(13, 'จิตเวชเด็กและวัยรุ่น', 'ว.23456', 'รับฟังวัยรุ่นอย่างไม่ตัดสิน', '2026-11-20 18:46:38'),
(16, 'การเสพติด', 'ว.34567', 'ช่วยให้กลับมาเป็นตัวเองอีกครั้ง', '2026-11-20 18:46:38');

-- --------------------------------------------------------

--
-- Table structure for table `home_visits`
--

CREATE TABLE `home_visits` (
  `id` int NOT NULL,
  `team_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lead_doctor_id` int NOT NULL,
  `nurse_id_1` int DEFAULT NULL,
  `nurse_id_2` int DEFAULT NULL,
  `visit_date` date NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('planned','in_progress','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'planned'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `home_visits`
--

INSERT INTO `home_visits` (`id`, `team_name`, `lead_doctor_id`, `nurse_id_1`, `nurse_id_2`, `visit_date`, `start_time`, `end_time`, `status`) VALUES
(1, 'ทีมพยาบาลชุมชน A', 16, 2, NULL, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 12:00:00', 'planned'),
(2, 'ทีมแพทย์ชุมชน B', 13, NULL, NULL, '2026-11-15', '2026-11-15 13:00:00', '2026-11-15 16:00:00', 'cancelled'),
(3, 'ทีมรักเคะ', 1, 2, NULL, '2026-11-19', '2026-11-19 09:00:00', '2026-11-19 12:00:00', 'planned'),
(6, 'ทีมรักเมะ', 13, 17, 18, '2026-11-20', '2026-11-20 12:00:00', '2026-11-20 15:00:00', 'planned'),
(7, 'ทีมเยี่ยมบ้านชุมชนโซนเหนือ', 1, 2, NULL, '2026-11-20', '2026-11-20 09:00:00', '2026-11-20 12:00:00', 'completed'),
(8, 'ทีมดูแลผู้ป่วยติดเตียงและผู้สูงอายุ A', 16, 20, NULL, '2026-11-21', '2026-11-21 09:00:00', '2026-11-21 12:00:00', 'planned'),
(9, 'ทีมพยาบาลชุมชนโซนใต้', 13, 17, NULL, '2026-11-22', '2026-11-22 09:00:00', '2026-11-22 12:00:00', 'planned'),
(10, 'ทีมเยี่ยมบ้านติดตามอาการ B', 1, 2, 18, '2026-11-22', '2026-11-22 13:00:00', '2026-11-22 16:00:00', 'planned'),
(11, 'ทีมสหวิชาชีพเยี่ยมบ้านชุมชน', 16, 20, NULL, '2026-11-23', '2026-11-23 09:30:00', '2026-11-23 12:30:00', 'planned');

-- --------------------------------------------------------

--
-- Table structure for table `home_visit_patients`
--

CREATE TABLE `home_visit_patients` (
  `home_visit_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `status` enum('scheduled','visited','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `home_visit_patients`
--

INSERT INTO `home_visit_patients` (`home_visit_id`, `patient_id`, `status`) VALUES
(1, 3, 'scheduled'),
(1, 4, 'scheduled'),
(2, 11, 'cancelled'),
(3, 3, 'scheduled'),
(3, 4, 'scheduled'),
(3, 7, 'scheduled'),
(3, 9, 'scheduled'),
(3, 10, 'scheduled'),
(6, 5, 'scheduled'),
(6, 6, 'scheduled'),
(6, 8, 'scheduled'),
(7, 1, 'visited'),
(7, 2, 'visited'),
(7, 11, 'visited'),
(8, 3, 'scheduled'),
(8, 4, 'scheduled'),
(8, 12, 'scheduled'),
(9, 7, 'scheduled'),
(9, 9, 'scheduled'),
(9, 10, 'scheduled'),
(10, 5, 'scheduled'),
(10, 8, 'scheduled'),
(11, 6, 'scheduled'),
(11, 11, 'scheduled'),
(11, 15, 'scheduled');

-- --------------------------------------------------------

--
-- Table structure for table `hospital_activities`
--

CREATE TABLE `hospital_activities` (
  `id` int NOT NULL,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `location` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `capacity` int NOT NULL DEFAULT '30'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hospital_activities`
--

INSERT INTO `hospital_activities` (`id`, `title`, `description`, `location`, `start_at`, `capacity`) VALUES
(1, 'กลุ่มบำบัดคลายเครียด', 'ฝึกหายใจและผ่อนคลายร่วมกับนักจิตวิทยา', 'ห้องประชุม 2 ชั้น 3', '2026-11-28 10:00:00', 20),
(2, 'เวิร์กชอปศิลปะบำบัด', 'วาดภาพระบายความรู้สึก ไม่ต้องมีพื้นฐาน', 'ศูนย์กิจกรรม ชั้น 1', '2026-12-05 13:30:00', 15);

-- --------------------------------------------------------

--
-- Table structure for table `leave`
--

CREATE TABLE `leave` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `leave_type` enum('sick','personal','maternity','annual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leave`
--

INSERT INTO `leave` (`id`, `user_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `created_at`) VALUES
(1, 2, 'personal', '2026-07-20', '2026-07-21', 'ทำธุระส่วนตัวต่างจังหวัด', 'pending', '2026-11-10 13:26:04'),
(2, 2, 'annual', '2026-12-25', '2026-12-27', 'ไปเที่ยวปีใหม่', 'rejected', '2026-11-10 20:50:39'),
(3, 1, 'sick', '2026-12-25', '2026-12-27', 'ลาป่วย', 'approved', '2026-11-14 13:45:12'),
(4, 17, 'sick', '2026-11-20', '2026-11-21', 'ลาป่วยเนื่องจากเป็นไข้', 'pending', '2026-11-15 22:18:59'),
(7, 18, 'annual', '2026-12-23', '2026-12-31', 'ลาช่วงสิ้นปี', 'pending', '2026-11-21 14:06:40');

-- --------------------------------------------------------

--
-- Table structure for table `medical_records`
--

CREATE TABLE `medical_records` (
  `id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `visit_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `chief_complaint` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `diagnosis` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `treatment_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `prescription` json DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `medicines`
--

CREATE TABLE `medicines` (
  `MedicineId` int NOT NULL,
  `MedicineName` varchar(255) NOT NULL,
  `Strength` varchar(100) DEFAULT NULL,
  `DosageForm` varchar(100) DEFAULT NULL,
  `Unit` varchar(50) DEFAULT NULL,
  `Description` text,
  `StockQuantity` int DEFAULT '0',
  `Status` varchar(30) DEFAULT 'active',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `medicines`
--

INSERT INTO `medicines` (`MedicineId`, `MedicineName`, `Strength`, `DosageForm`, `Unit`, `Description`, `StockQuantity`, `Status`, `CreatedAt`) VALUES
(1, 'Sertraline', '50 mg', 'Tablet', 'เม็ด', 'ยาต้านเศร้ากลุ่ม SSRI', 100, 'active', '2026-11-13 18:02:41'),
(2, 'Fluoxetine', '20 mg', 'Capsule', 'แคปซูล', 'ยาต้านเศร้ากลุ่ม SSRI', 100, 'active', '2026-11-13 18:02:41'),
(3, 'Escitalopram', '10 mg', 'Tablet', 'เม็ด', 'ยาต้านเศร้ากลุ่ม SSRI', 100, 'active', '2026-11-13 18:02:41'),
(4, 'Quetiapine', '25 mg', 'Tablet', 'เม็ด', 'ยากลุ่มต้านโรคจิต ใช้รักษาอาการทางจิตเวชบางประเภท', 100, 'active', '2026-11-13 18:02:41');

-- --------------------------------------------------------

--
-- Table structure for table `patient_booking_meta`
--

CREATE TABLE `patient_booking_meta` (
  `booking_id` int NOT NULL,
  `appointment_type` enum('clinic','online','home') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'clinic',
  `addon_note` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booked_by_user_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `patient_booking_meta`
--

INSERT INTO `patient_booking_meta` (`booking_id`, `appointment_type`, `addon_note`, `booked_by_user_id`, `created_at`) VALUES
(3, 'online', NULL, 4, '2026-11-15 15:53:39'),
(4, 'home', NULL, 4, '2026-11-15 16:38:47'),
(5, 'online', NULL, 4, '2026-11-18 15:04:52'),
(6, 'online', NULL, 4, '2026-11-19 08:05:27'),
(7, 'online', 'นัดเล่นๆ', 3, '2026-11-19 08:12:13');

-- --------------------------------------------------------

--
-- Table structure for table `patient_info`
--

CREATE TABLE `patient_info` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `hn` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `birth_date` date DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `blood_group` enum('O','O-','O+','A','A-','A+','B','B-','B+','AB','AB-','AB+','UNKNOWN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
  `allergies` json DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `emergency_contact` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_relation` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `patient_info`
--

INSERT INTO `patient_info` (`id`, `user_id`, `hn`, `birth_date`, `weight`, `height`, `blood_group`, `allergies`, `address`, `emergency_contact`, `emergency_contact_relation`) VALUES
(1, 3, 'HN001', '1996-04-12', 53.00, 170.00, 'O', '[{\"name\": \"แพ้ยาเพนิซิลลิน\"}]', '123 ถนนสุขุมวิท กรุงเทพฯ', '081-999-9999', 'มารดา'),
(2, 4, 'HN002', '2000-11-07', 50.00, 165.00, 'A', '[]', '45 ถนนพหลโยธิน กรุงเทพฯ', '089-888-8888', 'พี่ชาย'),
(3, 5, 'HN003', '2001-11-25', 46.00, 165.00, 'O', '[]', '101 ถนนสุขุมวิท กรุงเทพฯ', '081-111-1101', 'มารดา'),
(4, 6, 'HN004', '1998-10-08', 49.00, 170.00, 'A', '[{\"name\": \"แพ้ฝุ่น\"}]', '102 ถนนพระราม 9 กรุงเทพฯ', '081-111-1102', 'น้องสาว'),
(5, 7, 'HN005', '1996-07-04', 47.00, 166.00, 'B', '[{\"name\": \"แพ้ถั่วลิสง\"}]', '222 ถนนเพชรเกษม กรุงเทพฯ', '081-111-1103', 'คู่สมรส'),
(6, 8, 'HN006', '1995-05-11', 48.00, 168.00, 'A', '[]', '88/1 ถนนพระราม 4 กรุงเทพฯ', '081-111-1104', 'คู่สมรส'),
(7, 9, 'HN007', '2002-05-27', 52.00, 173.00, 'O', '[]', '12/5 ซอยทองหล่อ กรุงเทพฯ', '081-111-1105', 'มารดา'),
(8, 10, 'HN008', '1998-09-09', 52.00, 177.00, 'O', '[{\"name\": \"แพ้อาหารทะเล\"}]', '78 ถนนมิตรภาพ นครราชสีมา', '081-111-1106', 'บิดา'),
(9, 11, 'HN009', '2000-01-05', 47.00, 170.00, 'A', '[{\"name\": \"แพ้ยาแอสไพริน\"}]', '654 ถนนรังสิต-ปทุมธานี ปทุมธานี', '081-111-1107', 'น้องสาว'),
(10, 12, 'HN010', '1999-01-14', 48.00, 165.00, 'A', '[]', '333 ถนนสีลม กรุงเทพฯ', '081-111-1108', 'น้องชาย'),
(11, 14, 'HN011', '1997-12-04', 70.00, 185.00, 'A', '[{\"name\": \"แพ้ฝุ่น\"}]', '99 ถนนรัชดาภิเษก กรุงเทพฯ', '082-222-2202', 'บุตร'),
(12, 15, 'HN012', '2003-01-31', 64.00, 180.00, 'B', '[]', '456 ถนนลาดพร้าว กรุงเทพฯ', '082-222-2203', 'พี่ชาย'),
(15, 19, 'HN13', '2004-02-20', 41.00, 159.00, 'A', '[]', '99/12 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110', '081-234-5678', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` int NOT NULL,
  `receipt_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `cashier_id` int NOT NULL,
  `payment_method` enum('เงินสด','PromptPay','บัตรเครดิต') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `received_amount` decimal(10,2) NOT NULL,
  `change_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_detail` json DEFAULT NULL COMMENT 'เก็บ {ref} สำหรับ PromptPay หรือ {brand, last4, approval} สำหรับบัตรเครดิต',
  `is_sent_to_finance` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0 = รอนำส่ง, 1 = ส่งยอดปิดกะแล้ว',
  `sent_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `receipt_no`, `invoice_id`, `patient_id`, `cashier_id`, `payment_method`, `amount`, `received_amount`, `change_amount`, `payment_detail`, `is_sent_to_finance`, `sent_at`, `paid_at`) VALUES
(1, 'REC-6911-001', 4, 4, 21, 'บัตรเครดิต', 2100.00, 2100.00, 0.00, '{\"brand\": \"VISA\", \"last4\": \"4242\", \"approval\": \"A12B34\"}', 0, NULL, '2026-11-20 20:04:11'),
(2, 'REC-6911-002', 1, 1, 21, 'เงินสด', 2300.00, 2300.00, 0.00, NULL, 0, NULL, '2026-11-20 20:18:55');

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `PrescriptionId` int NOT NULL COMMENT 'รหัสใบสั่งยา',
  `user_id` int NOT NULL COMMENT 'รหัสคนไข้ (patient_info.id)',
  `DoctorId` int NOT NULL COMMENT 'รหัสแพทย์',
  `Diagnosis` text COMMENT 'การวินิจฉัย',
  `DoctorNote` text COMMENT 'หมายเหตุแพทย์',
  `PrescriptionDate` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่ออกใบสั่งยา',
  `Status` varchar(30) DEFAULT 'active' COMMENT 'สถานะใบสั่งยา',
  `BookingId` int DEFAULT NULL,
  `medical_record_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescription_items`
--

CREATE TABLE `prescription_items` (
  `ItemId` int NOT NULL,
  `PrescriptionId` int NOT NULL,
  `MedicineName` varchar(255) NOT NULL,
  `Strength` varchar(100) DEFAULT NULL,
  `Dosage` varchar(100) DEFAULT NULL,
  `Frequency` varchar(100) DEFAULT NULL,
  `Duration` varchar(100) DEFAULT NULL,
  `Quantity` int DEFAULT NULL,
  `Instructions` text,
  `MedicineId` int DEFAULT NULL,
  `Route` varchar(100) DEFAULT NULL,
  `Meal` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `security_settings`
--

CREATE TABLE `security_settings` (
  `id` tinyint NOT NULL DEFAULT '1',
  `two_factor` tinyint(1) NOT NULL DEFAULT '1',
  `lock_after_fails` tinyint(1) NOT NULL DEFAULT '1',
  `max_attempts` int NOT NULL DEFAULT '5',
  `lock_minutes` int NOT NULL DEFAULT '15',
  `session_minutes` int NOT NULL DEFAULT '30',
  `min_password_length` int NOT NULL DEFAULT '8',
  `require_symbol` tinyint(1) NOT NULL DEFAULT '1',
  `mask_patient_data` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `security_settings`
--

INSERT INTO `security_settings` (`id`, `two_factor`, `lock_after_fails`, `max_attempts`, `lock_minutes`, `session_minutes`, `min_password_length`, `require_symbol`, `mask_patient_data`, `updated_by`, `updated_at`) VALUES
(1, 1, 1, 5, 15, 30, 8, 1, 1, NULL, '2026-11-20 18:46:38');

-- --------------------------------------------------------

--
-- Table structure for table `treatment_records`
--

CREATE TABLE `treatment_records` (
  `id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `booking_id` int DEFAULT NULL,
  `visit_date` date NOT NULL,
  `diagnosis` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `treatment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('patient','doctor','nurse','head_nurse','admin','cashier','finance','pharmacist') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','suspended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `suspend_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `failed_attempts` int NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `first_name`, `last_name`, `gender`, `phone_number`, `avatar_url`, `role`, `status`, `suspend_reason`, `last_login`, `failed_attempts`, `locked_until`, `created_at`, `updated_at`) VALUES
(1, 'dr_lalina', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Lalina', 'Schuett', 'female', '081-111-1111', 'https://i.pinimg.com/1200x/a4/f0/a7/a4f0a7b80e32e85caa40d6d820ae1a9e.jpg', 'doctor', 'active', NULL, '2026-11-21 11:28:39', 0, NULL, '2026-11-10 13:26:04', '2026-11-21 11:28:39'),
(2, 'nurse_fatima', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Fatima', 'Dechawaleekul', 'female', '082-222-2222', 'https://i.pinimg.com/736x/e9/51/9d/e9519d7113fca956b5efe772f36e5e31.jpg', 'nurse', 'active', NULL, '2026-11-21 13:29:36', 0, NULL, '2026-11-10 13:26:04', '2026-11-21 13:29:36'),
(3, 'pat_nuttanicha', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Nuttanicha', 'Dungwattanawanich', 'female', '083-333-3333', 'https://i.pinimg.com/1200x/8b/bb/17/8bbb175d7ffd0dccbfa08af0c0705b8e.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-10 13:26:04', '2026-11-15 20:51:19'),
(4, 'pat_tontawan', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Tontawan', 'Tantivejakul', 'female', '084-444-4444', 'https://i.pinimg.com/736x/c3/19/e0/c319e09ce5b6bf122f01fc529549cb66.jpg', 'patient', 'active', NULL, '2026-11-21 11:26:28', 0, NULL, '2026-11-10 13:26:04', '2026-11-21 11:26:28'),
(5, 'pat_natsha', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Natsha', 'Techamongklapiwat', 'female', '085-555-5551', 'https://i.pinimg.com/736x/84/93/75/849375f4c7365d908321580eecdcd7d0.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-16 07:15:55'),
(6, 'pat_saralee', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Saralee', 'Prasitdumrong', 'female', '085-555-5552', 'https://i.pinimg.com/736x/13/58/eb/1358eb5e3d052d991839d2fb8909c737.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(7, 'pat_eisaya', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Eisaya', 'Hosuwan', 'female', '085-555-5553', 'https://i.pinimg.com/736x/ff/1a/af/ff1aaff504a59613f806654e58f5ac46.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(8, 'pat_sirilak', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Sirilak', 'Kwong', 'female', '085-555-5554', 'https://i.pinimg.com/736x/c2/28/19/c22819b9af9f0bd2d2ea7b70f3e20700.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(9, 'pat_kornnaphat', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Kornnaphat', 'Sethratanapong', 'female', '085-555-5555', 'https://i.pinimg.com/736x/af/7d/6f/af7d6f7caa621b719bc9774e1904e822.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(10, 'pat_ranchrawee', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Ranchrawee', 'Uakoolwarawat', 'female', '085-555-5556', 'https://i.pinimg.com/736x/e6/19/e7/e619e710ab8c585838ba36cb6113d85d.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(11, 'pat_yeena', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Yeena', 'Salas', 'female', '085-555-5557', 'https://i.pinimg.com/736x/aa/fc/bd/aafcbd406e808533d374dcf63993b090.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(12, 'pat_punpreedee', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Punpreedee', 'Khumprom Rodsaward', 'female', '085-555-5558', 'https://i.pinimg.com/1200x/58/a4/e0/58a4e02df2a81b7d3faeeb6509b08b7e.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(13, 'dr_noppakao', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Noppakao', 'Dechaphatthanakun', 'male', '086-666-6661', 'https://i.pinimg.com/1200x/0d/44/b5/0d44b5aca1dc76e52abc8e398c779833.jpg', 'doctor', 'active', NULL, '2026-11-21 11:27:49', 0, NULL, '2026-11-16 03:09:00', '2026-11-21 11:27:49'),
(14, 'pat_kanawut', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Kanawut', 'Traipipattanapong', 'male', '086-666-6662', 'https://i.pinimg.com/1200x/86/d3/4f/86d34fbd0dd0877a785769d98d19bfe3.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(15, 'pat_panitan', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Panitan', 'Budkaew', 'male', '086-666-6663', 'https://i.pinimg.com/736x/68/0a/fa/680afa5a4edddf37c1cde15bf22d753c.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(16, 'dr_kajbhunditt', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Kajbhunditt', 'Jaidee', 'male', '086-666-6664', 'https://i.pinimg.com/736x/83/42/23/834223a6fd4ab3ffab269f4c23d10307.jpg', 'doctor', 'active', NULL, '2026-11-21 11:27:26', 0, NULL, '2026-11-16 03:09:00', '2026-11-21 11:27:26'),
(17, 'nurse_suchada', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Suchada', 'Sonpan', 'female', '062-345-6789', 'https://i.pinimg.com/1200x/4d/31/18/4d3118a61ebc2058019d44fcb75b3b87.jpg', 'nurse', 'active', NULL, NULL, 0, NULL, '2026-11-15 22:12:34', '2026-11-16 07:22:09'),
(18, 'nurse_thitiya', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Thitiya', 'Jirapornsilp', 'female', '081-234-5678', 'https://i.pinimg.com/736x/e1/22/56/e12256219221dffc353734fe4e7d1a70.jpg', 'head_nurse', 'active', NULL, '2026-11-21 13:56:50', 0, NULL, '2026-11-16 07:21:47', '2026-11-21 13:56:50'),
(19, 'pat_chanikarn', '$2b$10$bUyt5BPWg0A5.1yIC06msOMOA.756cx3KJDV7UNygZftXj45axF12', 'Chanikarn', 'Tangkabodee', 'female', '091-112-2334', 'https://i.pinimg.com/736x/a6/fe/d4/a6fed451a57624b25595e8bdb4026eaa.jpg', 'patient', 'active', NULL, NULL, 0, NULL, '2026-11-19 18:35:13', '2026-11-19 18:35:13'),
(20, 'nurse_chayanon', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Chayanon', 'Phakthin', 'male', '080-000-0000', 'https://i.pinimg.com/736x/c7/2e/a4/c72ea4a0a23019bd65c23089562894d5.jpg', 'head_nurse', 'active', NULL, '2026-11-21 14:19:03', 0, NULL, '2026-11-21 14:09:48', '2026-11-21 14:19:03'),
(21, 'cashier_hiwjai', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Hiwjai', 'Cashier', 'other', '02-000-0001', NULL, 'cashier', 'active', NULL, '2026-11-21 11:25:07', 0, NULL, '2026-11-20 18:46:01', '2026-11-21 11:25:07'),
(22, 'admin_hiwjai', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Hiwjai', 'Admin', 'other', '02-000-0000', NULL, 'admin', 'active', NULL, '2026-11-21 11:24:09', 0, NULL, '2026-11-20 18:46:38', '2026-11-21 11:24:09'),
(23, 'nurse_patitta', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Patitta', 'Phonjamroenrat', 'female', '087-111-1111', 'https://i.pinimg.com/1200x/c5/53/03/c55303ac68c2ba542569b2659d757dd5.jpg', 'head_nurse', 'active', NULL, NULL, 0, NULL, '2026-11-22 11:55:27', '2026-11-22 12:33:59'),
(24, 'nurse_jingjing', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Jingjing', 'Yu', 'female', '087-222-2222', 'https://i.pinimg.com/736x/1b/27/3a/1b273ae8cb93d080b6059fa4c1c2f7fa.jpg', 'head_nurse', 'active', NULL, '2026-11-22 12:34:57', 0, NULL, '2026-11-22 11:55:27', '2026-11-22 12:34:57'),
(25, 'nurse_ployshompoo', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Ployshompoo', 'Supasap', 'female', '087-333-3333', 'https://i.pinimg.com/736x/94/82/09/94820913e391d2d5d7d8a669b50235cd.jpg', 'nurse', 'active', NULL, NULL, 0, NULL, '2026-11-22 11:55:27', '2026-11-22 12:33:06'),
(26, 'nurse_phuwin', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Phuwin', 'Tangsakyuen', 'male', '087-444-4444', 'https://i.pinimg.com/736x/68/18/24/6818244339a478da22485054f21b0660.jpg', 'nurse', 'active', NULL, NULL, 0, NULL, '2026-11-22 11:55:27', '2026-11-22 12:33:06'),
(27, 'nurse_phutatchai', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Phutatchai', 'limpanyakul', 'male', '087-555-5555', 'https://i.pinimg.com/736x/4e/89/ff/4e89ff62200e1b3a3e95cdd04966d03f.jpg', 'nurse', 'active', NULL, NULL, 0, NULL, '2026-11-22 11:56:12', '2026-11-22 12:33:59'),
(28, 'nurse_pattraphus', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Pattraphus', 'Borattasuwan', 'male', '087-666-6666', 'https://i.pinimg.com/1200x/49/23/da/4923da502f0aa2fdbca84f316e3c2b3d.jpg', 'nurse', 'active', NULL, NULL, 0, NULL, '2026-11-22 11:56:12', '2026-11-22 12:33:59');


-- --------------------------------------------------------
-- Supplementary records from hiwjai (2)(1).sql
-- Original booking IDs 10/13 remapped to 46/47 to avoid overwriting the newer records.
-- Old prescription user_id converted from users.id to patient_info.id.
-- Missing legacy prescription booking IDs 11/12 set to NULL to avoid false links.
-- --------------------------------------------------------

INSERT INTO `booking` (`id`, `patient_id`, `doctor_id`, `created_by_nurse_id`, `appointment_date`, `start_time`, `end_time`, `status`, `note`, `created_at`) VALUES
(46, 6, 1, NULL, '2026-12-24', '2026-12-24 02:32:00', '2026-12-24 03:32:00', 'scheduled', 'นัดติดตามอาการ | การวินิจฉัย: test | อาการ: test', '2026-11-17 18:32:18'),
(47, 6, 1, NULL, '2026-12-01', '2026-12-01 22:46:00', '2026-12-01 23:46:00', 'scheduled', 'นัดติดตามอาการ | การวินิจฉัย: test | อาการ: test', '2026-11-18 13:47:10');

INSERT INTO `leave` (`id`, `user_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `created_at`) VALUES
(6, 1, 'personal', '2026-12-18', '2026-12-21', 'test', 'pending', '2026-11-18 14:58:09');

INSERT INTO `medical_records` (`id`, `patient_id`, `doctor_id`, `booking_id`, `visit_date`, `chief_complaint`, `diagnosis`, `treatment_note`, `prescription`, `follow_up_date`) VALUES
(9, 6, 1, 46, '2026-11-18 00:00:00', 'test', 'test', 'test', '[{\"dose\": \"1 / 1 / หลังอาหาร\", \"name\": \"Escitalopram\", \"duration\": \"1\"}]', '2026-12-24'),
(10, 6, 1, NULL, '2026-11-14 00:00:00', 'test', 'test', 'test', '[{\"dose\": \"1 / 1 / หลังอาหาร\", \"name\": \"Escitalopram\", \"duration\": \"1\"}]', '2026-11-19'),
(11, 6, 1, NULL, '2026-11-14 00:00:00', 'test', 'test', 'test', '[{\"dose\": \"1 / 1 / หลังอาหาร\", \"name\": \"Escitalopram\", \"duration\": \"1\"}]', '2026-11-16'),
(12, 6, 1, 47, '2026-11-18 00:00:00', 'test', 'test', 'test', '[]', '2026-12-01');

INSERT INTO `prescriptions` (`PrescriptionId`, `user_id`, `DoctorId`, `Diagnosis`, `DoctorNote`, `PrescriptionDate`, `Status`, `BookingId`, `medical_record_id`) VALUES
(15, 6, 1, 'test', NULL, '2026-11-17 18:32:18', 'active', 46, 9),
(16, 6, 1, 'test', NULL, '2026-11-18 13:21:05', 'active', NULL, 10),
(17, 6, 1, 'test', NULL, '2026-11-18 13:22:40', 'active', NULL, 11),
(18, 6, 1, 'test', NULL, '2026-11-18 13:47:10', 'active', 47, 12);

INSERT INTO `prescription_items` (`ItemId`, `PrescriptionId`, `MedicineName`, `Strength`, `Dosage`, `Frequency`, `Duration`, `Quantity`, `Instructions`, `MedicineId`, `Route`, `Meal`) VALUES
(12, 15, 'Escitalopram', '10 mg', '1', '1', '1', 5, NULL, 3, 'รับประทาน', 'หลังอาหาร'),
(13, 16, 'Escitalopram', '10 mg', '1', '1', '1', 1, NULL, 3, 'อื่น ๆ', 'หลังอาหาร'),
(14, 17, 'Escitalopram', '10 mg', '1', '1', '1', 1, NULL, 3, 'รับประทาน', 'หลังอาหาร');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_registrations`
--
ALTER TABLE `activity_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reg` (`activity_id`,`patient_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_created` (`created_at`),
  ADD KEY `idx_audit_level` (`level`),
  ADD KEY `audit_logs_ibfk_1` (`user_id`);

--
-- Indexes for table `billing_invoices`
--
ALTER TABLE `billing_invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inv_patient` (`patient_id`),
  ADD KEY `idx_inv_doctor` (`doctor_id`),
  ADD KEY `idx_inv_status` (`status`),
  ADD KEY `fk_inv_booking` (`booking_id`);

--
-- Indexes for table `billing_invoice_items`
--
ALTER TABLE `billing_invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_item_invoice` (`invoice_id`);

--
-- Indexes for table `blocked_ips`
--
ALTER TABLE `blocked_ips`
  ADD PRIMARY KEY (`ip`),
  ADD KEY `blocked_ips_ibfk_1` (`blocked_by`);

--
-- Indexes for table `booking`
--
ALTER TABLE `booking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `created_by_nurse_id` (`created_by_nurse_id`);

--
-- Indexes for table `counselor_profiles`
--
ALTER TABLE `counselor_profiles`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `home_visits`
--
ALTER TABLE `home_visits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lead_doctor_id` (`lead_doctor_id`),
  ADD KEY `fk_hv_nurse1` (`nurse_id_1`),
  ADD KEY `fk_hv_nurse2` (`nurse_id_2`);

--
-- Indexes for table `home_visit_patients`
--
ALTER TABLE `home_visit_patients`
  ADD PRIMARY KEY (`home_visit_id`,`patient_id`),
  ADD KEY `patient_id` (`patient_id`);

--
-- Indexes for table `hospital_activities`
--
ALTER TABLE `hospital_activities`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leave`
--
ALTER TABLE `leave`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nurse_id` (`user_id`);

--
-- Indexes for table `medical_records`
--
ALTER TABLE `medical_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_patient` (`patient_id`),
  ADD KEY `idx_doctor` (`doctor_id`);

ALTER TABLE `medical_records`
  ADD KEY `idx_visit_date_merged` (`visit_date`),
  ADD KEY `idx_booking_merged` (`booking_id`);

--
-- Indexes for table `medicines`
--
ALTER TABLE `medicines`
  ADD PRIMARY KEY (`MedicineId`);

--
-- Indexes for table `patient_booking_meta`
--
ALTER TABLE `patient_booking_meta`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `idx_booked_by` (`booked_by_user_id`);

--
-- Indexes for table `patient_info`
--
ALTER TABLE `patient_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `hn` (`hn`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_receipt_no` (`receipt_no`),
  ADD KEY `idx_tx_invoice` (`invoice_id`),
  ADD KEY `idx_tx_cashier` (`cashier_id`),
  ADD KEY `idx_tx_paid_at` (`paid_at`),
  ADD KEY `fk_tx_patient` (`patient_id`);

--
-- Indexes for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`PrescriptionId`),
  ADD KEY `idx_presc_user` (`user_id`),
  ADD KEY `idx_presc_doctor` (`DoctorId`),
  ADD KEY `idx_presc_booking` (`BookingId`),
  ADD KEY `fk_prescriptions_medical_record` (`medical_record_id`);

--
-- Indexes for table `prescription_items`
--
ALTER TABLE `prescription_items`
  ADD PRIMARY KEY (`ItemId`),
  ADD KEY `PrescriptionId` (`PrescriptionId`),
  ADD KEY `idx_presc_item_medicine` (`MedicineId`);

--
-- Indexes for table `security_settings`
--
ALTER TABLE `security_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `treatment_records`
--
ALTER TABLE `treatment_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_patient` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `booking_id` (`booking_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_registrations`
--
ALTER TABLE `activity_registrations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `billing_invoices`
--
ALTER TABLE `billing_invoices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `billing_invoice_items`
--
ALTER TABLE `billing_invoice_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `home_visits`
--
ALTER TABLE `home_visits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `hospital_activities`
--
ALTER TABLE `hospital_activities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `leave`
--
ALTER TABLE `leave`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `medical_records`
--
ALTER TABLE `medical_records`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `medicines`
--
ALTER TABLE `medicines`
  MODIFY `MedicineId` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `patient_info`
--
ALTER TABLE `patient_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `prescriptions`
--
ALTER TABLE `prescriptions`
  MODIFY `PrescriptionId` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสใบสั่งยา', AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `prescription_items`
--
ALTER TABLE `prescription_items`
  MODIFY `ItemId` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `treatment_records`
--
ALTER TABLE `treatment_records`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `billing_invoices`
--
ALTER TABLE `billing_invoices`
  ADD CONSTRAINT `fk_inv_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_inv_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_inv_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `billing_invoice_items`
--
ALTER TABLE `billing_invoice_items`
  ADD CONSTRAINT `fk_item_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `blocked_ips`
--
ALTER TABLE `blocked_ips`
  ADD CONSTRAINT `blocked_ips_ibfk_1` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `booking_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `booking_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `booking_ibfk_3` FOREIGN KEY (`created_by_nurse_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `counselor_profiles`
--
ALTER TABLE `counselor_profiles`
  ADD CONSTRAINT `counselor_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `home_visits`
--
ALTER TABLE `home_visits`
  ADD CONSTRAINT `fk_hv_nurse1` FOREIGN KEY (`nurse_id_1`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_hv_nurse2` FOREIGN KEY (`nurse_id_2`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `home_visits_ibfk_1` FOREIGN KEY (`lead_doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `home_visit_patients`
--
ALTER TABLE `home_visit_patients`
  ADD CONSTRAINT `home_visit_patients_ibfk_1` FOREIGN KEY (`home_visit_id`) REFERENCES `home_visits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `home_visit_patients_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave`
--
ALTER TABLE `leave`
  ADD CONSTRAINT `leave_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_info`
--
ALTER TABLE `patient_info`
  ADD CONSTRAINT `patient_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `fk_tx_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_tx_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_tx_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `fk_prescriptions_booking` FOREIGN KEY (`BookingId`) REFERENCES `booking` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_doctor` FOREIGN KEY (`DoctorId`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_medical_record` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_patient` FOREIGN KEY (`user_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `prescription_items`
--
ALTER TABLE `prescription_items`
  ADD CONSTRAINT `fk_presc_items_medicine` FOREIGN KEY (`MedicineId`) REFERENCES `medicines` (`MedicineId`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_presc_items_prescription` FOREIGN KEY (`PrescriptionId`) REFERENCES `prescriptions` (`PrescriptionId`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `treatment_records`
--
ALTER TABLE `treatment_records`
  ADD CONSTRAINT `treatment_records_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `treatment_records_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `treatment_records_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE SET NULL;
-- Foreign keys restored from legacy medical_records schema.
ALTER TABLE `medical_records`
  ADD CONSTRAINT `fk_medical_records_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medical_records_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medical_records_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
