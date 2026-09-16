-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: nexus_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `collaboration_requests`
--

DROP TABLE IF EXISTS `collaboration_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `collaboration_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','accepted','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_project_sender` (`project_id`,`sender_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `collaboration_requests_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaboration_requests_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collaboration_requests`
--

LOCK TABLES `collaboration_requests` WRITE;
/*!40000 ALTER TABLE `collaboration_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collaborations`
--

DROP TABLE IF EXISTS `collaborations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `collaborations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending_admin','approved','rejected') DEFAULT 'pending_admin',
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `admin_response` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_request` (`project_id`,`sender_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `collaborations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaborations_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collaborations`
--

LOCK TABLES `collaborations` WRITE;
/*!40000 ALTER TABLE `collaborations` DISABLE KEYS */;
INSERT INTO `collaborations` VALUES (25,27,12,'Your project is superb i want to collaborate with you.','approved',4,'2026-09-10 19:11:19','2026-09-10 19:10:52',''),(26,26,12,'aaa','approved',4,'2026-09-13 08:32:33','2026-09-13 08:32:12',''),(27,27,11,'aaa','approved',4,'2026-09-13 08:34:33','2026-09-13 08:34:18',''),(28,24,12,'q','approved',4,'2026-09-13 09:36:56','2026-09-13 09:36:21',''),(29,25,12,'aqwaz','approved',4,'2026-09-13 09:48:21','2026-09-13 09:48:09',''),(30,22,12,'aa','approved',4,'2026-09-13 10:39:05','2026-09-13 10:38:55',''),(31,16,12,'collaboradtion\n','pending_admin',NULL,NULL,'2026-09-14 11:01:17',NULL),(32,20,12,'i want to collab','approved',4,'2026-09-15 07:30:20','2026-09-15 07:29:45','');
/*!40000 ALTER TABLE `collaborations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (45,12,17,25,'ht',0,'2026-09-13 10:05:47'),(46,12,17,25,'gf',0,'2026-09-13 10:05:55'),(47,17,12,25,'f',0,'2026-09-13 10:19:36'),(48,12,17,25,'w',0,'2026-09-13 10:20:31'),(49,12,17,25,'w',0,'2026-09-13 10:20:57'),(50,12,17,25,'w',0,'2026-09-13 10:21:11'),(51,12,17,25,'q',0,'2026-09-13 10:21:17'),(52,12,17,25,'e',0,'2026-09-13 10:37:44'),(53,12,17,25,'qaz',0,'2026-09-13 10:37:54'),(54,17,12,25,'okay buddy',0,'2026-09-13 10:38:17'),(55,17,12,25,'hello',0,'2026-09-13 10:38:22'),(56,12,17,22,'heyy',0,'2026-09-13 10:39:27'),(57,17,12,22,'hey',0,'2026-09-13 10:39:44'),(58,17,12,22,'hi',0,'2026-09-13 11:15:45'),(59,17,12,25,'okay',0,'2026-09-13 11:15:56'),(60,12,17,25,'e',0,'2026-09-14 15:41:50'),(61,17,12,25,'hello',0,'2026-09-14 15:51:26'),(62,12,17,25,'i need to collb',0,'2026-09-14 18:14:23'),(63,17,12,22,'Assalam o alaikum',0,'2026-09-14 18:25:34'),(64,12,17,20,'hi i want to collab',0,'2026-09-15 07:30:50');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` varchar(255) NOT NULL,
  `type` varchar(50) DEFAULT 'collaboration',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,13,'Your collaboration request for project \"OpenGrid\" has been APPROVED by Admin.','collaboration',0,'2026-09-05 05:23:52'),(2,13,'Your collaboration request for project \"rrr\" was DISMISSED by Admin.','collaboration',0,'2026-09-05 05:25:59'),(3,13,'Your collaboration request for project \"err\" has been APPROVED by Admin.','collaboration',0,'2026-09-05 05:26:01'),(4,13,'Your collaboration request for project \"abcdef\" has been APPROVED by Admin. Admin Note: ok','collaboration',0,'2026-09-05 05:50:59'),(5,13,'Your collaboration request for project \"abcde\" was DISMISSED by Admin. Admin Note: rejected','collaboration',0,'2026-09-05 05:51:10'),(6,13,'Your collaboration request for project \"ddd\" has been APPROVED by Admin.','collaboration',0,'2026-09-05 06:05:56'),(7,13,'Your collaboration request for project \"hdhhdd\" has been APPROVED by Admin. Admin Note: hmmm','collaboration',0,'2026-09-05 06:17:23'),(8,13,'Your collaboration request for project \"eoeueue\" was DISMISSED by Admin. Admin Note: nooo rejected','collaboration',0,'2026-09-05 06:17:31'),(9,17,'Your collaboration request for project \"FarmX\" has been APPROVED by Admin.','collaboration',0,'2026-09-05 06:50:19'),(10,17,'Your collaboration request for project \"z\" was DISMISSED by Admin.','collaboration',0,'2026-09-05 06:50:21'),(11,17,'Your collaboration request for project \"ABCDEF\" has been APPROVED by Admin.','collaboration',0,'2026-09-05 06:50:23'),(12,13,'Your collaboration request for project \"weq\" was DISMISSED by Admin.','collaboration',0,'2026-09-05 06:50:25'),(13,17,'Your collaboration request for project \"yy\" has been APPROVED by Admin. Admin Note: Accepted','collaboration',0,'2026-09-05 09:49:14'),(14,17,'Your collaboration request for project \"err\" has been APPROVED by Admin.','collaboration',0,'2026-09-07 19:16:45'),(15,17,'Your collaboration request for project \"rrr\" was DISMISSED by Admin.','collaboration',0,'2026-09-07 19:24:50'),(16,17,'Your project \"Nexus\" has been APPROVED and is now live on Discover.','project',0,'2026-09-08 12:06:26'),(17,17,'Your project \"Energy\" was REJECTED by Admin.','project',0,'2026-09-09 06:04:13'),(18,17,'Your project \"trysfs\" was REJECTED by Admin.','project',0,'2026-09-09 06:04:17'),(19,17,'Your project \"abcd\" has been APPROVED and is now live on Discover.','project',0,'2026-09-09 06:04:25'),(20,17,'Your project \"ONGRID SYSTEMS\" has been APPROVED and is now live on Discover.','project',0,'2026-09-09 06:28:29'),(21,17,'Your project \"powersupply\" was REJECTED by Admin.','project',0,'2026-09-09 06:28:35'),(22,17,'Your project \"Perfect Solution\" has been APPROVED and is now live on Discover.','project',0,'2026-09-09 06:30:45'),(23,17,'Your project \"onchain management\" was REJECTED by Admin.','project',0,'2026-09-09 12:06:03'),(24,17,'Your project \"LogiRoute — Smart Supply Chain & Fleet Optimization\" was REJECTED by Admin.','project',0,'2026-09-09 12:13:54'),(25,17,'Your project \"CloudShield — Automated Cloud Security & Compliance Guard\" was REJECTED by Admin.','project',0,'2026-09-09 12:14:01'),(26,12,'Your collaboration request for project \"OnChain Ops - Decentrialized Asset & Contract Management\" has been APPROVED by Admin.','collaboration',0,'2026-09-10 19:11:19'),(27,12,'Your collaboration request for project \"OmniSuite - Integrated Enterprise Resource & Finance Hub\" has been APPROVED by Admin.','collaboration',0,'2026-09-13 08:32:33'),(28,11,'Your collaboration request for project \"OnChain Ops - Decentrialized Asset & Contract Management\" has been APPROVED by Admin.','collaboration',0,'2026-09-13 08:34:33'),(29,12,'Your collaboration request for project \"VoltSync - Smart Power Distribution & Load Management\" has been APPROVED by Admin.','collaboration',0,'2026-09-13 09:36:56'),(30,12,'Your collaboration request for project \"OnGrid Solar - Industrial Photovoltaic Management\" has been APPROVED by Admin.','collaboration',0,'2026-09-13 09:48:21'),(31,12,'Your collaboration request for project \"EcoStream - AI-Powered Energy Analytics Platform\" has been APPROVED by Admin.','collaboration',0,'2026-09-13 10:39:05'),(32,17,'Your project \"AgriSmart\" was REJECTED by Admin.','project',0,'2026-09-14 17:55:18'),(33,12,'Your collaboration request for project \"Crown Atelier - Luxury E-Commerce & Retail Suite\" has been APPROVED by Admin.','collaboration',0,'2026-09-15 07:30:20');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `stage` varchar(50) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `looking_for` varchar(255) DEFAULT NULL,
  `match_score` int(11) DEFAULT 90,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `admin_response` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_projects_user` (`user_id`),
  CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (16,17,'AgriSmart - Automated Farm & Yield Management','An IoT-driven agricultural management platform designed to monitor soil moisture, automate irrigation schedules, and track crop health analytics to optimize yield efficiency.','Climate & Energy','AgriTech','MVP','Pakistan','Seed Funding, Technical Co-Founder',90,'[\"Climate & Energy\",\"Prototype\"]','approved',NULL,NULL,NULL,'2026-09-08 08:42:50','2026-09-09 11:56:53'),(17,17,'OpenGrid - Distributed Energy Management System','A smart grid management framework designed to balance microgrid energy distribution, integrate solar inputs, and provide real-time consumption monitoring for urban infrastructure.','Climate & Energy','Renewable Energy','Early Stage','Pakistan','Research Partners, Infrastructure Investment',90,'[\"Climate & Energy\",\"Prototype\"]','approved',NULL,NULL,NULL,'2026-09-08 11:58:01','2026-09-09 11:57:08'),(18,17,'Halalify - AI-Powered Halal Food Discovery Platform','A conversational search platform utilizing semantic retrieval to verify halal product compliance, ingredient lists, and local dining options in real time.','Education','Consumer Tech / AI','MVP','Pakistan','Mentorship, Strategic Partnerships',90,'[\"Education\",\"Prototype\"]','approved',NULL,NULL,NULL,'2026-09-08 12:02:06','2026-09-09 11:57:21'),(19,17,'Project Nexus - Innovation & Collaboration Ecosystem','A centralized platform enabling developers, researchers, and entrepreneurs to showcase projects, secure funding, and find technical co-founders through intelligent matching.','Education','Software & SaaS','Scaling','Pakistan','Product Feedback, Angel Investors',90,'[\"Education\",\"Idea\"]','approved','',4,'2026-09-08 17:06:26','2026-09-08 12:06:03','2026-09-09 11:57:33'),(20,17,'Crown Atelier - Luxury E-Commerce & Retail Suite','A modern full-stack e-commerce architecture featuring dynamic catalog filtering, real-time cart state management, and an interactive admin dashboard for order management.','Health & Wellness','E-Commerce','MVP','Pakistan','Marketing Partners, UI/UX Feedback',90,'[\"Health & Wellness\",\"Idea\"]','approved','',4,'2026-09-09 11:04:25','2026-09-09 05:59:36','2026-09-09 11:57:44'),(21,17,'TrackPulse - Gamified Habit & Productivity Tracker','A cross-platform mobile application featuring interactive habit tracking, streak management algorithms, leaderboards, and customizable focus sessions for optimized daily workflows.','Health & Wellness','Productivity / Mobile App','MVP','Pakistan','User Testing, Mobile UI/UX Feedback',90,'[\"Health & Wellness\",\"Prototype\"]','approved','',4,'2026-09-09 11:04:17','2026-09-09 06:00:24','2026-09-09 11:57:54'),(22,17,'EcoStream - AI-Powered Energy Analytics Platform','An intelligent energy monitoring system that uses predictive modeling to identify efficiency bottlenecks, reduce industrial grid load, and optimize power consumption patterns.','Climate & Energy','CleanTech / Energy','Early Stage','Pakistan','Industrial Pilots, CleanTech Mentorship',90,'[\"Climate & Energy\",\"Prototype\"]','approved','',4,'2026-09-09 11:04:13','2026-09-09 06:02:52','2026-09-09 11:58:05'),(23,17,'GridPulse - Thermal & Solar Power Plant Telemetry','An enterprise operational dashboard for monitoring power generation metrics, thermal efficiency, turbine load balancing, and automated threshold alerts in multi-megawatt facilities.','Education','Energy & Utilities','Early Stage','Pakistan','Facility Testing, Industrial Advisory',90,'[\"Education\",\"MVP\"]','approved',NULL,NULL,NULL,'2026-09-09 06:12:43','2026-09-09 12:03:36'),(24,17,'VoltSync - Smart Power Distribution & Load Management','A decentralized power distribution monitoring system designed to manage low-voltage feeder lines, reduce line losses, and optimize transformer load sharing in suburban grids.','Education','CleanTech / Energy','Early Stage','Pakistan','Engineering Collaboration, Hardware Integration',90,'[\"Education\",\"MVP\"]','approved','',4,'2026-09-09 11:28:35','2026-09-09 06:27:19','2026-09-09 12:03:53'),(25,17,'OnGrid Solar - Industrial Photovoltaic Management','An end-to-end management software for commercial solar installations, enabling real-time inverter telemetry tracking, net-metering synchronization, and performance degradation analytics.','Fintech','Renewable Energy','Scaling','Pakistan','Commercial Pilots, Expansion Capital',90,'[\"Fintech\",\"Early Revenue\"]','approved','',4,'2026-09-09 11:28:29','2026-09-09 06:27:56','2026-09-09 12:04:40'),(26,17,'OmniSuite - Integrated Enterprise Resource & Finance Hub','A unified cloud ERP platform combining automated payroll processing, multi-currency ledger management, supply chain tracking, and real-time financial reporting dashboards.','Education','FinTech / Software','MVP','Pakistan','B2B Sales Partners, Beta Clients',90,'[\"Education\",\"Prototype\"]','approved','',4,'2026-09-09 11:30:45','2026-09-09 06:30:22','2026-09-09 12:04:48'),(27,17,'OnChain Ops - Decentrialized Asset & Contract Management','A multi-chain Web3 management platform engineered for tracking smart contract state transitions, multi-sig wallet authorization flows, and automated treasury balance updates.','Education','Web3 / Blockchain','Early Stage','Global','Blockchain Engineers, Venture Capital',90,'[\"Education\",\"Idea\"]','approved','',4,'2026-09-09 17:06:03','2026-09-09 06:31:58','2026-09-09 12:08:46'),(28,17,'HealthPulse — AI Diagnostics & Patient Telemetry System','An intelligent healthcare analytics framework that aggregates patient vital statistics, predicts potential health risks using machine learning models, and offers real-time diagnostic reporting for clinics.\',\n    \'HealthTech / AI\'','Health & Wellness','Health & Wellness','MVP','pakistan','Clinical Pilots, HealthTech Advisors',90,'[\"Health & Wellness\",\"MVP\"]','pending',NULL,NULL,NULL,'2026-09-09 12:11:30','2026-09-09 12:11:30'),(29,17,'CloudShield — Automated Cloud Security & Compliance Guard','A real-time security posture monitoring engine that scans cloud infrastructure for misconfigurations, enforces compliance policies, and alerts on potential vulnerability exposures.\',\n    \'Cybersecurity','Agriculture','Agriculture','Prototype','Pakistan','Beta Testers, DevSecOps Mentorship',90,'[\"Agriculture\",\"Prototype\"]','rejected','',4,'2026-09-09 17:14:01','2026-09-09 12:12:37','2026-09-09 12:14:01'),(30,17,'LogiRoute — Smart Supply Chain & Fleet Optimization','A real-time route optimization and fleet management platform engineered to reduce fuel consumption, track dispatch telemetry, and optimize last-mile delivery schedules.\',\n    \'Logistics & Supply Chain\',\n    \'Early Stage','Health & Wellness','Health & Wellness','MVP','pakistan','Logistics Partners, Seed Investment',90,'[\"Health & Wellness\",\"MVP\"]','rejected','',4,'2026-09-09 17:13:54','2026-09-09 12:13:29','2026-09-09 12:13:54'),(31,17,'AgriSmart','An ecommerce Application for agricultural Trade.','Agriculture','Agriculture','Prototype','Pakistan','Pakistan',90,'[\"Agriculture\",\"Prototype\"]','rejected','',4,'2026-09-14 22:55:18','2026-09-14 17:54:39','2026-09-14 17:55:18');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_projects`
--

DROP TABLE IF EXISTS `saved_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `saved_projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_saved_project` (`user_id`,`project_id`),
  KEY `fk_saved_project` (`project_id`),
  CONSTRAINT `fk_saved_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_saved_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_projects`
--

LOCK TABLES `saved_projects` WRITE;
/*!40000 ALTER TABLE `saved_projects` DISABLE KEYS */;
INSERT INTO `saved_projects` VALUES (35,17,26,'2026-09-09 12:05:13'),(36,17,27,'2026-09-14 17:52:31');
/*!40000 ALTER TABLE `saved_projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fullName` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Default User','user@nexus.com','$2b$10$MrUSvYdL9uQQBVBmOu.Da.R1gH/3U.xAjYWZrFYVm6ozNXpFdkZ3G','user','2026-08-18 05:45:52'),(4,'System Admin','admin@nexus.com','$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW','admin','2026-08-18 10:45:37'),(5,'muhammad','muhammad@nexus.com','$2b$10$ugg0NZ7yw6OlsPld7q/HDubkC9mD4njKZgygQhJMVSLG2/uTH438e','user','2026-08-19 05:06:21'),(6,'saad','saad@nexus.com','$2b$10$ftpUX1V/oXwhtoHZeO5RGOzrtfzsIK.PxFhHgpmtDspRhdNbD3J.S','user','2026-08-19 05:07:36'),(7,'obama','obama@nexus.com','$2b$10$Ol1GXCd7jcfMJHYTHHJnCuq/QcMnMFSLk8WnkFyNfmzQe8NDz0zAm','user','2026-08-19 05:22:22'),(8,'muhiuddin','muhiuddin@gmail.com','$2b$10$mbn1/tzc9oVLEzy5J7Fz9.0fjrm7Ep8qP3Y7zbkY5K3bMoqwLckpu','user','2026-08-19 19:59:51'),(9,'muhammad','muhammad@gmail.com','$2b$10$UzNwI0H3.b1b50fnkcigo.Psq/1NOPdugMwlWkXGsa0XGDJ3YX3YC','user','2026-08-31 04:46:49'),(10,'Abdullah','abdullah@gmail.com','$2b$10$LsIjvHYRvEvJmQzAuipnV.HLi6nu9VYs0ZrVVjaJ3YRLpkJthaJz6','user','2026-08-31 06:39:16'),(11,'ibrahim','ibrahim@gmail.com','$2b$10$vN.g3wqlKYUd3SuGGPSKhe6QKG0CIWvJVwvkHijK6FRmWRextZZvK','user','2026-08-31 06:40:10'),(12,'user','user@gmail.com','$2b$10$N3Do73PjudFEyMC/fjyqFOGphDIl3exxSOwHTnOhAq/vAR2YmT2km','user','2026-08-31 19:35:06'),(13,'saad','saad@gmail.com','$2b$10$xOkekuGmjacebq6W.IvsoOpV2xoqaAPkfVyt4tfCBp7lVYud600IG','user','2026-09-02 05:39:21'),(14,'awais','awais@gmail.com','$2b$10$h9QFk2uBNvReYzEq7PxlueaZd5BY/pvQNWT2.m2NQncyh.9OWyNrm','user','2026-09-04 06:08:48'),(15,'john','john@gmai.com','$2b$10$eVHt6cNsxS65kA/D2SHiJO6wnQltsunb.MUddNX.4YjnxDeqNM9hG','user','2026-09-04 06:12:25'),(16,'johnab','johnab@gmail.com','$2b$10$AmTnWukIMJnQdEg2OTDN/eMTNaBb3CnejcMKq.oXM4hnB.6AlwkW6','user','2026-09-04 06:13:03'),(17,'awais','muzamil@gmail.com','$2b$10$N5A4bIahm0GFkVQtp0nAT.UbxJQodlISG2nOJagjCVqj4FdIOxcgu','user','2026-09-05 06:25:49');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-16 21:13:51
