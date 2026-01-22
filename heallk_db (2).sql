-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 21, 2026 at 08:20 AM
-- Server version: 8.3.0
-- PHP Version: 8.2.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `heallk_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `patient_name` varchar(255) NOT NULL,
  `patient_email` varchar(255) DEFAULT NULL,
  `patient_phone` varchar(20) NOT NULL,
  `appointment_date` date DEFAULT NULL,
  `message` text,
  `status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `doctor_id` (`doctor_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blogs`
--

DROP TABLE IF EXISTS `blogs`;
CREATE TABLE IF NOT EXISTS `blogs` (
  `blog_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `image` varchar(500) DEFAULT NULL,
  `summary` varchar(500) DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT '1',
  `views` int DEFAULT '0',
  `likes` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`blog_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_published` (`is_published`),
  KEY `idx_created` (`created_at`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `blogs`
--

INSERT INTO `blogs` (`blog_id`, `user_id`, `title`, `content`, `image`, `summary`, `is_published`, `views`, `likes`, `created_at`, `updated_at`) VALUES
(1, 2, 'b', 'x', 'xx', 'x', 1, 0, 1, '2025-12-02 13:23:20', '2025-12-02 13:24:12'),
(2, 4, 'h', 'j', 'https://www.freepik.com/free-vector/sandalwood-realistic-colored-composition-consisting-bottle-with-oil-bowl-with-powder-tree-branches-vector-illustration_38754067.htm#fromView=keyword&page=1&position=1&uuid=ff769f8f-f2fb-4845-af3e-dbfd52bddc14&query=Ayurveda', 'h', 1, 0, 0, '2025-12-02 13:53:07', '2025-12-02 13:53:07'),
(3, 6, 'skin care', '💚 ආයුර්වේදික සඵලයන් සමඟ නව ජීවිතයකට…\n🌿 ඔබේ සමට පැහැපත්, නෙමමත්, සුමට සෞඛ්‍යමත් රුවක්!\n\nආයුර්වේදය කියන්නේ පරම්පරා ගත වූ ශක්තියක් —\nබෙහෙත් නෙවෙයි, සෞඛ්‍යය පුරුදු කරන ජීවන රහසක්.\nඔබේ සමේ ගැටළු බිඳ හෙලන ස්වභාවික ශක්තිය අප අතරයි.\n\n✨ අපගේ Ayurvedic Skin Care Range ✨\n✔ කලුසුම් ලප අඩු කරයි\n✔ සම තෙතමනය පවත්වා ගනී\n✔ කිරිමඩු, කොහොඹ, වල් අල, වලි උණ්ඩු වැනි ස්වභාවික ද්‍රව්‍ය\n✔ Any Skin Type එකටත් සුදුසුයි\n\n💆‍♀️ සාම්ප්‍රදායික රහස් + නව තාක්ෂණ = ඔබේ සමේ සෞඛ්‍යය\n\n🌸 සමට ආරක්ෂිතයි. පාරිභෝගිකයින්ගෙන් විශ්වාසය ලබාගත් පියවර.\nතවත් kemek ganna epa — prakruthiyen dana sunethra wath samanaya tharama wenasak dannawa!\n\n🪷 ඔබත් අදම සමේ නව චැප්ටරයට join wenna.\n👉 DM us for more details!\n\n\n', '', '💚 ආයුර්වේදික සඵලයන් සමඟ නව ජීවිතයකට…\n🌿 ඔබේ සමට පැහැපත්, නෙමමත්, සුමට සෞඛ්‍යමත් රුවක්!\n\nආයුර්වේදය කියන්නේ පරම්පරා ගත වූ ශක්තියක් —\nබෙහෙත් නෙවෙයි, සෞඛ්‍යය පුරුදු කරන ජීවන රහසක්.\nඔබේ සමේ ගැටළු බිඳ හෙලන ස්වභාවික ශක්තිය අප අතරයි.\n\n✨ අපගේ Ayurvedic Skin Care Range ✨\n✔ කලුසුම් ලප අඩු කරයි\n✔ සම තෙතමනය පවත්වා ගනී\n✔ කිරිමඩු, කොහොඹ, වල් අල, වලි උණ්ඩු වැනි ස්වභාවික ද්‍රව්‍ය\n✔ Any Skin Type එකටත් සුදුසුයි\n\n💆‍♀️ සාම්ප්‍රදායික රහස් + නව තාක්ෂණ = ඔබේ සමේ සෞඛ්‍යය\n\n🌸 සමට ආරක්ෂිතයි. පාරිභෝගිකයින්ගෙන් විශ්වාසය ලබාග', 1, 0, 1, '2025-12-02 16:49:11', '2025-12-02 16:52:36'),
(4, 5, 't', 't', 't', 't', 1, 0, 0, '2025-12-21 16:27:15', '2025-12-21 16:27:15'),
(5, 5, 'kj', 'kkh', '', 'k', 1, 0, 0, '2025-12-21 16:34:11', '2025-12-21 16:34:11');

-- --------------------------------------------------------

--
-- Table structure for table `blog_likes`
--

DROP TABLE IF EXISTS `blog_likes`;
CREATE TABLE IF NOT EXISTS `blog_likes` (
  `like_id` int NOT NULL AUTO_INCREMENT,
  `blog_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`like_id`),
  UNIQUE KEY `unique_blog_user` (`blog_id`,`user_id`),
  UNIQUE KEY `unique_blog_ip` (`blog_id`,`ip_address`),
  KEY `idx_blog_id` (`blog_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clinic_info`
--

DROP TABLE IF EXISTS `clinic_info`;
CREATE TABLE IF NOT EXISTS `clinic_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `clinic_name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `description` text,
  `emergency_contact` varchar(50) DEFAULT NULL,
  `specializations` text,
  `facilities` text,
  `working_hours` text,
  `insurance_accepted` text,
  `images` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `doctor_qualifications`
--

DROP TABLE IF EXISTS `doctor_qualifications`;
CREATE TABLE IF NOT EXISTS `doctor_qualifications` (
  `qualification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `degree_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specialization` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year_completed` year NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `certificate_url` text COLLATE utf8mb4_unicode_ci,
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`qualification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `doctor_reviews`
--

DROP TABLE IF EXISTS `doctor_reviews`;
CREATE TABLE IF NOT EXISTS `doctor_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `reviewer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewer_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating` int NOT NULL,
  `review_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `ingredient` text,
  `wage` decimal(10,2) DEFAULT NULL,
  `description` text,
  `image` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT 'Medicine',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=MyISAM AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qualifications`
--

DROP TABLE IF EXISTS `qualifications`;
CREATE TABLE IF NOT EXISTS `qualifications` (
  `qualification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `degree_name` varchar(255) NOT NULL,
  `institution` varchar(255) NOT NULL,
  `specialization` varchar(255) NOT NULL,
  `year_completed` varchar(10) NOT NULL,
  `description` text,
  `certificate_url` varchar(500) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`qualification_id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE IF NOT EXISTS `reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL DEFAULT '1',
  `user_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  PRIMARY KEY (`review_id`),
  KEY `doctor_id` (`user_id`),
  KEY `idx_rating` (`rating`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_doctor_id` (`doctor_id`)
) ;

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
CREATE TABLE IF NOT EXISTS `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `duration` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(100) NOT NULL,
  `media_urls` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `service_for` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_doctor_id` (`doctor_id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_services_doctor_id` (`doctor_id`),
  KEY `idx_services_category` (`category`),
  KEY `idx_services_is_active` (`is_active`),
  KEY `idx_services_created_at` (`created_at`)
) ENGINE=MyISAM AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_categories`
--

DROP TABLE IF EXISTS `service_categories`;
CREATE TABLE IF NOT EXISTS `service_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('user','doctor','admin') DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_pic` text,
  `cover_photo` text,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'inactive',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
