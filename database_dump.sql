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
INSERT INTO `collaboration_requests` VALUES (2,1,5,'user@nexus.com','I want to collaborate on your project','accepted','2026-08-22 11:04:41'),(7,6,5,'usamaakhund82@gmail.com','hi','pending','2026-08-25 06:23:33'),(8,2,5,'usamaakhund82@gmail.com','q','pending','2026-08-25 06:23:55'),(9,5,5,'usamaakhund82@gmail.com','qq','pending','2026-08-25 06:24:31'),(10,3,5,'usamaakhundbinance@gmail.com','eteueu','rejected','2026-08-25 06:34:17'),(11,7,5,'usamaakhundbinance@gmail.com','s','pending','2026-08-25 06:58:27'),(12,1,6,'saad@nexus.com','Testing second request on same project','pending','2026-08-25 07:04:30'),(15,8,5,'usamaakhundbinance@gmail.com','Hi','pending','2026-08-27 10:06:45');
/*!40000 ALTER TABLE `collaboration_requests` ENABLE KEYS */;
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_projects_user` (`user_id`),
  CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,1,'weq','dd','Health & Wellness','Health & Wellness','Prototype','df','f',95,'[\"Health & Wellness\",\"Prototype\"]','2026-08-20 09:25:06','2026-08-20 09:25:06'),(2,1,'rrr','fd','Education','Education','Early Revenue','rr','u',95,'[\"Education\",\"Early Revenue\"]','2026-08-20 09:25:52','2026-08-20 09:25:52'),(3,1,'err','efvv','Climate & Energy','Climate & Energy','Prototype','pakistan','ryrur',95,'[\"Climate & Energy\",\"Prototype\"]','2026-08-20 15:29:50','2026-08-20 15:29:50'),(4,1,'abcde','abcdefgh','Education','Education','Idea','china','ersss',95,'[\"Education\",\"Idea\"]','2026-08-20 15:33:25','2026-08-20 15:33:25'),(5,1,'hdhhdd','dhdhdh','Climate & Energy','Climate & Energy','MVP','ddh','dhdh',95,'[\"Climate & Energy\",\"MVP\"]','2026-08-24 11:38:40','2026-08-24 11:38:40'),(6,1,'yy','jjj','Health & Wellness','Health & Wellness','Prototype','oo','uuu',95,'[\"Health & Wellness\",\"Prototype\"]','2026-08-25 04:15:22','2026-08-25 04:15:22'),(7,1,'ddd','www','Health & Wellness','Health & Wellness','Prototype','pak','w',95,'[\"Health & Wellness\",\"Prototype\"]','2026-08-25 06:58:20','2026-08-25 06:58:20'),(8,1,'abcdef','jjsetet','Climate & Energy','Climate & Energy','Prototype','pakistan','duueee',95,'[\"Climate & Energy\",\"Prototype\"]','2026-08-27 10:06:16','2026-08-27 10:06:16'),(9,1,'eoeueue',',,mmsj','Health & Wellness','Health & Wellness','Prototype','ind','ss',95,'[\"Health & Wellness\",\"Prototype\"]','2026-08-27 10:16:07','2026-08-27 10:16:07'),(10,1,'ddhey','ereteye','Education','Education','MVP','aa','q',95,'[\"Education\",\"MVP\"]','2026-08-27 10:16:46','2026-08-27 10:16:46');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_projects`
--

LOCK TABLES `saved_projects` WRITE;
/*!40000 ALTER TABLE `saved_projects` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Default User','user@nexus.com','$2b$10$MrUSvYdL9uQQBVBmOu.Da.R1gH/3U.xAjYWZrFYVm6ozNXpFdkZ3G','user','2026-08-18 05:45:52'),(4,'System Admin','admin@nexus.com','$2b$10$MrUSvYdL9uQQBVBmOu.Da.R1gH/3U.xAjYWZrFYVm6ozNXpFdkZ3G','admin','2026-08-18 10:45:37'),(5,'muhammad','muhammad@nexus.com','$2b$10$ugg0NZ7yw6OlsPld7q/HDubkC9mD4njKZgygQhJMVSLG2/uTH438e','user','2026-08-19 05:06:21'),(6,'saad','saad@nexus.com','$2b$10$ftpUX1V/oXwhtoHZeO5RGOzrtfzsIK.PxFhHgpmtDspRhdNbD3J.S','user','2026-08-19 05:07:36'),(7,'obama','obama@nexus.com','$2b$10$Ol1GXCd7jcfMJHYTHHJnCuq/QcMnMFSLk8WnkFyNfmzQe8NDz0zAm','user','2026-08-19 05:22:22'),(8,'muhiuddin','muhiuddin@gmail.com','$2b$10$mbn1/tzc9oVLEzy5J7Fz9.0fjrm7Ep8qP3Y7zbkY5K3bMoqwLckpu','user','2026-08-19 19:59:51');
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

-- Dump completed on 2026-08-29 17:11:31
