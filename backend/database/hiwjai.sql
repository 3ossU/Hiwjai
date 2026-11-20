-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db:3306
-- Generation Time: Nov 19, 2026 at 07:23 PM
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
  `status` enum('scheduled','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `note` text COLLATE utf8mb4_unicode_ci,
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
(40, 8, 16, 18, '2026-11-23', '2026-11-23 15:00:00', '2026-11-23 16:00:00', 'scheduled', 'นัดตรวจทบทวนอาการ', '2026-11-19 19:20:39');

-- --------------------------------------------------------

--
-- Table structure for table `home_visits`
--

CREATE TABLE `home_visits` (
  `id` int NOT NULL,
  `team_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lead_doctor_id` int NOT NULL,
  `visit_date` date NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('planned','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'planned'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `home_visits`
--

INSERT INTO `home_visits` (`id`, `team_name`, `lead_doctor_id`, `visit_date`, `start_time`, `end_time`, `status`) VALUES
(1, 'ทีมพยาบาลชุมชน A', 16, '2026-11-15', '2026-11-15 09:00:00', '2026-11-15 12:00:00', 'planned'),
(2, 'ทีมแพทย์ชุมชน B', 13, '2026-11-15', '2026-11-15 13:00:00', '2026-11-15 16:00:00', 'cancelled'),
(3, 'ทีมรักเคะ', 1, '2026-11-19', '2026-11-19 09:00:00', '2026-11-19 12:00:00', 'planned'),
(6, 'ทีมรักเมะ', 13, '2026-11-20', '2026-11-20 12:00:00', '2026-11-20 15:00:00', 'planned'),
(7, 'ทีมเยี่ยมบ้านชุมชนโซนเหนือ', 1, '2026-11-20', '2026-11-20 09:00:00', '2026-11-20 12:00:00', 'completed'),
(8, 'ทีมดูแลผู้ป่วยติดเตียงและผู้สูงอายุ A', 16, '2026-11-21', '2026-11-21 09:00:00', '2026-11-21 12:00:00', 'planned'),
(9, 'ทีมพยาบาลชุมชนโซนใต้', 13, '2026-11-22', '2026-11-22 09:00:00', '2026-11-22 12:00:00', 'planned'),
(10, 'ทีมเยี่ยมบ้านติดตามอาการ B', 1, '2026-11-22', '2026-11-22 13:00:00', '2026-11-22 16:00:00', 'planned'),
(11, 'ทีมสหวิชาชีพเยี่ยมบ้านชุมชน', 16, '2026-11-23', '2026-11-23 09:30:00', '2026-11-23 12:30:00', 'planned');

-- --------------------------------------------------------

--
-- Table structure for table `home_visit_patients`
--

CREATE TABLE `home_visit_patients` (
  `home_visit_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `status` enum('scheduled','visited','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled'
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
  `leave_type` enum('sick','personal','maternity','annual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leave`
--

INSERT INTO `leave` (`id`, `user_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `created_at`) VALUES
(1, 2, 'personal', '2026-07-20', '2026-07-21', 'ทำธุระส่วนตัวต่างจังหวัด', 'pending', '2026-11-10 13:26:04'),
(2, 2, 'annual', '2026-12-25', '2026-12-27', 'ไปเที่ยวปีใหม่', 'rejected', '2026-11-10 20:50:39'),
(3, 1, 'sick', '2026-12-25', '2026-12-27', 'ลาป่วย', 'approved', '2026-11-14 13:45:12'),
(4, 17, 'sick', '2026-11-20', '2026-11-21', 'ลาป่วยเนื่องจากเป็นไข้', 'pending', '2026-11-15 22:18:59');

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
  `hn` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `birth_date` date DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `blood_group` enum('O','O-','O+','A','A-','A+','B','B-','B+','AB','AB-','AB+','UNKNOWN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
  `allergies` json DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `emergency_contact` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('patient','doctor','nurse','head_nurse','admin','cashier','finance','pharmacist') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `first_name`, `last_name`, `gender`, `phone_number`, `avatar_url`, `role`, `created_at`, `updated_at`) VALUES
(1, 'dr_lalina', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Lalina', 'Schuett', 'female', '081-111-1111', 'https://i.pinimg.com/1200x/a4/f0/a7/a4f0a7b80e32e85caa40d6d820ae1a9e.jpg', 'doctor', '2026-11-10 13:26:04', '2026-11-15 20:52:03'),
(2, 'nurse_fatima', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Fatima', 'Dechawaleekul', 'female', '082-222-2222', 'https://i.pinimg.com/736x/e9/51/9d/e9519d7113fca956b5efe772f36e5e31.jpg', 'nurse', '2026-11-10 13:26:04', '2026-11-15 20:52:03'),
(3, 'pat_nuttanicha', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Nuttanicha', 'Dungwattanawanich', 'female', '083-333-3333', 'https://i.pinimg.com/1200x/8b/bb/17/8bbb175d7ffd0dccbfa08af0c0705b8e.jpg', 'patient', '2026-11-10 13:26:04', '2026-11-15 20:51:19'),
(4, 'pat_tontawan', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Tontawan', 'Tantivejakul', 'female', '084-444-4444', 'https://i.pinimg.com/736x/c3/19/e0/c319e09ce5b6bf122f01fc529549cb66.jpg', 'patient', '2026-11-10 13:26:04', '2026-11-15 20:51:19'),
(5, 'pat_natsha', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Natsha', 'Techamongklapiwat', 'female', '085-555-5551', 'https://i.pinimg.com/736x/84/93/75/849375f4c7365d908321580eecdcd7d0.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-16 07:15:55'),
(6, 'pat_saralee', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Saralee', 'Prasitdumrong', 'female', '085-555-5552', 'https://i.pinimg.com/736x/13/58/eb/1358eb5e3d052d991839d2fb8909c737.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(7, 'pat_eisaya', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Eisaya', 'Hosuwan', 'female', '085-555-5553', 'https://i.pinimg.com/736x/ff/1a/af/ff1aaff504a59613f806654e58f5ac46.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(8, 'pat_sirilak', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Sirilak', 'Kwong', 'female', '085-555-5554', 'https://i.pinimg.com/736x/c2/28/19/c22819b9af9f0bd2d2ea7b70f3e20700.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(9, 'pat_kornnaphat', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Kornnaphat', 'Sethratanapong', 'female', '085-555-5555', 'https://i.pinimg.com/736x/af/7d/6f/af7d6f7caa621b719bc9774e1904e822.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(10, 'pat_ranchrawee', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Ranchrawee', 'Uakoolwarawat', 'female', '085-555-5556', 'https://i.pinimg.com/736x/e6/19/e7/e619e710ab8c585838ba36cb6113d85d.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(11, 'pat_yeena', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Yeena', 'Salas', 'female', '085-555-5557', 'https://i.pinimg.com/736x/aa/fc/bd/aafcbd406e808533d374dcf63993b090.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(12, 'pat_punpreedee', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Punpreedee', 'Khumprom Rodsaward', 'female', '085-555-5558', 'https://i.pinimg.com/1200x/58/a4/e0/58a4e02df2a81b7d3faeeb6509b08b7e.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(13, 'dr_noppakao', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Noppakao', 'Dechaphatthanakun', 'male', '086-666-6661', 'https://i.pinimg.com/1200x/0d/44/b5/0d44b5aca1dc76e52abc8e398c779833.jpg', 'doctor', '2026-11-16 03:09:00', '2026-11-15 22:00:07'),
(14, 'pat_kanawut', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Kanawut', 'Traipipattanapong', 'male', '086-666-6662', 'https://i.pinimg.com/1200x/86/d3/4f/86d34fbd0dd0877a785769d98d19bfe3.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(15, 'pat_panitan', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Panitan', 'Budkaew', 'male', '086-666-6663', 'https://i.pinimg.com/736x/68/0a/fa/680afa5a4edddf37c1cde15bf22d753c.jpg', 'patient', '2026-11-16 03:09:00', '2026-11-15 20:51:19'),
(16, 'dr_kajbhunditt', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Kajbhunditt', 'Jaidee', 'male', '086-666-6664', 'https://i.pinimg.com/736x/83/42/23/834223a6fd4ab3ffab269f4c23d10307.jpg', 'doctor', '2026-11-16 03:09:00', '2026-11-15 22:00:07'),
(17, 'nurse_suchada', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Suchada', 'Sonpan', 'female', '062-345-6789', 'https://i.pinimg.com/1200x/4d/31/18/4d3118a61ebc2058019d44fcb75b3b87.jpg', 'nurse', '2026-11-15 22:12:34', '2026-11-16 07:22:09'),
(18, 'nurse_thitiya', '$2b$10$SncvReriyCS8vQnOT4zxeury6dz4cKOk6BQLgHFYfn/JiyJF1NObC', 'Thitiya', 'Jirapornsilp', 'female', '081-234-5678', 'https://i.pinimg.com/736x/e1/22/56/e12256219221dffc353734fe4e7d1a70.jpg', 'head_nurse', '2026-11-16 07:21:47', '2026-11-16 07:24:32'),
(19, 'pat_chanikarn', '$2b$10$bUyt5BPWg0A5.1yIC06msOMOA.756cx3KJDV7UNygZftXj45axF12', 'Chanikarn', 'Tangkabodee', 'female', '091-112-2334', 'https://i.pinimg.com/736x/a6/fe/d4/a6fed451a57624b25595e8bdb4026eaa.jpg', 'patient', '2026-11-19 18:35:13', '2026-11-19 18:35:13');

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
-- Indexes for table `booking`
--
ALTER TABLE `booking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `created_by_nurse_id` (`created_by_nurse_id`);

--
-- Indexes for table `home_visits`
--
ALTER TABLE `home_visits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lead_doctor_id` (`lead_doctor_id`);

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
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `medical_records`
--
ALTER TABLE `medical_records`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_info`
--
ALTER TABLE `patient_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `treatment_records`
--
ALTER TABLE `treatment_records`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `booking_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `booking_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `booking_ibfk_3` FOREIGN KEY (`created_by_nurse_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `home_visits`
--
ALTER TABLE `home_visits`
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
-- Constraints for table `treatment_records`
--
ALTER TABLE `treatment_records`
  ADD CONSTRAINT `treatment_records_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patient_info` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `treatment_records_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `treatment_records_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
