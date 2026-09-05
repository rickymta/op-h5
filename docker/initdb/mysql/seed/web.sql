-- SINH TU DONG boi tools/dump-to-seed.py tu dump web.sql cua server cu — DUNG SUA TAY, sua tool roi sinh lai.
-- Schema: 21 bang (giu nguyen). Du lieu giu lai: tichluy(15), timetichluy(1), webshop(9).
-- Placeholder __X__ do docker/initdb/mysql/zz-init.sh dien tu .env khi MySQL khoi tao lan dau.

-- MySQL dump 10.13  Distrib 5.6.50, for Linux (x86_64)
--
-- Host: localhost    Database: web
-- ------------------------------------------------------
-- Server version	5.6.50-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `web`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `web` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `web`;

--
-- Table structure for table `admin_user`
--

DROP TABLE IF EXISTS `admin_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_user` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `bot_tele_gram`
--

DROP TABLE IF EXISTS `bot_tele_gram`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bot_tele_gram` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `chat_id` varchar(255) DEFAULT NULL,
  `name_user` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `card_log`
--

DROP TABLE IF EXISTS `card_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `card_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `task_id` varchar(255) DEFAULT NULL,
  `seri` varchar(255) DEFAULT 'null',
  `pin` varchar(255) DEFAULT 'null',
  `phuongthuc` varchar(255) DEFAULT NULL,
  `menhgia` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `tokenBank` longtext,
  `urlQR` longtext,
  `countDown` varchar(255) DEFAULT NULL,
  `date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reqid` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `cms`
--

DROP TABLE IF EXISTS `cms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `content` longtext,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `diemdanh`
--

DROP TABLE IF EXISTS `diemdanh`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diemdanh` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gift_log`
--

