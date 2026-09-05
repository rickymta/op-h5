-- SINH TU DONG boi tools/dump-to-seed.py tu dump stat.sql cua server cu — DUNG SUA TAY, sua tool roi sinh lai.
-- Schema: 20 bang (giu nguyen). Du lieu giu lai: khong.
-- Placeholder __X__ do docker/initdb/mysql/zz-init.sh dien tu .env khi MySQL khoi tao lan dau.

-- MySQL dump 10.13  Distrib 5.6.50, for Linux (x86_64)
--
-- Host: localhost    Database: stat
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
-- Current Database: `stat`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `stat` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `stat`;

--
-- Table structure for table `briefing_daily`
--

DROP TABLE IF EXISTS `briefing_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `briefing_daily` (
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `srv_index` int(11) DEFAULT NULL COMMENT '游戏服序号',
  `srv_name` varchar(32) DEFAULT NULL COMMENT '游戏服名',
  `game_id` varchar(32) NOT NULL COMMENT 'GameID',
  `app_name` varchar(32) DEFAULT NULL COMMENT '应用名称',
  `date` date NOT NULL COMMENT '日期',
  `pay_num` double DEFAULT NULL COMMENT '充值数额',
  `pay_times` int(11) DEFAULT NULL COMMENT '充值次数',
  `new_role_num` int(11) DEFAULT NULL COMMENT '当日新增创角',
  `new_account_num` int(11) DEFAULT NULL COMMENT '当日新导入账号',
  `new_device_num` int(11) DEFAULT NULL COMMENT '当日新导入设备',
  `new_ip_num` int(11) DEFAULT NULL COMMENT '当日新导入IP',
  `login_role_num` int(11) DEFAULT NULL COMMENT '今日登陆角色数',
  `login_account_num` int(11) DEFAULT NULL COMMENT '今日登陆账号数',
  `login_device_num` int(11) DEFAULT NULL COMMENT '今日登陆设备数',
  `login_ip_num` int(11) DEFAULT NULL COMMENT '今日登陆IP数',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `group_id` int(11) DEFAULT NULL COMMENT '所属服务器组ID',
  `pay_role_num` int(11) DEFAULT NULL COMMENT '支付角色数',
  `pay_account_num` int(11) DEFAULT NULL COMMENT '支付账户数',
  PRIMARY KEY (`srv_code`,`game_id`,`date`) USING BTREE,
  KEY `briefing_daily_srv_code_IDX` (`srv_code`) USING BTREE,
  KEY `briefing_daily_game_id_IDX` (`game_id`) USING BTREE,
  KEY `briefing_daily_date_IDX` (`date`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='每日简报';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `first_login_imei`
--

DROP TABLE IF EXISTS `first_login_imei`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `first_login_imei` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `imei` varchar(64) NOT NULL DEFAULT '' COMMENT '设备号',
  `srv_code` varchar(32) NOT NULL DEFAULT '' COMMENT '服务器编号',
  `login_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_imei` (`imei`) USING BTREE,
  KEY `idx_login_time_srv_code` (`srv_code`,`login_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `first_login_ip`
--

DROP TABLE IF EXISTS `first_login_ip`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `first_login_ip` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip` varchar(32) NOT NULL DEFAULT '' COMMENT 'ip',
  `srv_code` varchar(32) NOT NULL DEFAULT '' COMMENT '服务器编号',
  `login_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_ip` (`ip`) USING BTREE,
  KEY `idx_login_time_srv_code` (`srv_code`,`login_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `hero_lineup`
--

