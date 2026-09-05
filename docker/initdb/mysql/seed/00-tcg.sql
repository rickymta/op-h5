-- SINH TU DONG boi tools/dump-to-seed.py tu dump 00-tcg.sql cua server cu — DUNG SUA TAY, sua tool roi sinh lai.
-- Schema: 59 bang (giu nguyen). Du lieu giu lai: app(1), cloud_device(8), cloud_mongo(3), cloud_mq(7), cloud_mysql(6), dynamic_conf(3), srv_cross(1), srv_game(1), srv_game_access(6), srv_group(1), srv_group_device(1), srv_login(1), staff(1), staff_app(2), staff_channel(2), staff_platform(4), staff_role(2), staff_role_game_id(1), staff_role_permission(2), staff_role_srv_group(2).
-- Placeholder __X__ do docker/initdb/mysql/zz-init.sh dien tu .env khi MySQL khoi tao lan dau.

-- MySQL dump 10.13  Distrib 5.6.50, for Linux (x86_64)
--
-- Host: localhost    Database: tcg
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
-- Current Database: `tcg`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `tcg` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `tcg`;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account` (
  `uid` varchar(64) NOT NULL COMMENT '全局唯一ID',
  `username` varchar(100) DEFAULT NULL COMMENT '用户名',
  `password` varchar(32) DEFAULT NULL COMMENT '密码',
  `nickname` varchar(16) DEFAULT NULL COMMENT '昵称',
  `open_id` varchar(100) DEFAULT NULL COMMENT '平台openid',
  `platform_code` varchar(32) DEFAULT NULL COMMENT '平台编码',
  `channel_code` varchar(32) DEFAULT NULL COMMENT '渠道编码',
  `reg_IMEI` varchar(64) DEFAULT NULL COMMENT '注册时的IMEI',
  `IMEI` varchar(64) DEFAULT NULL COMMENT '当前IMEI',
  `balance` double DEFAULT NULL COMMENT '账户余额（元）',
  `sa` tinyint(1) DEFAULT '0' COMMENT '是否是超级账户',
  `last_active_time` timestamp NULL DEFAULT NULL COMMENT '最近活跃时间',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号创建时间',
  `device_code` varchar(100) DEFAULT NULL COMMENT '最近登录的设备码',
  `device_code_type` varchar(16) DEFAULT NULL COMMENT '最近登录的设备码类型',
  PRIMARY KEY (`uid`) USING BTREE,
  UNIQUE KEY `account_UN` (`username`) USING BTREE,
  KEY `account_open_id_IDX` (`open_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `account_master`
--

