-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db:3306
-- Generation Time: Nov 09, 2026 at 09:34 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `home_visit_patients`
--

CREATE TABLE `home_visit_patients` (
  `home_visit_id` int NOT NULL,
  `patient_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nurse_leave`
--

CREATE TABLE `nurse_leave` (
  `id` int NOT NULL,
  `nurse_id` int NOT NULL,
  `leave_type` enum('sick','personal','maternity','annual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
-- Indexes for dumped tables
--

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
-- Indexes for table `nurse_leave`
--
ALTER TABLE `nurse_leave`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nurse_id` (`nurse_id`);

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
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `home_visits`
--
ALTER TABLE `home_visits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nurse_leave`
--
ALTER TABLE `nurse_leave`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_info`
--
ALTER TABLE `patient_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

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
-- Constraints for table `nurse_leave`
--
ALTER TABLE `nurse_leave`
  ADD CONSTRAINT `nurse_leave_ibfk_1` FOREIGN KEY (`nurse_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_info`
--
ALTER TABLE `patient_info`
  ADD CONSTRAINT `patient_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