DROP TABLE IF EXISTS `gift_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gift_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `server` varchar(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `giftcode`
--

DROP TABLE IF EXISTS `giftcode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `giftcode` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` longtext,
  `content` longtext,
  `item` longtext,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `knb`
--

DROP TABLE IF EXISTS `knb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knb` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `itemid` int(11) DEFAULT NULL,
  `xutru` int(255) DEFAULT NULL,
  `xushow` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `log_nap`
--

DROP TABLE IF EXISTS `log_nap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log_nap` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `roleId` char(20) DEFAULT NULL,
  `price` char(50) DEFAULT NULL,
  `sid` char(20) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `log_xu`
--

DROP TABLE IF EXISTS `log_xu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log_xu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `nhanvat` varchar(255) DEFAULT NULL,
  `server` varchar(255) DEFAULT NULL,
  `goi` varchar(255) DEFAULT NULL,
  `xu` varchar(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `sellcoin`
--

DROP TABLE IF EXISTS `sellcoin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sellcoin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `srv` varchar(255) DEFAULT NULL,
  `price` int(255) DEFAULT NULL,
  `num` int(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(255) DEFAULT '1' COMMENT '1 là chưa mua, 0 là đã có người mua',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `sellcoin_log`
--

DROP TABLE IF EXISTS `sellcoin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sellcoin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usersell` varchar(255) DEFAULT NULL,
  `userbuy` varchar(255) DEFAULT NULL,
  `rolebuy` varchar(255) DEFAULT NULL,
  `numbuy` varchar(255) DEFAULT NULL,
  `pricebuy` varchar(255) DEFAULT NULL,
  `srvbuy` varchar(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` varchar(255) DEFAULT 'Bán',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `server`
--

DROP TABLE IF EXISTS `server`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `server` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serverName` varchar(255) DEFAULT NULL,
  `serverId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `setting`
--

DROP TABLE IF EXISTS `setting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `setting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `game_code` varchar(255) DEFAULT NULL,
  `game_name` varchar(255) DEFAULT NULL,
  `private_key` varchar(255) DEFAULT NULL,
  `url_call_back` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `tichluy`
--

DROP TABLE IF EXISTS `tichluy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tichluy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `moc` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `item` varchar(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tichluy`
--

LOCK TABLES `tichluy` WRITE;
/*!40000 ALTER TABLE `tichluy` DISABLE KEYS */;
INSERT INTO `tichluy` VALUES (1,'50000','100 Gà quay, 100 Cá chép rồng, 100 Đột Phá Đan, 50M Exp tướng','3:100252:100#3:100253:100#3:100342:100#0:4:50000000','2024-06-13 12:41:22'),(2,'100000','200 Gà quay, 200 Cá chép rồng, 200 Đột Phá Đan, 50M Exp tướng','3:100252:200#3:100253:200#3:100342:200#0:4:50000000','2024-06-13 12:41:24'),(3,'200000','300 Gà quay, 300 Cá chép rồng, 300 Đột Phá Đan, 60M Exp tướng','3:100252:300#3:100253:300#3:100342:300#0:4:60000000','2024-06-27 23:27:59'),(4,'300000','500 Gà quay, 500 Cá chép rồng, 500 Đột Phá Đan, 100M Exp tướng','3:100252:500#3:100253:500#3:100342:500#0:4:100000000','2024-06-27 23:27:13'),(5,'400000','800 Gà quay, 800 Cá chép rồng, 800 Đột Phá Đan, 100M Exp tướng','3:100252:800#3:100253:800#3:100342:800#0:4:100000000','2024-06-27 23:27:13'),(6,'500000','1 Gói tự chọn Anh hùng hiếm 14 sao, 1000 Gà quay, 1000 Cá chép rồng, 1000 Đột Phá Đan, 100M Exp tướng','3:501124:1#3:100252:1000#3:100253:1000#3:100342:1000#0:4:100000000','2024-06-27 23:36:57'),(7,'1000000','2 Gói tự chọn Anh hùng hiếm 14 sao, 100 Đá trang bị đỏ, 100 Đá hiệp khách hộp quà , 1000 Đột phá đan, 1000 Cá chép rồng','3:501124:2#3:100258:100#3:100096:100#3:100342:1000#3:100253:1000','2024-06-27 23:37:44'),(8,'1500000','3 Gói tự chọn Anh hùng hiếm 14 sao, 200 Đá trang bị đỏ, 200 Đá hiệp khách hộp quà , 2000 Đột phá đan, 2000 Cá chép rồng','3:501124:3#3:100258:200#3:100096:200#3:100342:2000#3:100253:2000','2024-06-27 23:37:46'),(9,'2000000','4 Gói tự chọn Anh hùng hiếm 14 sao, 200 Đá trang bị đỏ, 200 Đá hiệp khách hộp quà , 2000 Đột phá đan, 2000 Cá chép rồng','3:501124:4#3:100258:200#3:100096:200#3:100342:2000#3:100253:2000','2024-06-27 23:37:49'),(10,'2500000','5 Gói tự chọn Anh hùng hiếm 14 sao, 300 Đá trang bị đỏ, 300 Đá hiệp khách hộp quà , 3000 Đột phá đan, 3000 Cá chép rồng, 1 Rương Thần Khí đặc biệt tự do','3:501124:5#3:100258:300#3:100096:300#3:100342:3000#3:100253:3000#3:510100:1','2024-06-27 23:37:52'),(11,'3000000','6 Gói tự chọn Anh hùng hiếm 14 sao, 500 Đá trang bị đỏ, 500 Đá hiệp khách hộp quà , 5000 Đột phá đan, 5000 Cá chép rồng, 2 Rương Thần Khí đặc biệt tự do','3:501124:6#3:100258:500#3:100096:500#3:100342:5000#3:100253:5000#3:510100:2','2024-06-27 23:37:56'),(12,'3500000','7 Gói tự chọn Anh hùng hiếm 14 sao, 1200 Đá trang bị đỏ, 1200 Đá hiệp khách hộp quà , 12000 Đột phá đan, 12000 Cá chép rồng, 500M Exp tướng, 2 Rương Thần Khí đặc biệt tự do','3:501124:7#3:100258:1200#3:100096:1200#3:100342:12000#3:100253:12000#0:4:500000000#3:510100:2','2024-06-27 23:37:59'),(13,'4000000','8 Gói tự chọn Anh hùng hiếm 14 sao, 2500 Đá trang bị đỏ, 2500 Đá hiệp khách hộp quà , 25000 Đột phá đan, 25000 Cá chép rồng, 1500M Exp tướng, 3 Rương Thần Khí đặc biệt tự do','3:501124:8#3:100258:2500#3:100096:2500#3:100342:25000#3:100253:25000#0:4:1500000000#3:510100:3','2024-06-27 23:38:02'),(14,'4500000','9 Gói tự chọn Anh hùng hiếm 14 sao, 5000 Đá trang bị đỏ, 5000 Đá hiệp khách hộp quà , 50000 Đột phá đan, 50000 Cá chép rồng, 3000M Exp tướng, 4 Rương Thần Khí đặc biệt tự do','3:501124:9#3:100258:5000#3:100096:5000#3:100342:50000#3:100253:50000#0:4:3000000000#3:510100:4','2024-06-27 23:38:05'),(15,'5000000','10 Gói tự chọn Anh hùng hiếm 14 sao, 10000 Đá trang bị đỏ, 10000 Đá hiệp khách hộp quà , 100000 Đột phá đan, 100000 Cá chép rồng, 5000M Exp tướng, 5 Rương Thần Khí đặc biệt tự do','3:501124:10#3:100258:10000#3:100096:10000#3:100342:100000#3:100253:100000#0:4:5000000000#3:510100:5','2024-06-27 23:38:09');
/*!40000 ALTER TABLE `tichluy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tichluy_log`
--

DROP TABLE IF EXISTS `tichluy_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tichluy_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `moc` varchar(255) DEFAULT NULL,
  `server` varchar(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `timetichluy`
--

DROP TABLE IF EXISTS `timetichluy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `timetichluy` (
  `starttime` datetime DEFAULT NULL,
  `endtime` datetime DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetichluy`
--

LOCK TABLES `timetichluy` WRITE;
/*!40000 ALTER TABLE `timetichluy` DISABLE KEYS */;
INSERT INTO `timetichluy` VALUES ('2024-07-08 00:00:00','2024-09-30 23:59:59','1');
/*!40000 ALTER TABLE `timetichluy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `money` bigint(20) DEFAULT NULL,
  `call_back_url` varchar(255) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `game_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `xu` int(10) DEFAULT '0',
  `ip` varchar(255) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `webshop`
--

DROP TABLE IF EXISTS `webshop`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `webshop` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `item` varchar(255) DEFAULT NULL,
  `price` int(10) DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webshop`
--

LOCK TABLES `webshop` WRITE;
/*!40000 ALTER TABLE `webshop` DISABLE KEYS */;
INSERT INTO `webshop` VALUES (92,'500 vạn KNB','0:1:5000000',1500000,'10004'),(93,'100M EXP Anh Hùng','0:4:100000000',300000,'10002'),(94,'Food 10+ (thăng tinh anh hùng)','3:1000022',150000,'100901'),(95,'Food 9+ (thăng tinh anh hùng)','3:1000016',100000,'100901'),(96,'Thời gian đồng hồ cát','3:100210',100000,'40012'),(97,'Gói Anh hùng tự do','3:500022',20000,'10077'),(98,'Đá trang bị Đỏ','3:100258',1000,'10247'),(99,'Gà quay','3:100252',500,'10353'),(100,'Đột phá đan','3:100342',500,'10539');
/*!40000 ALTER TABLE `webshop` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webshop_log`
--

DROP TABLE IF EXISTS `webshop_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `webshop_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `srv` varchar(255) DEFAULT NULL,
  `item` varchar(255) DEFAULT NULL,
  `num` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Dumping events for database 'web'
--

--
-- Dumping routines for database 'web'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-05  2:41:59