DROP TABLE IF EXISTS `account_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_master` (
  `account_uid` varchar(64) CHARACTER SET utf8 NOT NULL COMMENT '账号唯一ID',
  `srv_code` varchar(16) CHARACTER SET utf8 NOT NULL COMMENT '游戏区服编码',
  `master_id_hex` varchar(100) CHARACTER SET utf8 NOT NULL COMMENT '主角的唯一ID',
  `master_name` varchar(32) DEFAULT NULL COMMENT '主角名称',
  `master_level` int(11) DEFAULT NULL COMMENT '主角等级',
  `last_active_time` datetime DEFAULT NULL COMMENT '最近活跃时间',
  PRIMARY KEY (`account_uid`,`master_id_hex`) USING BTREE,
  KEY `account_master_account_uid_IDX` (`account_uid`) USING BTREE,
  KEY `account_master_master_id_hex_IDX` (`master_id_hex`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='账号下拥有的主角简单数据';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `account_master_migrate`
--

DROP TABLE IF EXISTS `account_master_migrate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_master_migrate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_uid` varchar(64) CHARACTER SET utf8 NOT NULL COMMENT '账号唯一ID',
  `master_id_hex` varchar(100) CHARACTER SET utf8 NOT NULL COMMENT '主角的唯一ID',
  `master_name` varchar(32) DEFAULT NULL COMMENT '主角名称',
  `master_level` int(11) DEFAULT NULL COMMENT '主角等级',
  `from_srv_code` varchar(16) CHARACTER SET utf8 NOT NULL COMMENT '从哪个游戏服',
  `to_srv_code` varchar(16) CHARACTER SET utf8 NOT NULL COMMENT '迁移到哪个游戏服',
  `merge_id` int(11) DEFAULT NULL COMMENT '隶属于哪次合并操作ID',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='账号角色迁移记录';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `app`
--

DROP TABLE IF EXISTS `app`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL COMMENT '名称',
  `platform_code` varchar(32) DEFAULT NULL COMMENT '平台编码',
  `game_id` varchar(64) DEFAULT NULL,
  `game_key` varchar(64) DEFAULT NULL,
  `secret_key` varchar(100) DEFAULT NULL,
  `client_path` varchar(300) DEFAULT NULL COMMENT '客户端路径',
  `note` varchar(100) DEFAULT NULL,
  `associated_code` varchar(32) DEFAULT NULL COMMENT '关联编码',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏应用配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app`
--

LOCK TABLES `app` WRITE;
/*!40000 ALTER TABLE `app` DISABLE KEYS */;
INSERT INTO `app` VALUES (1,'测试','develop','10091',SUBSTRING(SHA2(CONCAT(RAND(), UUID()), 256), 1, 32),SUBSTRING(SHA2(CONCAT(RAND(), UUID()), 256), 1, 32),NULL,'H5',NULL);
/*!40000 ALTER TABLE `app` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `beta_record`
--

DROP TABLE IF EXISTS `beta_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `beta_record` (
  `open_id` varchar(100) NOT NULL COMMENT '平台OpenID',
  `pay_amount` double DEFAULT NULL COMMENT '封测期间的充值总金额',
  `m1_done` tinyint(1) DEFAULT NULL COMMENT '元宝返还完成',
  `m1_time` timestamp NULL DEFAULT NULL COMMENT '元宝领取时间',
  PRIMARY KEY (`open_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='封测记录表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `cloud_device`
--

DROP TABLE IF EXISTS `cloud_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_device` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) DEFAULT NULL COMMENT '服务器设备编码',
  `name` varchar(16) DEFAULT NULL COMMENT '服务器名',
  `host_WAN` varchar(64) DEFAULT NULL COMMENT '主机外网地址',
  `host_LAN` varchar(64) DEFAULT NULL COMMENT '主机内网地址',
  `host_domain` varchar(64) DEFAULT NULL COMMENT '主机域名',
  `ssh_user` varchar(16) DEFAULT NULL,
  `ssh_password` varchar(32) DEFAULT NULL,
  `ssh_port` int(11) DEFAULT NULL COMMENT 'ssh端口',
  `note` varchar(64) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='云服务器设备';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cloud_device`
--

LOCK TABLES `cloud_device` WRITE;
/*!40000 ALTER TABLE `cloud_device` DISABLE KEYS */;
INSERT INTO `cloud_device` VALUES (1,'d1',NULL,'__PUBLIC_HOST__','127.0.0.1','127.0.0.1','','',22,NULL),(7,'yzxkfs1',NULL,'127.0.0.1','127.0.0.1',NULL,'','',22,NULL),(9,'group',NULL,'127.0.0.1','127.0.0.1',NULL,'','',22,NULL),(10,'cross-mq',NULL,'127.0.0.1','127.0.0.1',NULL,'','',22,NULL),(11,'mysql-yzxdb1',NULL,NULL,'127.0.0.1',NULL,'','',0,NULL),(15,'mongo-yzxdb1',NULL,NULL,'127.0.0.1',NULL,'','',0,NULL),(19,'cross-yzx1',NULL,NULL,'127.0.0.1',NULL,'','',0,NULL),(20,'mongo-group',NULL,NULL,'127.0.0.1',NULL,'','',0,NULL);
/*!40000 ALTER TABLE `cloud_device` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cloud_mongo`
--

DROP TABLE IF EXISTS `cloud_mongo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_mongo` (
  `id` int(11) DEFAULT NULL,
  `code` varchar(48) DEFAULT NULL,
  `conf_mode` tinyint(4) DEFAULT NULL,
  `conf_host` varchar(192) DEFAULT NULL,
  `conf_port` int(11) DEFAULT NULL,
  `conf_username` varchar(48) DEFAULT NULL,
  `conf_password` varchar(192) DEFAULT NULL,
  `conf_source` varchar(48) DEFAULT NULL,
  `conf_database` varchar(96) DEFAULT NULL,
  `conf_url` varchar(900) DEFAULT NULL,
  `note` varchar(300) DEFAULT NULL,
  `conf_url_public` varchar(300) DEFAULT NULL COMMENT '连接url公网',
  `server_code` varchar(32) DEFAULT NULL COMMENT '关联物理服务器编码',
  `conf_host_public` varchar(64) DEFAULT NULL COMMENT '公网host'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cloud_mongo`
--

LOCK TABLES `cloud_mongo` WRITE;
/*!40000 ALTER TABLE `cloud_mongo` DISABLE KEYS */;
INSERT INTO `cloud_mongo` VALUES (1,'mongo-yzxdb1',0,'127.0.0.1',27017,'__MONGO_USER__','__MONGO_PASSWORD__','admin',NULL,NULL,NULL,NULL,'mongo-yzxdb1',NULL),(5,'cross-yzx1',0,'127.0.0.1',27017,'__MONGO_USER__','__MONGO_PASSWORD__','admin',NULL,NULL,NULL,NULL,'cross-yzx1',NULL),(6,'mongo-group',0,'127.0.0.1',27017,'__MONGO_USER__','__MONGO_PASSWORD__','admin',NULL,NULL,NULL,NULL,'mongo-group',NULL);
/*!40000 ALTER TABLE `cloud_mongo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cloud_mq`
--

DROP TABLE IF EXISTS `cloud_mq`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_mq` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) DEFAULT NULL,
  `conf_host` varchar(64) DEFAULT NULL,
  `conf_username` varchar(16) DEFAULT NULL,
  `conf_password` varchar(64) DEFAULT NULL,
  `note` varchar(100) DEFAULT NULL,
  `server_code` varchar(32) DEFAULT NULL COMMENT '关联物理服务器编码',
  `conf_port` int(11) DEFAULT NULL COMMENT '端口',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='云mq服务配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cloud_mq`
--

LOCK TABLES `cloud_mq` WRITE;
/*!40000 ALTER TABLE `cloud_mq` DISABLE KEYS */;
INSERT INTO `cloud_mq` VALUES (1,'yzx-mq1','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'cross-mq',0),(4,'group-mq','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'group',NULL),(5,'yzx-mq2','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'cross-mq',0),(6,'yzx-mq3','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'cross-mq',0),(7,'yzx-mq4','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'cross-mq',0),(8,'yzx-mq5','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'cross-mq',0),(9,'yzx-mq6','127.0.0.1','__RABBITMQ_USER__','__RABBITMQ_PASSWORD__',NULL,'cross-mq',0);
/*!40000 ALTER TABLE `cloud_mq` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cloud_mysql`
--

DROP TABLE IF EXISTS `cloud_mysql`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cloud_mysql` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) DEFAULT NULL,
  `conf_host` varchar(64) DEFAULT NULL,
  `conf_port` int(11) DEFAULT NULL,
  `conf_username` varchar(16) DEFAULT NULL,
  `conf_password` varchar(64) DEFAULT NULL,
  `conf_database` varchar(32) DEFAULT NULL,
  `note` varchar(100) DEFAULT NULL,
  `server_code` varchar(32) DEFAULT NULL COMMENT '关联物理服务器编码',
  `conf_host_public` varchar(64) DEFAULT NULL COMMENT '公网host',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='云mysql服务配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cloud_mysql`
--

LOCK TABLES `cloud_mysql` WRITE;
/*!40000 ALTER TABLE `cloud_mysql` DISABLE KEYS */;
INSERT INTO `cloud_mysql` VALUES (1,'mysql-yzxdb1','127.0.0.1',3306,'root','__MYSQL_ROOT_PASSWORD__',NULL,NULL,'mysql-yzxdb1',NULL),(2,'mysql-yzxdb2','127.0.0.1',3306,'root','__MYSQL_ROOT_PASSWORD__',NULL,NULL,'mysql-yzxdb2',NULL),(3,'mysql-yzxdb3','127.0.0.1',3306,'root','__MYSQL_ROOT_PASSWORD__',NULL,NULL,'mysql-yzxdb3',NULL),(4,'mysql-yzxdb4','127.0.0.1',3306,'root','__MYSQL_ROOT_PASSWORD__',NULL,NULL,'mysql-yzxdb4',NULL),(5,'mysql-yzxdb5','127.0.0.1',3306,'root','__MYSQL_ROOT_PASSWORD__',NULL,NULL,'mysql-yzxdb5',NULL),(6,'mysql-yzxdb6','127.0.0.1',3306,'root','__MYSQL_ROOT_PASSWORD__',NULL,NULL,'mysql-yzxdb6',NULL);
/*!40000 ALTER TABLE `cloud_mysql` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `demo`
--

DROP TABLE IF EXISTS `demo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `demo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `val_double` double DEFAULT NULL,
  `val_int` int(11) DEFAULT NULL,
  `val_float` float DEFAULT NULL,
  `val_boolean` tinyint(1) DEFAULT NULL,
  `val_long` bigint(20) DEFAULT NULL,
  `val_short` smallint(6) DEFAULT NULL,
  `val_byte` tinyint(4) DEFAULT NULL,
  `val_decimal` decimal(16,6) DEFAULT NULL,
  `val_datetime` datetime(3) DEFAULT NULL,
  `val_timestamp` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='演示';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `dynamic_conf`
--

DROP TABLE IF EXISTS `dynamic_conf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dynamic_conf` (
  `key` varchar(100) NOT NULL COMMENT '唯一key',
  `value` varchar(4196) DEFAULT NULL COMMENT 'json 值',
  PRIMARY KEY (`key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='动态配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dynamic_conf`
--

LOCK TABLES `dynamic_conf` WRITE;
/*!40000 ALTER TABLE `dynamic_conf` DISABLE KEYS */;
INSERT INTO `dynamic_conf` VALUES ('openbox','{\"boxMap\":{\"10350\":590018,\"10343\":590018}}'),('pay3m1','10342'),('pf','{\"gameIds\":[\"10350\"]}');
/*!40000 ALTER TABLE `dynamic_conf` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `game_rt`
--

DROP TABLE IF EXISTS `game_rt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `game_rt` (
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `online` int(11) DEFAULT NULL COMMENT '当前在线人数',
  `version` varchar(500) DEFAULT NULL COMMENT '版本信息',
  `role_num` int(11) DEFAULT NULL COMMENT '角色数量',
  `level_max` int(11) DEFAULT NULL COMMENT '角色最高等级',
  `vip_max` int(11) DEFAULT NULL COMMENT 'VIP最高等级',
  `power_max` bigint(20) DEFAULT NULL COMMENT '最高等级',
  `power_avg_50` bigint(20) DEFAULT NULL COMMENT '战力前50均值',
  `world_level` int(11) DEFAULT NULL COMMENT '世界等级',
  `heap_memory_init` bigint(20) DEFAULT NULL COMMENT '堆内存初始化',
  `heap_memory_max` bigint(20) DEFAULT NULL COMMENT '堆内存最大(上限)',
  `heap_memory_used` bigint(20) DEFAULT NULL COMMENT '堆内存当前(已使用)',
  `heap_memory_committed` bigint(20) DEFAULT NULL COMMENT '堆内存提交的内存(已申请)',
  `heap_memory_use_rate` int(11) DEFAULT NULL COMMENT '堆内存使用率',
  `non_heap_memory_init` bigint(20) DEFAULT NULL COMMENT '非堆内存初始化',
  `non_heap_memory_max` bigint(20) DEFAULT NULL COMMENT '非堆内存最大(上限)',
  `non_heap_memory_used` bigint(20) DEFAULT NULL COMMENT '非堆内存当前(已使用)',
  `non_heap_memory_committed` bigint(20) DEFAULT NULL COMMENT '非堆内存提交的内存(已申请)',
  `non_heap_memory_use_rate` int(11) DEFAULT NULL COMMENT '非堆内存使用率',
  `thread_count` int(11) DEFAULT NULL COMMENT '仍活动的线程总数',
  `thread_count_peak` int(11) DEFAULT NULL COMMENT '自从java虚拟机启动或峰值重置以来峰值活动线程计数',
  `thread_count_total_started` bigint(20) DEFAULT NULL COMMENT '线程总数（被创建并执行过的线程总数）',
  `thread_count_daemon` int(11) DEFAULT NULL COMMENT '活动守护线程的当前数目',
  `thread_count_deadlocked` int(11) DEFAULT NULL COMMENT '死锁线程数',
  `batch_cmd_code` int(11) DEFAULT NULL COMMENT '批量命令结果码',
  `batch_cmd_msg` text COMMENT '批量命令结果消息',
  `batch_cmd_time` timestamp NULL DEFAULT NULL COMMENT '批量命令时间',
  PRIMARY KEY (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏实时数据';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_announce`
--

DROP TABLE IF EXISTS `gm_announce`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_announce` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(32) DEFAULT NULL COMMENT '服务器编码',
  `platform_code` varchar(64) DEFAULT NULL COMMENT '平台编码',
  `channel_code` varchar(64) DEFAULT NULL COMMENT '渠道代码',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `title` varchar(100) DEFAULT NULL COMMENT '标题',
  `content` varchar(3000) DEFAULT NULL COMMENT '内容',
  `begin_time` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '结束时间',
  `content2` varchar(3000) DEFAULT NULL COMMENT '内容2',
  `title2` varchar(100) DEFAULT NULL COMMENT '标题2',
  `content3` varchar(3000) DEFAULT NULL COMMENT '内容3',
  `title3` varchar(100) DEFAULT NULL COMMENT '标题3',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='全服公告';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_chat_forbid`
--

DROP TABLE IF EXISTS `gm_chat_forbid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_chat_forbid` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(32) DEFAULT NULL COMMENT '服务器编码',
  `master_id_hex` varchar(64) DEFAULT NULL COMMENT '主角唯一ID',
  `master_name` varchar(32) DEFAULT NULL COMMENT '主角名字',
  `until` bigint(20) DEFAULT NULL COMMENT '禁言时间戳',
  `reason` varchar(64) DEFAULT NULL COMMENT '禁言原因',
  `el_username` varchar(32) DEFAULT NULL COMMENT '执行人用户名',
  `el_nickname` varchar(16) DEFAULT NULL COMMENT '执行人昵称',
  `el_time` datetime DEFAULT NULL COMMENT '执行时间',
  `el_errorcode` int(11) DEFAULT NULL COMMENT '操作结果码',
  `el_errormsg` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_freeze`
--

DROP TABLE IF EXISTS `gm_freeze`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_freeze` (
  `master_id_hex` varchar(64) NOT NULL COMMENT '主角唯一ID',
  `master_mid` int(11) DEFAULT NULL COMMENT '主角mid',
  `master_name` varchar(16) DEFAULT NULL COMMENT '主角名',
  `srv_code` varchar(16) DEFAULT NULL COMMENT '服务器编码',
  `srv_name` varchar(16) DEFAULT NULL COMMENT '服务器名',
  `reason` varchar(100) DEFAULT NULL COMMENT '冻结原因',
  `until` datetime DEFAULT NULL COMMENT '冻结截止日期',
  `el_username` varchar(64) DEFAULT NULL,
  `el_nickname` varchar(16) DEFAULT NULL,
  `el_time` datetime DEFAULT NULL,
  `el_errorcode` int(11) DEFAULT NULL,
  `el_errormsg` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`master_id_hex`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='GM冻结角色';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_lamp`
--

DROP TABLE IF EXISTS `gm_lamp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_lamp` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `game_id` varchar(64) DEFAULT NULL COMMENT '指定GameId才能看到',
  `group_id` int(11) DEFAULT NULL COMMENT '指定服务器组ID',
  `srv_index_beg` int(11) DEFAULT NULL COMMENT '服务器开始序号',
  `srv_index_end` int(11) DEFAULT NULL COMMENT '服务器结束序号',
  `srv_codes` varchar(300) DEFAULT NULL COMMENT '指定游戏服编码列表',
  `content` varchar(300) DEFAULT NULL COMMENT '内容',
  `style` varchar(32) DEFAULT NULL COMMENT '样式类型',
  `begin_time` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '结束时间',
  `interval` bigint(20) DEFAULT NULL COMMENT '间隔时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='GM跑马灯';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_mail_approval`
--

DROP TABLE IF EXISTS `gm_mail_approval`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_mail_approval` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '审核时间',
  `type` tinyint(4) DEFAULT NULL COMMENT '类型',
  `title` varchar(100) DEFAULT NULL COMMENT '邮件标题',
  `content` varchar(255) DEFAULT NULL COMMENT '邮件内容',
  `reward` varchar(255) DEFAULT NULL COMMENT '邮件奖励',
  `operation` int(11) DEFAULT NULL COMMENT '邮件操作原因',
  `status` tinyint(4) DEFAULT NULL COMMENT '邮件状态',
  `submit_username` varchar(255) DEFAULT NULL COMMENT '提交人的昵称',
  `submit_nickname` varchar(255) DEFAULT NULL COMMENT '提交人昵称',
  `submit_time` datetime DEFAULT NULL COMMENT '提交时间',
  `approve_username` varchar(255) DEFAULT NULL COMMENT '审核人的用户名',
  `approve_nickname` varchar(255) DEFAULT NULL COMMENT '审批人昵称',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `invalid_time` datetime DEFAULT NULL COMMENT '失效时间',
  `schedule_time` datetime DEFAULT NULL COMMENT '定时时间',
  `mail_type` tinyint(4) DEFAULT NULL COMMENT '邮件类型',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_mtype_stime` (`mail_type`,`schedule_time`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=435 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_mail_tar`
--

DROP TABLE IF EXISTS `gm_mail_tar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_mail_tar` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `mail_id` int(11) NOT NULL COMMENT '邮件id',
  `type` tinyint(4) NOT NULL COMMENT '邮件类型',
  `srv_code` varchar(16) NOT NULL COMMENT '游戏服编码',
  `master_id_hex` varchar(64) DEFAULT NULL COMMENT '主角唯一ID',
  `name` varchar(255) DEFAULT NULL COMMENT '目标姓名',
  `platform_code` varchar(64) DEFAULT NULL COMMENT '平台编号',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_mail_id` (`mail_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=366 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_notice`
--

DROP TABLE IF EXISTS `gm_notice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_notice` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `type` int(11) DEFAULT NULL COMMENT '通知类型',
  `title` varchar(100) DEFAULT NULL COMMENT '标题',
  `content` varchar(300) DEFAULT NULL COMMENT '内容',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `srv_code` varchar(32) DEFAULT NULL COMMENT '目标服务器编码',
  `el_username` varchar(32) DEFAULT NULL COMMENT '执行人用户名',
  `el_nickname` varchar(16) DEFAULT NULL COMMENT '执行人昵称',
  `el_time` datetime DEFAULT NULL COMMENT '执行时间',
  `el_errorcode` int(11) DEFAULT NULL COMMENT '操作结果码',
  `el_errormsg` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='GM通知表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_rebate_approval`
--

DROP TABLE IF EXISTS `gm_rebate_approval`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_rebate_approval` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `title` varchar(100) NOT NULL COMMENT '邮件标题',
  `content` varchar(2800) DEFAULT NULL COMMENT '邮件内容',
  `submit_username` varchar(255) DEFAULT NULL COMMENT '提交人的昵称',
  `submit_nickname` varchar(255) DEFAULT NULL COMMENT '提交人昵称',
  `submit_time` datetime DEFAULT NULL COMMENT '提交时间',
  `approve_username` varchar(255) DEFAULT NULL COMMENT '审核人的用户名',
  `approve_nickname` varchar(255) DEFAULT NULL COMMENT '审批人昵称',
  `approve_time` datetime DEFAULT NULL COMMENT '审批时间',
  `status` tinyint(4) DEFAULT NULL COMMENT '审核状态',
  `query_date` datetime DEFAULT NULL COMMENT '查询日期',
  `reward_desc` varchar(1000) DEFAULT NULL COMMENT '奖励详情',
  `type` tinyint(4) DEFAULT NULL,
  `reward_id` int(11) DEFAULT NULL COMMENT '奖励id',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `index_status` (`status`) USING BTREE,
  KEY `index_submit_time` (`submit_time`) USING BTREE,
  KEY `idx_type_date_status` (`type`,`query_date`,`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `gm_rebate_tar`
--

DROP TABLE IF EXISTS `gm_rebate_tar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gm_rebate_tar` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `rebate_id` int(11) NOT NULL COMMENT '返利邮件id',
  `srv_code` varchar(16) NOT NULL COMMENT '游戏服编码',
  `master_id_hex` varchar(64) NOT NULL COMMENT '主角唯一ID',
  `name` varchar(255) DEFAULT NULL COMMENT '目标姓名',
  `platform_code` varchar(64) DEFAULT NULL COMMENT '平台编号',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_rebate_id` (`rebate_id`) USING BTREE,
  KEY `idx_master_id_hex` (`master_id_hex`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `merge_map`
--

DROP TABLE IF EXISTS `merge_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `merge_map` (
  `srv_code_origin` varchar(32) NOT NULL COMMENT '原始服务器编码',
  `srv_code_current` varchar(32) DEFAULT NULL COMMENT '当前目标主服务器编码',
  `srv_name_origin` varchar(64) DEFAULT NULL COMMENT '原始服务器名',
  `srv_name_current` varchar(64) DEFAULT NULL COMMENT '当前目标服务器名',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '映射更新时间',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`srv_code_origin`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='合服映射';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `pay_approval`
--

DROP TABLE IF EXISTS `pay_approval`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pay_approval` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `order_type` tinyint(4) DEFAULT NULL COMMENT '订单类型',
  `status` tinyint(4) DEFAULT NULL COMMENT '审核状态 1待审核 2同意 3拒绝',
  `platform_order_id` varchar(100) DEFAULT NULL COMMENT '平台订单号',
  `item_tid` int(11) DEFAULT NULL COMMENT '支付项模板ID',
  `item_count` int(11) DEFAULT NULL COMMENT '支付项数量',
  `item_name` varchar(100) DEFAULT NULL COMMENT '支付项名称',
  `pay_amount` double DEFAULT NULL COMMENT '付款总金额(元)',
  `srv_code` varchar(100) DEFAULT NULL COMMENT '游戏服务器代码',
  `platform_code` varchar(32) DEFAULT NULL COMMENT '平台编码',
  `channel_code` varchar(64) DEFAULT NULL COMMENT '渠道编码',
  `platform_open_id` varchar(100) DEFAULT NULL COMMENT '平台openId',
  `account_uid` varchar(64) DEFAULT NULL COMMENT '主角所属账号的唯一ID',
  `master_id_hex` varchar(64) DEFAULT NULL COMMENT '主角唯一ID',
  `master_name` varchar(16) DEFAULT NULL COMMENT '主角姓名',
  `submit_username` varchar(255) DEFAULT NULL COMMENT '提交人用户名',
  `submit_nickname` varchar(255) DEFAULT NULL COMMENT '提交人昵称',
  `submit_time` datetime DEFAULT NULL COMMENT '提交时间',
  `approve_username` varchar(255) DEFAULT NULL COMMENT '审核人用户名',
  `approve_nickname` varchar(255) DEFAULT NULL COMMENT '审核人昵称',
  `approve_time` datetime DEFAULT NULL COMMENT '审核时间',
  `currency_code` varchar(10) DEFAULT NULL COMMENT '支付币种代码',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_sub_uname` (`submit_username`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `pay_indirect`
--

DROP TABLE IF EXISTS `pay_indirect`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pay_indirect` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(30) DEFAULT NULL COMMENT '类型',
  `platform_order_id` varchar(100) DEFAULT NULL COMMENT '平台订单ID',
  `pay_num_fen` bigint(20) DEFAULT NULL COMMENT '支付金额（分）',
  `pay_time` timestamp NULL DEFAULT NULL COMMENT '支付时间',
  `srv_code` varchar(32) DEFAULT NULL COMMENT '服务器编码',
  `srv_index` int(11) DEFAULT NULL COMMENT '服务器序号',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `channel_code` varchar(32) DEFAULT NULL,
  `platform_open_id` varchar(64) DEFAULT NULL COMMENT '平台OpenID',
  `reward_conf` varchar(200) DEFAULT NULL COMMENT '奖励配置',
  `reward_desc` varchar(500) DEFAULT NULL COMMENT '奖励描述',
  `step` tinyint(4) DEFAULT NULL COMMENT '步骤',
  `other_info` varchar(100) DEFAULT NULL COMMENT '其他信息',
  `error_info` varchar(300) DEFAULT NULL COMMENT '错误信息',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='间接支付';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `pay_record`
--

DROP TABLE IF EXISTS `pay_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pay_record` (
  `uid` varchar(64) CHARACTER SET utf8 NOT NULL COMMENT '唯一ID',
  `order_type` tinyint(4) DEFAULT NULL COMMENT '订单类型',
  `platform_code` varchar(32) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台编码',
  `channel_code` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '渠道编码',
  `platform_order_id` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台订单号',
  `platform_open_id` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台openId',
  `platform_pay_status` varchar(16) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台支付状态',
  `pay_time` datetime DEFAULT NULL COMMENT '支付时间',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `context_str` varchar(1000) CHARACTER SET utf8 DEFAULT NULL COMMENT '订单上下文',
  `step` tinyint(4) DEFAULT NULL COMMENT '步骤',
  `retry_times` int(11) DEFAULT '0' COMMENT '重试次数',
  `note` varchar(1000) CHARACTER SET utf8 DEFAULT NULL COMMENT '一些备注',
  `srv_code` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '游戏服务器代码',
  `item_tid` int(11) DEFAULT NULL COMMENT '支付项模板ID',
  `item_count` int(11) DEFAULT NULL COMMENT '支付项数量',
  `item_name` varchar(100) DEFAULT NULL COMMENT '支付项名称',
  `pay_amount` double DEFAULT NULL COMMENT '付款总金额(元)',
  `account_uid` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '主角所属账号的唯一ID',
  `master_id_hex` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '主角唯一ID',
  `master_name` varchar(16) CHARACTER SET utf8 DEFAULT NULL COMMENT '主角姓名',
  `el_username` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '执行人用户名',
  `el_nickname` varchar(32) CHARACTER SET utf8 DEFAULT NULL COMMENT '执行人昵称',
  `currency_code` varchar(10) CHARACTER SET utf8 DEFAULT NULL COMMENT '支付币种代码',
  `trade_code` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '计费点',
  `plugin` int(11) DEFAULT '0' COMMENT '插件逻辑',
  `plugin_attachment` varchar(1000) CHARACTER SET utf8 DEFAULT NULL COMMENT '插件逻辑附件信息',
  `lang_code` varchar(16) CHARACTER SET utf8 DEFAULT NULL COMMENT '语言编码',
  `activity_extra` int(11) DEFAULT NULL COMMENT '活动额外赠予',
  `game_id` varchar(32) CHARACTER SET utf8 DEFAULT NULL COMMENT 'GameID',
  `item_name_cn` varchar(32) DEFAULT NULL COMMENT '支付项名称(中文)',
  `raw_order_id` varchar(100) DEFAULT NULL COMMENT '原始订单号',
  `third_gift_stone` int(255) DEFAULT NULL,
  `third_ware_count` int(255) DEFAULT NULL,
  PRIMARY KEY (`uid`) USING BTREE,
  KEY `record_platform_order_id_IDX` (`platform_order_id`) USING BTREE,
  KEY `pay_record_pay_time_IDX` (`pay_time`) USING BTREE,
  KEY `pay_record_create_time_IDX` (`create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='充值记录';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `pay_record_beta`
--

DROP TABLE IF EXISTS `pay_record_beta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pay_record_beta` (
  `uid` varchar(64) CHARACTER SET utf8 NOT NULL COMMENT '唯一ID',
  `order_type` tinyint(4) DEFAULT NULL COMMENT '订单类型',
  `platform_code` varchar(32) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台编码',
  `channel_code` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '渠道编码',
  `platform_order_id` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台订单号',
  `platform_open_id` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台openId',
  `platform_pay_status` varchar(16) CHARACTER SET utf8 DEFAULT NULL COMMENT '平台支付状态',
  `pay_time` datetime DEFAULT NULL COMMENT '支付时间',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `context_str` varchar(1000) CHARACTER SET utf8 DEFAULT NULL COMMENT '订单上下文',
  `step` tinyint(4) DEFAULT NULL COMMENT '步骤',
  `retry_times` int(11) DEFAULT '0' COMMENT '重试次数',
  `note` varchar(1000) CHARACTER SET utf8 DEFAULT NULL COMMENT '一些备注',
  `srv_code` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '游戏服务器代码',
  `item_tid` int(11) DEFAULT NULL COMMENT '支付项模板ID',
  `item_count` int(11) DEFAULT NULL COMMENT '支付项数量',
  `item_name` varchar(100) DEFAULT NULL COMMENT '支付项名称',
  `pay_amount` double DEFAULT NULL COMMENT '付款总金额(元)',
  `account_uid` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '主角所属账号的唯一ID',
  `master_id_hex` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '主角唯一ID',
  `master_name` varchar(16) CHARACTER SET utf8 DEFAULT NULL COMMENT '主角姓名',
  `el_username` varchar(64) CHARACTER SET utf8 DEFAULT NULL COMMENT '执行人用户名',
  `el_nickname` varchar(32) CHARACTER SET utf8 DEFAULT NULL COMMENT '执行人昵称',
  `currency_code` varchar(10) CHARACTER SET utf8 DEFAULT NULL COMMENT '支付币种代码',
  `trade_code` varchar(100) CHARACTER SET utf8 DEFAULT NULL COMMENT '计费点',
  `plugin` int(11) DEFAULT '0' COMMENT '插件逻辑',
  `plugin_attachment` varchar(1000) CHARACTER SET utf8 DEFAULT NULL COMMENT '插件逻辑附件信息',
  `lang_code` varchar(16) CHARACTER SET utf8 DEFAULT NULL COMMENT '语言编码',
  `activity_extra` int(11) DEFAULT NULL COMMENT '活动额外赠予',
  `game_id` varchar(32) CHARACTER SET utf8 DEFAULT NULL COMMENT 'GameID',
  `item_name_cn` varchar(32) DEFAULT NULL COMMENT '支付项名称(中文)',
  `raw_order_id` varchar(100) DEFAULT NULL COMMENT '原始订单号',
  PRIMARY KEY (`uid`) USING BTREE,
  KEY `record_platform_order_id_IDX` (`platform_order_id`) USING BTREE,
  KEY `idx_pay_time` (`pay_time`) USING BTREE,
  KEY `idx_srv_code` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='封测充值记录';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `pay_refund`
--

DROP TABLE IF EXISTS `pay_refund`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pay_refund` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `open_id` varchar(100) DEFAULT NULL COMMENT '平台OpenID',
  `srv_code_delete` varchar(64) DEFAULT NULL COMMENT '删档收费区服编码',
  `amount` double DEFAULT NULL COMMENT '充值金额',
  `srv_code_refund` varchar(64) DEFAULT NULL COMMENT '返还区服编码',
  `stat_time` datetime DEFAULT NULL COMMENT '统计时间',
  `refund_time` datetime DEFAULT NULL COMMENT '返还时间',
  `done` tinyint(1) DEFAULT NULL COMMENT '已兑现',
  `master_id_hex` varchar(64) DEFAULT NULL COMMENT '主角唯一ID',
  `master_name` varchar(32) DEFAULT NULL COMMENT '主角名称',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='删档充值返还';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `platform_yzx_param`
--

DROP TABLE IF EXISTS `platform_yzx_param`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `platform_yzx_param` (
  `client_type` int(11) DEFAULT NULL COMMENT '客户端类型',
  `game_id` varchar(100) DEFAULT NULL COMMENT 'GameID',
  `game_key` varchar(100) DEFAULT NULL COMMENT 'GameKey',
  `secret_key` varchar(100) DEFAULT NULL COMMENT 'SecretKey',
  `note` varchar(100) DEFAULT NULL COMMENT '备注'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='平台配置之叶子戏';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `player_imei_record`
--

DROP TABLE IF EXISTS `player_imei_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_imei_record` (
  `IMEI` varchar(64) NOT NULL COMMENT '设备码',
  `first_srv_code` varchar(32) DEFAULT NULL COMMENT '首次创角所在的游戏服编码',
  `first_time` datetime DEFAULT NULL COMMENT '首次记录时间',
  `last_time` datetime DEFAULT NULL COMMENT '最近记录时间',
  `update_times` int(11) DEFAULT NULL COMMENT '该数据更新次数',
  `first_platform_code` varchar(32) DEFAULT NULL COMMENT '首次登陆平台',
  `first_channel_code` varchar(64) DEFAULT NULL COMMENT '首次登陆渠道',
  PRIMARY KEY (`IMEI`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='关于设备码的统计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `player_ip_record`
--

DROP TABLE IF EXISTS `player_ip_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_ip_record` (
  `ip` varchar(64) NOT NULL,
  `first_srv_code` varchar(32) DEFAULT NULL COMMENT '首次创角所在的游戏服编码',
  `first_time` datetime DEFAULT NULL COMMENT '首次记录时间',
  `last_time` datetime DEFAULT NULL COMMENT '最近记录时间',
  `update_times` int(11) DEFAULT NULL COMMENT '该数据更新次数',
  `first_platform_code` varchar(32) DEFAULT NULL COMMENT '首次登陆平台',
  `first_channel_code` varchar(64) DEFAULT NULL COMMENT '首次登陆渠道',
  PRIMARY KEY (`ip`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `role_key_res_num`
--

DROP TABLE IF EXISTS `role_key_res_num`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_key_res_num` (
  `role_id` varchar(64) NOT NULL COMMENT '角色ID',
  `role_name` varchar(64) DEFAULT NULL COMMENT '角色名字',
  `srv_code` varchar(32) DEFAULT NULL COMMENT '游戏服编码',
  `srv_name` varchar(32) DEFAULT NULL COMMENT '游戏服名',
  `srv_index` int(11) DEFAULT NULL COMMENT '游戏服序号',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `i0` int(11) DEFAULT NULL,
  `i1` int(11) DEFAULT NULL,
  `i2` int(11) DEFAULT NULL,
  `i3` int(11) DEFAULT NULL,
  `i4` int(11) DEFAULT NULL,
  `i5` int(11) DEFAULT NULL,
  `i6` int(11) DEFAULT NULL,
  `i7` int(11) DEFAULT NULL,
  `i8` int(11) DEFAULT NULL,
  `i9` int(11) DEFAULT NULL,
  `i10` int(11) DEFAULT NULL,
  `l0` bigint(20) DEFAULT NULL,
  `l1` bigint(20) DEFAULT NULL,
  `l2` bigint(20) DEFAULT NULL,
  `l3` bigint(20) DEFAULT NULL,
  `l4` bigint(20) DEFAULT NULL,
  `l5` bigint(20) DEFAULT NULL,
  `l6` bigint(20) DEFAULT NULL,
  `l7` bigint(20) DEFAULT NULL,
  `l8` bigint(20) DEFAULT NULL,
  `l9` bigint(20) DEFAULT NULL,
  `l10` bigint(20) DEFAULT NULL,
  `l11` bigint(20) DEFAULT NULL,
  `l12` bigint(20) DEFAULT NULL,
  `l13` bigint(20) DEFAULT NULL,
  `l14` bigint(20) DEFAULT NULL,
  `l15` bigint(20) DEFAULT NULL,
  `l16` bigint(20) DEFAULT NULL,
  `l17` bigint(20) DEFAULT NULL,
  `l18` bigint(20) DEFAULT NULL,
  `l19` bigint(20) DEFAULT NULL,
  `l20` bigint(20) DEFAULT NULL,
  `d0` double DEFAULT NULL,
  `d1` double DEFAULT NULL,
  `d2` double DEFAULT NULL,
  `d3` double DEFAULT NULL,
  `d4` double DEFAULT NULL,
  `d5` double DEFAULT NULL,
  `d6` double DEFAULT NULL,
  `d7` double DEFAULT NULL,
  `d8` double DEFAULT NULL,
  `d9` double DEFAULT NULL,
  `d10` double DEFAULT NULL,
  PRIMARY KEY (`role_id`) USING BTREE,
  KEY `role_key_res_num_role_name_IDX` (`role_name`) USING BTREE,
  KEY `role_key_res_num_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='基于角色的关键数量统计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `srv_cross`
--

DROP TABLE IF EXISTS `srv_cross`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_cross` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) DEFAULT NULL COMMENT '跨服编码',
  `leader_srv_code` varchar(16) DEFAULT NULL COMMENT '领导服务器编码',
  `mongo_code` varchar(16) DEFAULT NULL COMMENT 'mongo编码',
  `db_name` varchar(16) DEFAULT NULL COMMENT '跨服数据库名',
  `mq_code` varchar(16) DEFAULT NULL COMMENT 'mq编码',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `url` varchar(100) DEFAULT NULL COMMENT '服务的url',
  `device_code` varchar(16) DEFAULT NULL COMMENT '设备编码',
  `port` int(11) DEFAULT NULL COMMENT 'web端口',
  `jvm_args` varchar(100) DEFAULT NULL COMMENT 'JVM参数',
  `classify` varchar(100) DEFAULT NULL COMMENT '分类',
  `excel_mode` varchar(32) DEFAULT NULL COMMENT 'Excel模式',
  `program_path` varchar(100) DEFAULT NULL COMMENT '程序路径',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `srv_cross_UN` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='跨服配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `srv_cross`
--

LOCK TABLES `srv_cross` WRITE;
/*!40000 ALTER TABLE `srv_cross` DISABLE KEYS */;
INSERT INTO `srv_cross` VALUES (1,'cross-yzx1',NULL,'cross-yzx1','cross-yzx1','yzx-mq1','叶子戏跨服组1','http://127.0.0.1:20001/','yzxkfs1',20001,'-Xms128m -Xmx1128m','官服',NULL,NULL);
/*!40000 ALTER TABLE `srv_cross` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `srv_cross_plan`
--

DROP TABLE IF EXISTS `srv_cross_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_cross_plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(64) DEFAULT NULL COMMENT '游戏服编码',
  `cross_code` varchar(32) DEFAULT NULL COMMENT '跨服编码',
  `change_time` datetime DEFAULT NULL COMMENT '改变时间',
  `changed` tinyint(1) DEFAULT '0' COMMENT '是否已执行过改变',
  `srv_err` varchar(1000) DEFAULT NULL COMMENT '游戏服执行错误信息',
  `cross_err` varchar(1000) DEFAULT NULL COMMENT '跨服执行错误信息',
  `enabled` tinyint(1) DEFAULT '1' COMMENT '是否已执行过改变',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `srv_game`
--

DROP TABLE IF EXISTS `srv_game`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_game` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL COMMENT '区服编码',
  `index` int(11) DEFAULT NULL COMMENT '序号',
  `name` varchar(100) DEFAULT NULL COMMENT '区服名',
  `status` tinyint(4) DEFAULT NULL COMMENT '服务器状态',
  `group_id` int(11) DEFAULT NULL COMMENT '服务器组ID',
  `cross_code` varchar(100) DEFAULT NULL COMMENT '跨服组编码',
  `recommend` tinyint(1) DEFAULT NULL COMMENT '是否推荐',
  `folder` varchar(100) DEFAULT NULL COMMENT '区服归类',
  `open_time` datetime DEFAULT NULL COMMENT '开服时间',
  `platform_code` varchar(64) DEFAULT NULL COMMENT '平台编码',
  `pay_scale` float DEFAULT NULL COMMENT '支付倍数',
  `excel_mode` varchar(100) DEFAULT NULL COMMENT 'Excel模式',
  `device_code` varchar(100) DEFAULT NULL COMMENT '设备编码',
  `mongo_code` varchar(100) DEFAULT NULL COMMENT 'MongoDB编码',
  `mysql_code` varchar(100) DEFAULT NULL COMMENT 'MySQL编码',
  `ws_scheme` varchar(100) DEFAULT NULL,
  `ws_port` int(11) DEFAULT NULL,
  `jvm_args` varchar(100) DEFAULT NULL COMMENT 'JVM启动参数',
  `creator` varchar(100) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `editor` varchar(100) DEFAULT NULL COMMENT '编辑人',
  `edit_time` varchar(100) DEFAULT NULL COMMENT '编辑时间',
  `cross_code_a` varchar(32) DEFAULT NULL COMMENT '切换点之前の跨服编号',
  `cross_code_b` varchar(32) DEFAULT NULL COMMENT '切换点之后の跨服编号',
  `cross_switch_time` datetime DEFAULT NULL COMMENT '跨服切换点',
  `merge_time` datetime DEFAULT NULL COMMENT '合服时间',
  `eaten` tinyint(1) DEFAULT '0' COMMENT '被合服吞并',
  `player_max` int(11) DEFAULT NULL COMMENT '最大玩家数量',
  `game_ver` varchar(32) DEFAULT NULL COMMENT '游戏版本',
  `vip_stat_tar` varchar(16) DEFAULT NULL COMMENT 'VIP统计对象',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `program_path` varchar(100) DEFAULT NULL COMMENT '程序路径',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `srv_game_code_IDX` (`code`) USING BTREE,
  KEY `srv_game_group_id_IDX` (`group_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工与应用关联';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `srv_game`
--

LOCK TABLES `srv_game` WRITE;
/*!40000 ALTER TABLE `srv_game` DISABLE KEYS */;
INSERT INTO `srv_game` VALUES (1,'s1',1,'Server 1',2,1,'cross-yzx1',1,'vohiep',CURDATE(),'develop',1,'release','d1','mongo-yzxdb1','mysql-yzxdb1','ws',8001,'-Xms128m -Xmx1128m','seed',NOW(),NULL,NULL,NULL,NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `srv_game` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `srv_game_access`
--

DROP TABLE IF EXISTS `srv_game_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_game_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(100) DEFAULT NULL COMMENT '游戏服编码',
  `mode` tinyint(1) DEFAULT NULL COMMENT '判断规则模式',
  `platform_limit` tinyint(1) DEFAULT NULL COMMENT '是否平台限定',
  `platform_code` varchar(100) DEFAULT NULL COMMENT '平台编码',
  `channel_limit` tinyint(1) DEFAULT NULL COMMENT '是否渠道限定',
  `channel_code` varchar(200) DEFAULT NULL COMMENT '渠道编码',
  `game_id_limit` tinyint(4) DEFAULT '1' COMMENT '是否GameID限定',
  `game_id` varchar(64) DEFAULT NULL COMMENT 'GameID',
  `ext_limit` tinyint(1) DEFAULT NULL COMMENT '是否扩展限定',
  `ext` varchar(100) DEFAULT NULL COMMENT '扩展',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏服进入规则';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `srv_game_access`
--

LOCK TABLES `srv_game_access` WRITE;
/*!40000 ALTER TABLE `srv_game_access` DISABLE KEYS */;
INSERT INTO `srv_game_access` VALUES (1,'s1',1,0,'develop',0,NULL,0,'10091',0,NULL),(2,'s2',1,0,'develop',0,NULL,0,'10091',0,NULL),(3,'s3',1,0,'develop',0,NULL,0,'10091',0,NULL),(4,'s4',1,0,'develop',0,NULL,0,'10091',0,NULL),(5,'s5',1,0,'develop',0,NULL,0,'10091',0,NULL),(6,'s6',1,0,'develop',0,NULL,0,'10091',0,NULL);
/*!40000 ALTER TABLE `srv_game_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `srv_game_ext`
--

DROP TABLE IF EXISTS `srv_game_ext`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_game_ext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(64) DEFAULT NULL COMMENT '游戏服编码',
  `pay_refund_enabled` tinyint(1) DEFAULT NULL COMMENT '启用删档返代币',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `z10_gift_code` tinyint(1) DEFAULT '0' COMMENT '专10礼包码特性',
  `wx_forbidden_word` tinyint(1) DEFAULT '0' COMMENT '微信屏蔽词接入',
  `raffle_task` tinyint(1) DEFAULT NULL COMMENT '菜菜版做任务抽奖红包',
  `longtu_game_id` varchar(64) DEFAULT NULL COMMENT '龙图gameid',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `srv_game_ext_UN` (`code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏扩展配置';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `srv_game_status`
--

DROP TABLE IF EXISTS `srv_game_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_game_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `game_code` varchar(16) NOT NULL COMMENT '游戏服编码',
  `cross_code_cur` varchar(16) DEFAULT NULL COMMENT '当前所属跨服编码',
  `cross_code_switch` varchar(16) DEFAULT NULL COMMENT '切换跨服编码',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `srv_game_status_game_code_uindex` (`game_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏服状态表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `srv_group`
--

DROP TABLE IF EXISTS `srv_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL COMMENT '组名',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `code` varchar(32) DEFAULT NULL COMMENT '服务器组编码',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏服务器组';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `srv_group`
--

LOCK TABLES `srv_group` WRITE;
/*!40000 ALTER TABLE `srv_group` DISABLE KEYS */;
INSERT INTO `srv_group` VALUES (1,'Vohiep',NULL,'group-offical');
/*!40000 ALTER TABLE `srv_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `srv_group_device`
--

DROP TABLE IF EXISTS `srv_group_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_group_device` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) DEFAULT NULL COMMENT '游戏服组编码',
  `leader_srv_code` varchar(16) DEFAULT NULL COMMENT '领导服务器编码',
  `mongo_code` varchar(16) DEFAULT NULL COMMENT 'mongo编码',
  `db_name` varchar(16) DEFAULT NULL COMMENT '游戏服组数据库名',
  `mq_code` varchar(16) DEFAULT NULL COMMENT 'mq编码',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `url` varchar(100) DEFAULT NULL COMMENT '服务的url',
  `device_code` varchar(16) DEFAULT NULL COMMENT '设备编码',
  `port` int(11) DEFAULT NULL COMMENT 'web端口',
  `jvm_args` varchar(100) DEFAULT NULL COMMENT 'JVM参数',
  `classify` varchar(100) DEFAULT NULL COMMENT '分类',
  `excel_mode` varchar(32) DEFAULT NULL COMMENT 'Excel模式',
  `program_path` varchar(100) DEFAULT NULL COMMENT '程序路径',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_code_uni` (`code`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='游戏服组配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `srv_group_device`
--

LOCK TABLES `srv_group_device` WRITE;
/*!40000 ALTER TABLE `srv_group_device` DISABLE KEYS */;
INSERT INTO `srv_group_device` VALUES (1,'group-offical',NULL,'mongo-group','group-offical','group-mq','官服游戏服组','http://127.0.0.1:30001/','group',30001,'-Xms128m -Xmx1128m',NULL,'release',NULL);
/*!40000 ALTER TABLE `srv_group_device` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `srv_login`
--

DROP TABLE IF EXISTS `srv_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_login` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `np_scheme` varchar(8) DEFAULT NULL COMMENT 'scheme',
  `np_host_WAN` varchar(64) DEFAULT NULL COMMENT '外网地址',
  `np_host_LAN` varchar(64) DEFAULT NULL COMMENT '内网地址',
  `np_host_domain` varchar(64) DEFAULT NULL COMMENT '域名',
  `np_port` int(11) DEFAULT NULL COMMENT '端口',
  `np_ssl` tinyint(1) DEFAULT NULL COMMENT '是否ssl安全',
  `np_enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='登录服务器配置信息';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `srv_login`
--

LOCK TABLES `srv_login` WRITE;
/*!40000 ALTER TABLE `srv_login` DISABLE KEYS */;
INSERT INTO `srv_login` VALUES (1,'http','__PUBLIC_HOST__','127.0.0.1',NULL,9000,0,0,'最新的登录服');
/*!40000 ALTER TABLE `srv_login` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `srv_merge`
--

DROP TABLE IF EXISTS `srv_merge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_merge` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code_origin` varchar(64) DEFAULT NULL COMMENT '原始游戏服编码',
  `srv_code_now` varchar(64) DEFAULT NULL COMMENT '当前游戏服编码',
  `enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  `migrate_game_mongo_times` int(11) DEFAULT NULL COMMENT '游戏服mongo迁移的执行次数',
  `migrate_game_mongo_last` timestamp NULL DEFAULT NULL COMMENT '游戏服mongo迁移的最近一次时间',
  `migrate_game_mongo_log` varchar(2000) DEFAULT NULL COMMENT '游戏服mongo迁移的最近一次日志',
  `migrate_am_times` int(11) DEFAULT NULL COMMENT '账号主角区服迁移的执行次数',
  `migrate_am_last` timestamp NULL DEFAULT NULL COMMENT '账号主角区服迁移的最近一次执行时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='合服配置表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `srv_paid_delete`
--

DROP TABLE IF EXISTS `srv_paid_delete`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_paid_delete` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(64) DEFAULT NULL COMMENT '区服编码',
  `enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='删档收费服配置';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `srv_status_plan`
--

DROP TABLE IF EXISTS `srv_status_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `srv_status_plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(64) DEFAULT NULL COMMENT '区服编码',
  `status` smallint(6) DEFAULT NULL COMMENT '变更状态',
  `change_time` datetime DEFAULT NULL COMMENT '变更时间',
  `changed` tinyint(1) DEFAULT NULL COMMENT '是否已执行过变更',
  `enabled` tinyint(1) DEFAULT NULL COMMENT '是否启用',
  `cancel_recommend_srv_code` varchar(64) DEFAULT NULL COMMENT '要取消推荐的游戏服编码',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='区服状态改变计划';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `username` varchar(32) DEFAULT NULL COMMENT '用户名',
  `password` varchar(64) DEFAULT NULL COMMENT '密码',
  `nickname` varchar(16) DEFAULT NULL COMMENT '昵称',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `admin` tinyint(1) DEFAULT '0' COMMENT '管理员',
  `role_id` int(11) NOT NULL DEFAULT '0' COMMENT '角色ID',
  `dept` varchar(100) DEFAULT NULL COMMENT '隶属部门',
  `company` varchar(100) DEFAULT NULL COMMENT '隶属公司',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES (1,'admin','__CONSOLE_ADMIN_PASSWORD__','超管',NOW(),1,5,NULL,NULL);
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_app`
--

DROP TABLE IF EXISTS `staff_app`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_app` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) DEFAULT NULL,
  `app_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_app`
--

LOCK TABLES `staff_app` WRITE;
/*!40000 ALTER TABLE `staff_app` DISABLE KEYS */;
INSERT INTO `staff_app` VALUES (1,1,1),(2,2,1);
/*!40000 ALTER TABLE `staff_app` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_channel`
--

DROP TABLE IF EXISTS `staff_channel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_channel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) DEFAULT NULL,
  `channel_code` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_channel`
--

LOCK TABLES `staff_channel` WRITE;
/*!40000 ALTER TABLE `staff_channel` DISABLE KEYS */;
INSERT INTO `staff_channel` VALUES (1,1,NULL),(2,2,NULL);
/*!40000 ALTER TABLE `staff_channel` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_platform`
--

DROP TABLE IF EXISTS `staff_platform`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_platform` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) DEFAULT NULL,
  `platform_code` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_platform`
--

LOCK TABLES `staff_platform` WRITE;
/*!40000 ALTER TABLE `staff_platform` DISABLE KEYS */;
INSERT INTO `staff_platform` VALUES (1,1,'develop'),(2,1,'yezixi'),(3,2,'develop'),(4,2,'yezixi');
/*!40000 ALTER TABLE `staff_platform` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_role`
--

DROP TABLE IF EXISTS `staff_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(32) DEFAULT NULL COMMENT '角色名',
  `note` varchar(100) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_role`
--

LOCK TABLES `staff_role` WRITE;
/*!40000 ALTER TABLE `staff_role` DISABLE KEYS */;
INSERT INTO `staff_role` VALUES (5,'超级管理',NULL),(7,'管理员',NULL);
/*!40000 ALTER TABLE `staff_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_role_game_id`
--

DROP TABLE IF EXISTS `staff_role_game_id`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_role_game_id` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL COMMENT '员工角色ID',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工角色所限制的gameId';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_role_game_id`
--

LOCK TABLES `staff_role_game_id` WRITE;
/*!40000 ALTER TABLE `staff_role_game_id` DISABLE KEYS */;
INSERT INTO `staff_role_game_id` VALUES (1,5,'1');
/*!40000 ALTER TABLE `staff_role_game_id` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_role_permission`
--

DROP TABLE IF EXISTS `staff_role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_role_permission` (
  `role_id` int(11) NOT NULL COMMENT '角色ID',
  `p0` tinyint(1) DEFAULT '0',
  `p1` tinyint(1) DEFAULT '0',
  `p2` tinyint(1) DEFAULT '0',
  `p3` tinyint(1) DEFAULT '0',
  `p4` tinyint(1) DEFAULT '0',
  `p5` tinyint(1) DEFAULT '0',
  `p6` tinyint(1) DEFAULT '0',
  `p7` tinyint(1) DEFAULT '0',
  `p8` tinyint(1) DEFAULT '0',
  `p9` tinyint(1) DEFAULT '0',
  `p10` tinyint(1) DEFAULT '0',
  `p11` tinyint(1) DEFAULT '0',
  `p12` tinyint(1) DEFAULT '0',
  `p13` tinyint(1) DEFAULT '0',
  `p14` tinyint(1) DEFAULT '0',
  `p15` tinyint(1) DEFAULT '0',
  `p16` tinyint(1) DEFAULT '0',
  `p17` tinyint(1) DEFAULT '0',
  `p18` tinyint(1) DEFAULT '0',
  `p19` tinyint(1) DEFAULT '0',
  `p20` tinyint(1) DEFAULT '0',
  `admin` tinyint(1) DEFAULT '0',
  `p21` tinyint(1) DEFAULT '0',
  `p22` tinyint(1) DEFAULT '0',
  `p23` tinyint(1) DEFAULT '0',
  `p24` tinyint(1) DEFAULT '0',
  `p25` tinyint(1) DEFAULT '0',
  `p26` tinyint(1) DEFAULT '0',
  `p27` tinyint(1) DEFAULT '0',
  `p28` tinyint(1) DEFAULT '0',
  `p29` tinyint(1) DEFAULT '0',
  `p30` tinyint(1) DEFAULT '0',
  `p31` tinyint(1) DEFAULT '0',
  `p32` tinyint(1) DEFAULT '0',
  `p33` tinyint(1) DEFAULT '0',
  `p34` tinyint(1) DEFAULT '0',
  `p35` tinyint(1) DEFAULT '0',
  `p36` tinyint(1) DEFAULT '0',
  `p37` tinyint(1) DEFAULT '0',
  `p38` tinyint(1) DEFAULT '0',
  `p39` tinyint(1) DEFAULT '0',
  `p40` tinyint(1) DEFAULT '0',
  `p41` tinyint(1) DEFAULT '0',
  `p42` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`role_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工角色权限配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_role_permission`
--

LOCK TABLES `staff_role_permission` WRITE;
/*!40000 ALTER TABLE `staff_role_permission` DISABLE KEYS */;
INSERT INTO `staff_role_permission` VALUES (5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0),(7,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0);
/*!40000 ALTER TABLE `staff_role_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_role_srv`
--

DROP TABLE IF EXISTS `staff_role_srv`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_role_srv` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) DEFAULT NULL COMMENT '角色ID',
  `srv_game_code` varchar(32) DEFAULT NULL COMMENT '游戏服编码',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工角色关联游戏服';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `staff_role_srv_group`
--

DROP TABLE IF EXISTS `staff_role_srv_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_role_srv_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) DEFAULT NULL COMMENT '员工角色ID',
  `srv_group_id` int(11) DEFAULT NULL COMMENT '服务器组ID',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='员工角色与服务器组';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_role_srv_group`
--

LOCK TABLES `staff_role_srv_group` WRITE;
/*!40000 ALTER TABLE `staff_role_srv_group` DISABLE KEYS */;
INSERT INTO `staff_role_srv_group` VALUES (1,5,1),(2,7,1);
/*!40000 ALTER TABLE `staff_role_srv_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stat_sum`
--

DROP TABLE IF EXISTS `stat_sum`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stat_sum` (
  `srv_code` varchar(32) NOT NULL COMMENT '区服编码',
  `srv_name` varchar(32) DEFAULT NULL,
  `date` date NOT NULL COMMENT '日期',
  `update_time` datetime DEFAULT NULL COMMENT '数据更新时间',
  `login_new_create` int(11) DEFAULT NULL COMMENT '登录新增创角',
  `login_new_register` int(11) DEFAULT NULL COMMENT '登录新增注册',
  `login_IMEI` int(11) DEFAULT NULL,
  `login_new_IMEI` int(11) DEFAULT NULL,
  `login_ip` int(11) DEFAULT NULL,
  `login_new_ip` int(11) DEFAULT NULL,
  `login_master` int(11) DEFAULT NULL,
  `login_new_master` int(11) DEFAULT NULL,
  `pay_rmb` double DEFAULT NULL,
  `pay_count` int(11) DEFAULT NULL,
  `pay_count_master` int(11) DEFAULT NULL,
  PRIMARY KEY (`srv_code`,`date`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='每日合计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `supervise_report`
--

DROP TABLE IF EXISTS `supervise_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supervise_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `srv_code` varchar(64) DEFAULT NULL COMMENT '服务器编码',
  `srv_index` int(11) DEFAULT NULL COMMENT '服务器序号',
  `srv_name` varchar(32) DEFAULT NULL COMMENT '服务器名',
  `channel_code` varchar(64) DEFAULT NULL COMMENT '渠道编码',
  `role_create_time` timestamp NULL DEFAULT NULL COMMENT '创角时间',
  `open_id` varchar(64) DEFAULT NULL COMMENT 'OPEN ID',
  `role_id` varchar(64) DEFAULT NULL COMMENT '角色唯一ID',
  `role_name` varchar(32) DEFAULT NULL COMMENT '角色名',
  `role_level` int(11) DEFAULT NULL COMMENT '角色等级',
  `role_vip` int(11) DEFAULT NULL COMMENT '角色VIP',
  `role_power` bigint(20) DEFAULT NULL COMMENT '角色战力',
  `assess_value` double DEFAULT NULL COMMENT '角色估值',
  `m0` bigint(20) DEFAULT NULL COMMENT '金币数量',
  `m1` bigint(20) DEFAULT NULL COMMENT '元宝数量',
  `hero_exp` bigint(20) DEFAULT NULL COMMENT '英雄经验',
  `pay_sum` double DEFAULT NULL COMMENT '累计充值金额(元)',
  `report_time` timestamp NULL DEFAULT NULL COMMENT '上报时间',
  `event` varchar(100) DEFAULT NULL COMMENT '上报事件类型',
  `detail` varchar(500) DEFAULT NULL COMMENT '上报详情',
  `assess_value_delta` double DEFAULT NULL COMMENT '角色估值变化量',
  `pay_sum_delta` double DEFAULT NULL COMMENT '充值变化量',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='监控汇报';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `sys_task`
--

DROP TABLE IF EXISTS `sys_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sys_task` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(32) DEFAULT NULL COMMENT '任务类型',
  `detail` varchar(100) DEFAULT NULL COMMENT '任务详情',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '任务创建时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '任务结束时间',
  `error_code` int(11) DEFAULT NULL COMMENT '错误码',
  `error_msg` varchar(300) DEFAULT NULL COMMENT '错误消息',
  `username` varchar(32) DEFAULT NULL COMMENT '执行操作的用户名',
  `status` varchar(100) DEFAULT NULL COMMENT '任务状态',
  `tag1` varchar(100) DEFAULT NULL COMMENT '标签1',
  `tag2` varchar(100) DEFAULT NULL COMMENT '标签2',
  `tag3` varchar(100) DEFAULT NULL COMMENT '标签3',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `vip_service`
--

DROP TABLE IF EXISTS `vip_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vip_service` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `channel_code` varchar(20) DEFAULT NULL COMMENT '渠道id',
  `main_show` tinyint(1) DEFAULT '1' COMMENT '主界面是否显示',
  `system_show` tinyint(1) DEFAULT '1' COMMENT '系统界面是否显示',
  `money` double DEFAULT '0' COMMENT '金额',
  `contact_content` varchar(255) DEFAULT '' COMMENT '联系信息',
  `page_content` varchar(255) DEFAULT '' COMMENT '页面信息',
  `pic_id` int(11) DEFAULT NULL COMMENT '头像图片id',
  `upsert_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `vip_service_tar`
--

DROP TABLE IF EXISTS `vip_service_tar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vip_service_tar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_id` int(11) DEFAULT NULL COMMENT '关联的主表id',
  `srv_code` varchar(100) DEFAULT NULL COMMENT '游戏服编码',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_code_id` (`srv_code`,`service_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `world_invite_record`
--

DROP TABLE IF EXISTS `world_invite_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `world_invite_record` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform_code` varchar(32) DEFAULT NULL,
  `srv_code` varchar(32) DEFAULT NULL,
  `master_id_hex` varchar(100) DEFAULT NULL,
  `account_uid` varchar(100) DEFAULT NULL,
  `open_id` varchar(100) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='邀请记录';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `wp_code`
--

DROP TABLE IF EXISTS `wp_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wp_code` (
  `id` varchar(255) DEFAULT NULL,
  `key` varchar(255) DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Dumping events for database 'tcg'
--

--
-- Dumping routines for database 'tcg'
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
