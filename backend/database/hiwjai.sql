-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db:3306
-- Generation Time: Nov 10, 2026 at 08:51 PM
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
(1, 1, 1, 2, '2026-06-15', '2026-06-15 08:00:00', '2026-06-15 10:00:00', 'cancelled', 'ผู้ป่วยไม่สะดวกจองเอง พยาบาลจัดการให้', '2026-11-10 13:26:04'),
(2, 2, 1, 2, '2026-06-15', '2026-06-15 13:00:00', '2026-06-15 14:00:00', 'scheduled', 'นัดตรวจสุขภาพประจำปี', '2026-11-10 13:26:04'),
(3, 1, 1, 2, '2026-06-20', '2026-06-20 09:00:00', '2026-06-20 10:00:00', 'scheduled', 'พยาบาลทำรายการจองคิวตรวจติดตามอาการ', '2026-11-10 16:10:36');

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
(1, 'ทีมพยาบาลชุมชน A', 1, '2026-06-18', '2026-06-18 09:00:00', '2026-06-18 11:00:00', 'planned');

-- --------------------------------------------------------

--
-- Table structure for table `home_visit_patients`
--

CREATE TABLE `home_visit_patients` (
  `home_visit_id` int NOT NULL,
  `patient_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `home_visit_patients`
--

INSERT INTO `home_visit_patients` (`home_visit_id`, `patient_id`) VALUES
(1, 2);

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
(2, 2, 'annual', '2026-12-25', '2026-12-27', 'ไปเที่ยวปีใหม่', 'approved', '2026-11-10 20:50:39');

-- --------------------------------------------------------

--
-- Table structure for table `patient_info`
--

CREATE TABLE `patient_info` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `hn` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `age` int NOT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `blood_group` enum('A','B','AB','O') COLLATE utf8mb4_unicode_ci NOT NULL,
  `allergies` text COLLATE utf8mb4_unicode_ci,
  `address` text COLLATE utf8mb4_unicode_ci,
  `emergency_contact` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `patient_info`
--

INSERT INTO `patient_info` (`id`, `user_id`, `hn`, `gender`, `age`, `weight`, `height`, `blood_group`, `allergies`, `address`, `emergency_contact`) VALUES
(1, 3, 'HN001', 'male', 45, 70.50, 172.00, 'O', 'แพ้ยาเพนิซิลลิน', '123 ถนนสุขุมวิท กรุงเทพฯ', '081-999-9999'),
(2, 4, 'HN002', 'female', 30, 55.00, 160.00, 'A', 'ไม่มี', '45 ถนนพหลโยธิน กรุงเทพฯ', '089-888-8888');

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
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('patient','doctor','nurse','admin','cashier','finance','pharmacist') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `first_name`, `last_name`, `phone_number`, `role`, `created_at`, `updated_at`) VALUES
(1, 'dr_lalina', 'hashed_password_123', 'Lalina', 'Schuett', '081-111-1111', 'doctor', '2026-11-10 13:26:04', '2026-11-10 13:26:04'),
(2, 'nurse_fatima', 'hashed_password_123', 'Fatima', 'Dechawaleekul', '082-222-2222', 'nurse', '2026-11-10 13:26:04', '2026-11-10 13:26:04'),
(3, 'pat_nuttanicha', 'hashed_password_123', 'Nuttanicha', 'Dungwattanawanich', '083-333-3333', 'patient', '2026-11-10 13:26:04', '2026-11-10 13:26:04'),
(4, 'pat_tontawan', 'hashed_password_123', 'Tontawan', 'Tantivejakul', '084-444-4444', 'patient', '2026-11-10 13:26:04', '2026-11-10 13:26:04');

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
-- Indexes for table `patient_info`
--
ALTER TABLE `patient_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `hn` (`hn`),
  ADD KEY `user_id` (`user_id`);

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `home_visits`
--
ALTER TABLE `home_visits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hospital_activities`
--
ALTER TABLE `hospital_activities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave`
--
ALTER TABLE `leave`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `patient_info`
--
ALTER TABLE `patient_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
