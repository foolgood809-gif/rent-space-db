-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 11, 2026 at 02:24 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rent_space`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_logs`
--

CREATE TABLE `admin_logs` (
  `log_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL DEFAULT 1003,
  `admin_name` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `target_type` varchar(50) NOT NULL,
  `target_id` int(11) NOT NULL,
  `details` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_logs`
--

INSERT INTO `admin_logs` (`log_id`, `admin_id`, `admin_name`, `action`, `target_type`, `target_id`, `details`, `created_at`) VALUES
(1, 1003, 'ผู้ดูแลระบบ', 'APPROVE_SPACE', 'space', 2001, 'อนุมัติประกาศ ห้องประชุมสว่างใจ', '2026-11-05 07:46:46'),
(2, 1003, 'ผู้ดูแลระบบ', 'APPROVE_SPACE', 'space', 2002, 'อนุมัติประกาศ The Quiet Nook', '2026-11-05 07:46:46'),
(3, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_PAYMENT_STATUS', 'payment', 1, 'submitted -> verified', '2026-11-11 12:24:06'),
(4, 1003, 'ผู้ดูแลระบบ (Admin)', 'CREATE_AMENITY', 'amenity', 5, 'เพิ่มสิ่งอำนวยความสะดวก: LiteClient Test Amenity', '2026-11-11 12:44:39'),
(5, 1003, 'ผู้ดูแลระบบ (Admin)', 'SET_SPACE_AMENITIES', 'space', 2001, 'amenity_ids=1', '2026-11-11 12:49:53'),
(6, 1003, 'ผู้ดูแลระบบ (Admin)', 'SET_SPACE_AMENITIES', 'space', 2001, 'amenity_ids=1', '2026-11-11 12:51:56'),
(7, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_PAYMENT_STATUS', 'payment', 1, 'verified -> refunded', '2026-11-11 12:54:55'),
(8, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_PAYMENT_STATUS', 'payment', 2, 'submitted -> verified', '2026-11-11 12:57:07'),
(9, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_BOOKING_STATUS', 'booking', 3004, 'pending -> rejected', '2026-11-11 13:08:12'),
(10, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_BOOKING_STATUS', 'booking', 3007, 'pending -> approved', '2026-11-11 13:11:24'),
(11, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_SPACE_STATUS', 'space', 2009, 'pending -> approved', '2026-11-11 13:13:51'),
(12, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_SPACE_STATUS', 'space', 2010, 'pending -> rejected', '2026-11-11 13:14:57'),
(13, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_BOOKING_STATUS', 'booking', 3006, 'approved -> cancelled', '2026-11-11 13:22:45'),
(14, 1003, 'ผู้ดูแลระบบ (Admin)', 'UPDATE_BOOKING_STATUS', 'booking', 3007, 'approved -> cancelled', '2026-11-11 13:22:51');

-- --------------------------------------------------------

--
-- Table structure for table `amenities`
--

CREATE TABLE `amenities` (
  `amenity_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `amenities`
--

INSERT INTO `amenities` (`amenity_id`, `name`, `description`, `icon`, `created_at`) VALUES
(1, 'Wi-Fi', 'อินเทอร์เน็ตไร้สาย', 'wifi', '2026-11-11 11:35:04'),
(2, 'ที่จอดรถ', 'มีพื้นที่จอดรถสำหรับผู้เช่า', 'parking', '2026-11-11 11:35:04'),
(3, 'โปรเจกเตอร์', 'มีโปรเจกเตอร์สำหรับนำเสนอ', 'projector', '2026-11-11 11:35:04'),
(4, 'เครื่องปรับอากาศ', 'มีเครื่องปรับอากาศ', 'ac', '2026-11-11 11:35:04'),
(5, 'LiteClient Test Amenity', 'ทดสอบเพิ่มสิ่งอำนวยความสะดวก', 'wifi', '2026-11-11 12:44:39');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `booking_id` int(11) NOT NULL,
  `space_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled','confirmed','completed') NOT NULL DEFAULT 'pending',
  `is_paid` tinyint(1) NOT NULL DEFAULT 0,
  `payment_ref` varchar(100) DEFAULT NULL,
  `slip_image_url` text DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `review_comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `space_id`, `customer_id`, `start_date`, `end_date`, `start_time`, `end_time`, `total_price`, `status`, `is_paid`, `payment_ref`, `slip_image_url`, `rating`, `review_comment`, `created_at`) VALUES
(3001, 2001, 1002, '2026-11-15', '2026-11-15', '2026-11-15 10:00:00', '2026-11-15 12:00:00', 700.00, 'confirmed', 1, 'SLIP-3001-A', 'http://localhost:3000/uploads/meeting.jpg', 5, 'ห้องดีมาก แอร์เย็น สะอาด', '2026-11-05 07:46:46'),
(3002, 2002, 1002, '2026-11-20', '2026-11-20', '2026-11-20 13:00:00', '2026-11-20 17:00:00', 480.00, 'confirmed', 0, NULL, NULL, NULL, NULL, '2026-11-05 07:46:46'),
(3003, 2005, 1002, '2026-12-10', '2026-12-12', NULL, NULL, NULL, 'cancelled', 0, NULL, NULL, NULL, NULL, '2026-11-05 07:54:23'),
(3004, 2007, 1005, '2026-12-11', '2026-12-12', NULL, NULL, NULL, 'rejected', 0, NULL, NULL, NULL, NULL, '2026-11-05 08:21:29'),
(3006, 2008, 1001, '2026-12-14', '2026-12-15', NULL, NULL, NULL, 'cancelled', 0, NULL, NULL, NULL, NULL, '2026-11-05 08:24:12'),
(3007, 2008, 1002, '2026-12-10', '2026-12-12', NULL, NULL, NULL, 'cancelled', 0, NULL, NULL, NULL, NULL, '2026-11-05 10:37:38');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(40) NOT NULL,
  `status` enum('pending','submitted','verified','rejected','refunded') NOT NULL DEFAULT 'pending',
  `transaction_ref` varchar(100) DEFAULT NULL,
  `slip_image_url` text DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `booking_id`, `amount`, `payment_method`, `status`, `transaction_ref`, `slip_image_url`, `paid_at`, `created_at`, `updated_at`) VALUES
(1, 3004, 800.00, 'bank_transfer', 'refunded', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', '2026-11-11 19:24:06', '2026-11-11 12:19:17', '2026-11-11 12:54:55'),
(2, 3006, 800.00, 'bank_transfer', 'verified', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', '2026-11-11 19:57:07', '2026-11-11 12:30:29', '2026-11-11 12:57:07'),
(3, 3007, 800.00, 'bank_transfer', 'submitted', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', NULL, '2026-11-11 12:30:33', '2026-11-11 12:30:33'),
(4, 3001, 800.00, 'bank_transfer', 'submitted', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', NULL, '2026-11-11 12:31:04', '2026-11-11 12:31:04'),
(5, 3002, 800.00, 'bank_transfer', 'submitted', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', NULL, '2026-11-11 12:31:06', '2026-11-11 12:31:06'),
(6, 3003, 800.00, 'bank_transfer', 'submitted', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', NULL, '2026-11-11 12:31:09', '2026-11-11 12:31:09'),
(7, 3004, 800.00, 'bank_transfer', 'submitted', 'TEST-LC-001', 'http://localhost:3000/test-slip.png', NULL, '2026-11-11 12:54:11', '2026-11-11 12:54:11');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `review_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `review_comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`review_id`, `booking_id`, `rating`, `review_comment`, `created_at`, `updated_at`) VALUES
(1, 3001, 5, 'ทดสอบรีวิวจาก LiteClient', '2026-11-11 12:40:32', '2026-11-11 12:40:32');

-- --------------------------------------------------------

--
-- Table structure for table `spaces`
--

CREATE TABLE `spaces` (
  `space_id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `price_per_day` decimal(10,2) NOT NULL,
  `category` varchar(50) DEFAULT 'meeting_room',
  `capacity` int(11) DEFAULT 10,
  `image_url` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `rating` decimal(3,2) NOT NULL DEFAULT 4.80,
  `rating_count` int(11) NOT NULL DEFAULT 1,
  `status` enum('pending','approved','rejected','hidden') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `spaces`
--

INSERT INTO `spaces` (`space_id`, `owner_id`, `title`, `description`, `location`, `price_per_day`, `category`, `capacity`, `image_url`, `is_active`, `rating`, `rating_count`, `status`, `created_at`) VALUES
(2001, 1001, 'ห้องประชุมสว่างใจ', 'ห้องประชุมพร้อมจอสมาร์ททีวีและอินเทอร์เน็ตความเร็วสูง', '88 ซ.อารีย์ 4 พญาไท กรุงเทพฯ', 350.00, 'meeting_room', 10, 'http://localhost:3000/uploads/meeting.jpg', 1, 4.80, 2, 'approved', '2026-11-05 07:46:46'),
(2002, 1001, 'The Quiet Nook (ห้องอ่านหนังสือ)', 'ห้องอ่านหนังสือเงียบสงบ แสงธรรมชาติ เหมาะสำหรับอ่านหนังสือหรือติวสอบ', '12 ถ.พระราม 4 ปทุมวัน กรุงเทพฯ', 120.00, 'study_room', 4, 'http://localhost:3000/uploads/study.jpg', 1, 4.90, 3, 'approved', '2026-11-05 07:46:46'),
(2005, 1001, 'พื้นที่จัดเวิร์กช็อป', 'พื้นที่อเนกประสงค์สำหรับกิจกรรมกลุ่ม เวิร์กช็อป และสัมมนา', 'เชียงใหม่ นิมมานเหมินท์', 3200.00, 'event_space', 30, 'http://localhost:3000/uploads/meeting.jpg', 1, 4.50, 1, 'pending', '2026-11-05 07:46:46'),
(2007, 1005, 'ห้อง thinkstation', '', 'ch', 800.00, 'meeting_room', 10, NULL, 1, 4.80, 1, 'pending', '2026-11-05 08:19:51'),
(2008, 1001, 'ห้อง nitro', 'on you work.', 'chin', 1500.00, 'meeting_room', 10, NULL, 1, 4.80, 1, 'approved', '2026-11-05 08:23:37');

-- --------------------------------------------------------

--
-- Table structure for table `space_amenities`
--

CREATE TABLE `space_amenities` (
  `space_id` int(11) NOT NULL,
  `amenity_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `space_amenities`
--

INSERT INTO `space_amenities` (`space_id`, `amenity_id`) VALUES
(2001, 1);

-- --------------------------------------------------------

--
-- Table structure for table `space_images`
--

CREATE TABLE `space_images` (
  `image_id` int(11) NOT NULL,
  `space_id` int(11) NOT NULL,
  `image_url` varchar(2048) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT '',
  `password_hash` varchar(255) NOT NULL,
  `role` enum('customer','owner','admin') NOT NULL DEFAULT 'customer',
  `status` enum('active','suspended') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `username`, `email`, `phone`, `password_hash`, `role`, `status`, `created_at`) VALUES
(1001, 'ภูมิ ศรีสุข (Owner)', 'owner01', 'owner01@rentspace.test', '089-876-5432', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'owner', 'active', '2026-11-05 07:46:46'),
(1002, 'ณัฐ วงศ์ดี (Renter)', 'renter01', 'renter01@rentspace.test', '081-234-5678', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'customer', 'active', '2026-11-05 07:46:46'),
(1003, 'ผู้ดูแลระบบ (Admin)', 'admin01', 'admin01@rentspace.test', '02-999-8888', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'admin', 'active', '2026-11-05 07:46:46'),
(1004, 'มินท์ กมลวรรณ', 'mint_k', 'mint@rentspace.test', '082-333-4444', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'customer', 'active', '2026-11-05 07:46:46'),
(1005, 'แพรว ใจงาม', 'owner02', 'owner02@rentspace.test', '086-555-7777', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'owner', 'suspended', '2026-11-05 07:46:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- Indexes for table `amenities`
--
ALTER TABLE `amenities`
  ADD PRIMARY KEY (`amenity_id`),
  ADD UNIQUE KEY `uq_amenities_name` (`name`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `space_id` (`space_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `idx_payments_booking_id` (`booking_id`),
  ADD KEY `idx_payments_status` (`status`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD UNIQUE KEY `uq_reviews_booking_id` (`booking_id`);

--
-- Indexes for table `spaces`
--
ALTER TABLE `spaces`
  ADD PRIMARY KEY (`space_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `space_amenities`
--
ALTER TABLE `space_amenities`
  ADD PRIMARY KEY (`space_id`,`amenity_id`),
  ADD KEY `idx_space_amenities_amenity_id` (`amenity_id`);

--
-- Indexes for table `space_images`
--
ALTER TABLE `space_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `idx_space_images_space_order` (`space_id`,`sort_order`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_logs`
--
ALTER TABLE `admin_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `amenities`
--
ALTER TABLE `amenities`
  MODIFY `amenity_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3009;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `spaces`
--
ALTER TABLE `spaces`
  MODIFY `space_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2011;

--
-- AUTO_INCREMENT for table `space_images`
--
ALTER TABLE `space_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1006;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`),
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON UPDATE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON UPDATE CASCADE;

--
-- Constraints for table `spaces`
--
ALTER TABLE `spaces`
  ADD CONSTRAINT `spaces_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `space_amenities`
--
ALTER TABLE `space_amenities`
  ADD CONSTRAINT `fk_space_amenities_amenity` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`amenity_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_space_amenities_space` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `space_images`
--
ALTER TABLE `space_images`
  ADD CONSTRAINT `fk_space_images_space` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