DROP TABLE IF EXISTS `hero_lineup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hero_lineup` (
  `role_id` varchar(64) NOT NULL COMMENT '角色唯一ID',
  `lineup_type` varchar(32) NOT NULL COMMENT '阵容类型',
  `role_level` int(11) DEFAULT NULL COMMENT '角色等级',
  `srv_code` varchar(32) DEFAULT NULL COMMENT '所属服务器编码',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `hero_tid_1` int(11) DEFAULT NULL COMMENT '1号英雄模板ID',
  `hero_lv_1` int(11) DEFAULT NULL COMMENT '1号英雄等级',
  `hero_tid_2` int(11) DEFAULT NULL COMMENT '2号英雄模板ID',
  `hero_lv_2` int(11) DEFAULT NULL COMMENT '2号英雄等级',
  `hero_tid_3` int(11) DEFAULT NULL COMMENT '3号英雄模板ID',
  `hero_lv_3` int(11) DEFAULT NULL COMMENT '3号英雄等级',
  `hero_tid_4` int(11) DEFAULT NULL COMMENT '4号英雄模板ID',
  `hero_lv_4` int(11) DEFAULT NULL COMMENT '4号英雄等级',
  `hero_tid_5` int(11) DEFAULT NULL COMMENT '5号英雄模板ID',
  `hero_lv_5` int(11) DEFAULT NULL COMMENT '5号英雄等级',
  PRIMARY KEY (`role_id`,`lineup_type`) USING BTREE,
  KEY `hero_lineup_update_time_IDX` (`update_time`) USING BTREE,
  KEY `hero_lineup_srv_code_IDX` (`srv_code`) USING BTREE,
  KEY `hero_lineup_role_level_IDX` (`role_level`) USING BTREE,
  KEY `hero_lineup_role_id_IDX` (`role_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='英雄阵容使用情况统计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `hero_record`
--

DROP TABLE IF EXISTS `hero_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hero_record` (
  `srv_code` varchar(32) NOT NULL,
  `srv_index` int(11) DEFAULT NULL,
  `srv_name` varchar(32) DEFAULT NULL,
  `owner_id` varchar(100) DEFAULT NULL,
  `hero_id` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `star` int(11) DEFAULT NULL,
  `hero_tid` int(11) DEFAULT NULL,
  `hero_pid` int(11) DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL,
  KEY `hero_record_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `hero_record_v2`
--

DROP TABLE IF EXISTS `hero_record_v2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hero_record_v2` (
  `uid` varchar(100) NOT NULL COMMENT '英雄唯一ID',
  `tid` int(11) DEFAULT NULL COMMENT '英雄模板ID',
  `pid` int(11) DEFAULT NULL COMMENT '英雄原型ID',
  `name` varchar(32) DEFAULT NULL COMMENT '英雄名称',
  `star` int(11) DEFAULT NULL COMMENT '英雄星级',
  `level` int(11) DEFAULT NULL COMMENT '英雄等级',
  `power` bigint(20) DEFAULT NULL COMMENT '战力',
  `srv_code` varchar(32) DEFAULT NULL COMMENT '所属游戏服编码',
  `role_id` varchar(64) DEFAULT NULL COMMENT '所属角色ID',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `group_id` int(11) DEFAULT NULL COMMENT '所属服务器组',
  `game_id` varchar(32) DEFAULT NULL COMMENT '所属GameID',
  PRIMARY KEY (`uid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT COMMENT='英雄统计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `login_account`
--

DROP TABLE IF EXISTS `login_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_account` (
  `account_uid` varchar(64) NOT NULL COMMENT '账号ID',
  `reg_date` date NOT NULL COMMENT '注册日期',
  `login_date` date DEFAULT NULL COMMENT '登录日期',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `srv_group_id` int(11) DEFAULT NULL COMMENT '所属服务器组ID',
  PRIMARY KEY (`account_uid`,`reg_date`) USING BTREE,
  KEY `login_account_game_id_IDX` (`game_id`) USING BTREE,
  KEY `login_account_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='基于账号的登录表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `login_device`
--

DROP TABLE IF EXISTS `login_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_device` (
  `device_code` varchar(64) NOT NULL COMMENT '设备码',
  `reg_date` date NOT NULL COMMENT '注册日期',
  `login_date` date DEFAULT NULL COMMENT '登录日期',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `srv_group_id` int(11) DEFAULT NULL COMMENT '所属服务器组ID',
  PRIMARY KEY (`device_code`,`reg_date`) USING BTREE,
  KEY `login_device_game_id_IDX` (`game_id`) USING BTREE,
  KEY `login_device_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='基于设备的登录表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `login_flow`
--

DROP TABLE IF EXISTS `login_flow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_flow` (
  `open_id` varchar(64) NOT NULL COMMENT 'OPENID',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  `sdk_login` int(11) DEFAULT '0' COMMENT '叶子戏SDK登录完成次数',
  `meta_start` int(11) DEFAULT '0' COMMENT '请求meta服facade/client/start接口次数',
  `login_account` int(11) DEFAULT '0' COMMENT '请求login服account/login接口次数',
  `login_game_list` int(11) DEFAULT '0' COMMENT '请求login服srv/game/list接口次数',
  `login_connect_target` int(11) DEFAULT '0' COMMENT '向login服请求目标游戏服连接信息次数',
  `client_template` int(11) DEFAULT '0' COMMENT '客户端下载并解析模板表次数',
  `game_ws` int(11) DEFAULT '0' COMMENT '游戏服websocket连接成功次数',
  `game_enter` int(11) DEFAULT '0' COMMENT '进入游戏主界面次数',
  `role_create` int(11) DEFAULT '0' COMMENT '角色创建',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`open_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='登录流程打点';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `login_ip`
--

DROP TABLE IF EXISTS `login_ip`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_ip` (
  `ip` varchar(64) NOT NULL COMMENT 'IP地址',
  `reg_date` date NOT NULL COMMENT '注册日期',
  `login_date` date DEFAULT NULL COMMENT '登录日期',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `srv_group_id` int(11) DEFAULT NULL COMMENT '所属服务器组ID',
  PRIMARY KEY (`ip`,`reg_date`) USING BTREE,
  KEY `login_ip_game_id_IDX` (`game_id`) USING BTREE,
  KEY `login_ip_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='基于IP的登录表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `login_role`
--

DROP TABLE IF EXISTS `login_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_role` (
  `role_id` varchar(64) NOT NULL COMMENT '角色ID',
  `reg_date` date NOT NULL COMMENT '注册日期',
  `login_date` date DEFAULT NULL COMMENT '登录日期',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `srv_group_id` int(11) DEFAULT NULL COMMENT '所属服务器组ID',
  PRIMARY KEY (`role_id`,`reg_date`) USING BTREE,
  KEY `login_role_game_id_IDX` (`game_id`) USING BTREE,
  KEY `login_role_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='基于角色的登录表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `online`
--

DROP TABLE IF EXISTS `online`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `online` (
  `srv_code` varchar(32) DEFAULT NULL COMMENT '游戏服编码',
  `online_num` int(11) DEFAULT NULL COMMENT '在线人数',
  `time` timestamp NULL DEFAULT NULL COMMENT '记录时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT COMMENT='在线统计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `participate`
--

DROP TABLE IF EXISTS `participate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `participate` (
  `srv_code` varchar(64) DEFAULT NULL COMMENT '游戏区服编码',
  `func_id` int(11) DEFAULT NULL COMMENT '功能ID',
  `times` int(11) DEFAULT NULL COMMENT '参与人次',
  `num` int(11) DEFAULT NULL COMMENT '参与人数',
  `begin_time` timestamp NULL DEFAULT NULL COMMENT '记录开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '记录结束时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT COMMENT='游戏功能参与统计';
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
  `third_gift_stone` int(11) DEFAULT NULL,
  `third_ware_count` int(11) DEFAULT NULL,
  PRIMARY KEY (`uid`) USING BTREE,
  KEY `record_platform_order_id_IDX` (`platform_order_id`) USING BTREE,
  KEY `idx_pay_time` (`pay_time`) USING BTREE,
  KEY `idx_srv_code` (`srv_code`) USING BTREE,
  KEY `pay_record_create_time_IDX` (`create_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=COMPACT COMMENT='充值记录';
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
  `group_id` int(11) DEFAULT NULL COMMENT '服务器组ID',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  PRIMARY KEY (`role_id`) USING BTREE,
  KEY `role_key_res_num_role_name_IDX` (`role_name`) USING BTREE,
  KEY `role_key_res_num_srv_code_IDX` (`srv_code`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='基于角色的关键数量统计';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `role_record`
--

DROP TABLE IF EXISTS `role_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_record` (
  `role_id` varchar(100) NOT NULL COMMENT '角色唯一ID',
  `role_name` varchar(100) DEFAULT NULL COMMENT '角色名',
  `srv_code` varchar(32) DEFAULT NULL COMMENT '服务器编码',
  `srv_name` varchar(32) DEFAULT NULL COMMENT '服务器名',
  `srv_index` int(11) DEFAULT NULL COMMENT '服务器序号',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `level` int(11) DEFAULT NULL COMMENT '角色等级',
  `vip_level` int(11) DEFAULT NULL COMMENT 'VIP等级',
  `vip_points` bigint(20) DEFAULT NULL COMMENT 'VIP积分',
  `power` bigint(20) DEFAULT NULL COMMENT '战力',
  `pay_num` double DEFAULT NULL COMMENT '累计充值数额',
  `pay_times` int(11) DEFAULT NULL COMMENT '支付次数',
  `last_login_time` timestamp NULL DEFAULT NULL COMMENT '最近登录时间',
  `platform_code` varchar(32) DEFAULT NULL COMMENT '平台编码',
  `account_uid` varchar(64) DEFAULT NULL COMMENT '账户唯一ID',
  `open_id` varchar(100) DEFAULT NULL COMMENT '平台openID',
  `open_id_raw` varchar(100) DEFAULT NULL COMMENT '原始平台openID',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `game_id_raw` varchar(32) DEFAULT NULL COMMENT '原始GameID',
  `channel_code` varchar(32) DEFAULT NULL COMMENT '渠道编码',
  `m0` bigint(20) DEFAULT NULL COMMENT '数值资源0',
  `m1` bigint(20) DEFAULT NULL COMMENT '数值资源1',
  `m2` bigint(20) DEFAULT NULL COMMENT '数值资源2',
  `m3` bigint(20) DEFAULT NULL COMMENT '数值资源3',
  `m4` bigint(20) DEFAULT NULL COMMENT '数值资源4',
  `guild_id` varchar(64) DEFAULT NULL COMMENT '公会ID',
  `guild_name` varchar(32) DEFAULT NULL COMMENT '公会名称',
  `guild_level` int(11) DEFAULT NULL COMMENT '公会等级',
  `guild_member_num` int(11) DEFAULT NULL COMMENT '公会成员数量',
  `friend_num` int(11) DEFAULT NULL COMMENT '好友数量',
  `mail_num` int(11) DEFAULT NULL COMMENT '邮件数量',
  `assess_value` bigint(20) DEFAULT NULL COMMENT '角色估值',
  `note` varchar(100) DEFAULT NULL COMMENT '开发调试用的备注',
  `ext_str_a` varchar(100) DEFAULT NULL COMMENT '扩展varchar值A',
  `ext_str_b` varchar(100) DEFAULT NULL COMMENT '扩展varchar值B',
  `ext_str_c` varchar(100) DEFAULT NULL COMMENT '扩展varchar值C',
  `ext_text_a` text COMMENT '扩展text值A',
  `ext_int_a` int(11) DEFAULT NULL COMMENT '扩展int值A',
  `ext_long_a` bigint(20) DEFAULT NULL COMMENT '扩展long值A',
  `ext_double_a` double DEFAULT NULL COMMENT '扩展double值B',
  `role_create_time` datetime DEFAULT NULL COMMENT '角色创建时间',
  `account_create_time` datetime DEFAULT NULL COMMENT '账户创建时间',
  `hero_top_level` varchar(200) DEFAULT NULL COMMENT '英雄等级top信息',
  `hero_top_power` varchar(200) DEFAULT NULL COMMENT '英雄战力top信息',
  `beast_level_max` int(11) DEFAULT NULL COMMENT '最高兽灵等级',
  `artifact_type` varchar(32) DEFAULT NULL COMMENT '法宝类型',
  `artifact_level` int(11) DEFAULT NULL COMMENT '法宝等级',
  `adventure_combat_id` int(11) DEFAULT NULL COMMENT '通过的冒险关卡ID',
  PRIMARY KEY (`role_id`) USING BTREE,
  KEY `role_record_role_name_IDX` (`role_name`) USING BTREE,
  KEY `role_record_account_uid_IDX` (`account_uid`) USING BTREE,
  KEY `role_record_open_id_IDX` (`open_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='角色档案';
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
  `group_id` int(11) DEFAULT NULL COMMENT '服务器组ID',
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
  KEY `idx_code` (`code`) USING BTREE,
  KEY `idx_group_id` (`group_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='游戏服务器信息';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `summary_daily`
--

DROP TABLE IF EXISTS `summary_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `summary_daily` (
  `uid` varchar(64) NOT NULL COMMENT '唯一ID',
  `srv_code` varchar(32) NOT NULL COMMENT '游戏服编码',
  `srv_index` int(11) DEFAULT NULL COMMENT '游戏服序号',
  `srv_name` varchar(32) DEFAULT NULL COMMENT '游戏服名',
  `game_id` varchar(32) DEFAULT NULL COMMENT 'GameID',
  `app_name` varchar(32) DEFAULT NULL COMMENT '应用名称',
  `date` date NOT NULL COMMENT '日期',
  `pay_num` double DEFAULT NULL COMMENT '充值数额',
  `pay_times` int(11) DEFAULT NULL COMMENT '充值次数',
  `new_role_num` int(11) DEFAULT NULL COMMENT '当日新增创角',
  `new_account_num` int(11) DEFAULT NULL COMMENT '当日新导入账号',
  `new_device_num` int(11) DEFAULT NULL COMMENT '当日新导入设备',
  `new_ip_num` int(11) DEFAULT NULL COMMENT '当日新导入IP',
  `login_role_num` int(11) DEFAULT NULL COMMENT '今日登陆角色数',
  `login_account_num` int(11) DEFAULT NULL COMMENT '今日登陆账号数',
  `login_device_num` int(11) DEFAULT NULL COMMENT '今日登陆设备数',
  `login_ip_num` int(11) DEFAULT NULL COMMENT '今日登陆IP数',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '数据更新时间',
  `group_id` int(11) DEFAULT NULL COMMENT '所属服务器组ID',
  `pay_role_num` int(11) DEFAULT NULL COMMENT '支付角色数',
  `pay_account_num` int(11) DEFAULT NULL COMMENT '支付账户数',
  PRIMARY KEY (`uid`) USING BTREE,
  KEY `summary_daily_srv_code_IDX` (`srv_code`) USING BTREE,
  KEY `summary_daily_game_id_IDX` (`game_id`) USING BTREE,
  KEY `summary_daily_date_IDX` (`date`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='每日汇总';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `tpl_hero_base`
--

DROP TABLE IF EXISTS `tpl_hero_base`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tpl_hero_base` (
  `tid` int(11) DEFAULT NULL COMMENT '模板ID',
  `pid` int(11) DEFAULT NULL COMMENT '原型ID',
  `name` varchar(32) DEFAULT NULL COMMENT '名字',
  `star` int(11) DEFAULT NULL COMMENT '星级'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `work`
--

DROP TABLE IF EXISTS `work`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `work` (
  `type` varchar(32) DEFAULT NULL COMMENT '工作类型',
  `id` varchar(100) DEFAULT NULL COMMENT '工作ID',
  `status` tinyint(4) DEFAULT NULL COMMENT '工作状态',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `finish_time` timestamp NULL DEFAULT NULL COMMENT '完成时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='统计工作表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Dumping events for database 'stat'
--

--
-- Dumping routines for database 'stat'
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
