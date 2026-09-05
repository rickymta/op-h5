// Dich console cua client sang tieng Anh. SINH TU DONG — dung sua tay.
//   nguon    : tools/cn-en.json
//   sinh lai : python3 tools/gen-console-en.py
//
// Client (LayaAir da obfuscate) ghi console bang tieng Trung, vi du:
//   表[文本库]条目超时警告
//   Biểu phân tích loại thiếu thốn:上古之战怪物
// Cac chuoi do nam trong BANG CHUOI da obfuscate cua bundle. Nhieu bo obfuscate xoay
// vong mang nay luc khoi dong kem mot phep kiem tra tren chinh noi dung mang, nen sua
// thang vao bundle co the lam hong ca client theo kieu rat kho lan. Boc console thi
// khong dung toi bundle va go ra cung de.
//
// Chi doi thu HIEN RA MAN HINH. Khong doi du lieu, khong doi lenh gui len server.
(function () {
	'use strict';
	var TU_DIEN = [
 [
  "玩家下线，但是cc==null,应该是服务器端主动踢玩家下线的",
  "player disconnected, but cc==null — the server most likely kicked them"
 ],
 [
  "###### ServerConfiguration完成",
  "###### ServerConfiguration done"
 ],
 [
  "===========打印运行时信息==========",
  "=========== runtime info =========="
 ],
 [
  "###### mq模块initDependency完成",
  "###### mq module initDependency done"
 ],
 [
  "###### StandAloneTick 被启动",
  "###### StandAloneTick started"
 ],
 [
  "收到请求：游戏服希望将组队冠军赛数据再广播一遍",
  "request: game server asks to re-broadcast team championship data"
 ],
 [
  "收到请求：游戏服希望将全部据点信息再广播一遍",
  "request: game server asks to re-broadcast all stronghold data"
 ],
 [
  "收到请求：游戏服希望将巅峰会武数据再广播一遍",
  "request: game server asks to re-broadcast Peak Tournament data"
 ],
 [
  "###### message模块init完成",
  "###### message module init done"
 ],
 [
  "###### clients模块init完成",
  "###### clients module init done"
 ],
 [
  "###### Game模块update完成",
  "###### Game module update done"
 ],
 [
  "收到请求：游戏服希望将国战数据再广播一遍",
  "request: game server asks to re-broadcast nation-war data"
 ],
 [
  "任务比拼活动发生了变更，当前开启的活动为",
  "task-contest event changed; currently active event:"
 ],
 [
  "###### basis模块init完成",
  "###### basis module init done"
 ],
 [
  "###### web socket 端口",
  "###### web socket port"
 ],
 [
  "mq模块initDependency完成",
  "mq module initDependency done"
 ],
 [
  "获取System.properties:",
  "reading System.properties:"
 ],
 [
  "###### Game模块init完成",
  "###### Game module init done"
 ],
 [
  "###### 新统计模块init完成",
  "###### new-stats module init done"
 ],
 [
  "###### api模块init完成",
  "###### api module init done"
 ],
 [
  "###### mq模块init完成",
  "###### mq module init done"
 ],
 [
  "同步tcg的srv_game 开始",
  "syncing tcg.srv_game — start"
 ],
 [
  "巅峰会武玩家阵容数据加载完毕 共有",
  "Peak Tournament player lineups loaded, total"
 ],
 [
  "初始化mysql数据库表结构完成",
  "MySQL schema initialised"
 ],
 [
  "巅峰会武 服务启动 begin",
  "Peak Tournament service starting"
 ],
 [
  "应该是服务器端主动踢玩家下线的",
  "the server most likely kicked the player"
 ],
 [
  "jvm正常运行时间（毫秒）:",
  "JVM uptime (ms):"
 ],
 [
  "国战5分钟奖励结算begin",
  "nation war 5-minute reward settlement — begin"
 ],
 [
  "excel配置表 文件夹存在",
  "excel config folder found"
 ],
 [
  "国战整点save begin",
  "nation war hourly save — begin"
 ],
 [
  "来自group server",
  "from group server"
 ],
 [
  "每分钟结算一次洞天福地奖励",
  "settling Grotto Paradise rewards (every minute)"
 ],
 [
  "巅峰会武 服务启动 end",
  "Peak Tournament service started"
 ],
 [
  "国战阵营属性重置begin",
  "nation-war faction attribute reset — begin"
 ],
 [
  "国战特殊事件重置begin",
  "nation-war special event reset — begin"
 ],
 [
  "开始检测是否推送定时邮件",
  "checking whether scheduled mail must be pushed"
 ],
 [
  "国战5分钟奖励结算end",
  "nation war 5-minute reward settlement — end"
 ],
 [
  "excel配置表读取完成",
  "excel config tables loaded"
 ],
 [
  "国战整点save end",
  "nation war hourly save — end"
 ],
 [
  "发送了组队冠军赛申请消息",
  "sent team-championship request message"
 ],
 [
  "每日汇总worker启动",
  "daily-summary worker started"
 ],
 [
  "条符合条件的历史支付记录",
  " matching historical payment records"
 ],
 [
  "jvm启动时间（毫秒）:",
  "JVM start time (ms):"
 ],
 [
  "app-start 结束",
  "app-start finished"
 ],
 [
  "app-start 开始",
  "app-start beginning"
 ],
 [
  "JVM默认时区已被修改为",
  "JVM default timezone changed to"
 ],
 [
  "国战阵营属性重置end",
  "nation-war faction attribute reset — end"
 ],
 [
  "国战特殊事件重置end",
  "nation-war special event reset — end"
 ],
 [
  "国战整点处理begin",
  "nation war hourly processing — begin"
 ],
 [
  "国战数据保存begin",
  "nation-war data save — begin"
 ],
 [
  "开始广播凌霄殿所有数据",
  "broadcasting all Lingxiao Hall data"
 ],
 [
  "发送了巅峰会武申请消息",
  "sent Peak Tournament request message"
 ],
 [
  "开始同步vip客服列表",
  "syncing VIP support list"
 ],
 [
  "app-start完成",
  "app-start done"
 ],
 [
  "app-start开始",
  "app-start beginning"
 ],
 [
  "读配置表--begin",
  "reading config tables — begin"
 ],
 [
  "channel关闭完成",
  "channel closed"
 ],
 [
  "开始广播国战所有数据",
  "broadcasting all nation-war data"
 ],
 [
  "执行收集基础在线日志",
  "collecting base online logs"
 ],
 [
  "龙图token有问题",
  "Longtu token invalid"
 ],
 [
  "国战整点处理end",
  "nation war hourly processing — end"
 ],
 [
  "国战数据保存end",
  "nation-war data save — end"
 ],
 [
  "发送了国战申请消息",
  "sent nation-war request message"
 ],
 [
  "次支付历史记录转移",
  " payment-history records moved"
 ],
 [
  "jvm规范运营商:",
  "JVM spec vendor:"
 ],
 [
  "读配置表--end",
  "reading config tables — end"
 ],
 [
  "kafka集群配置",
  "Kafka cluster config"
 ],
 [
  ")decode错误",
  ") decode error"
 ],
 [
  "开始同步定时邮件",
  "syncing scheduled mail"
 ],
 [
  "执行同步基础日志",
  "syncing base logs"
 ],
 [
  "执行同步消耗日志",
  "syncing consumption logs"
 ],
 [
  "服务器环境配置：",
  "server environment config:"
 ],
 [
  "jvm规范名称:",
  "JVM spec name:"
 ],
 [
  "jvm规范版本:",
  "JVM spec version:"
 ],
 [
  "jvm实现版本:",
  "JVM impl version:"
 ],
 [
  "英雄高阶献祭星级",
  "hero advanced sacrifice star level"
 ],
 [
  "巅峰会武玩家阵容",
  "Peak Tournament player lineup"
 ],
 [
  "conn关闭完成",
  "connection closed"
 ],
 [
  "跨服消费的路由键",
  "cross-server consumption routing key"
 ],
 [
  "从tcg库中删除",
  "deleted from tcg DB:"
 ],
 [
  "环境config",
  "environment config"
 ],
 [
  "六界圣殿庆功消耗",
  "Six Realms Hall celebration cost"
 ],
 [
  "驱魔之夜随机奖励",
  "Exorcism Night random reward"
 ],
 [
  "发送了申请消息",
  "sent request message"
 ],
 [
  "之前的支付记录",
  "earlier payment records"
 ],
 [
  "jvm运营商:",
  "JVM vendor:"
 ],
 [
  "配置文件不存在",
  "config file not found"
 ],
 [
  "跨服战力排行榜",
  "cross-server power leaderboard"
 ],
 [
  "消费的内容类型",
  "consumed content type"
 ],
 [
  "收到来自跨服的",
  "received from cross-server:"
 ],
 [
  "执行快照收集",
  "collecting snapshot"
 ],
 [
  "执行同步快照",
  "syncing snapshot"
 ],
 [
  "jvm名称:",
  "JVM name:"
 ],
 [
  "占用检查完毕",
  "port-conflict check done"
 ],
 [
  "环境配置开始",
  "environment config — begin"
 ],
 [
  "引导类路径:",
  "boot class path:"
 ],
 [
  "跨服成员数据",
  "cross-server member data"
 ],
 [
  "鸿运当头礼包",
  "Good Fortune gift pack"
 ],
 [
  "皮肤激活道具",
  "skin activation item"
 ],
 [
  "国战阵营属性",
  "nation-war faction attributes"
 ],
 [
  "任务比拼活动",
  "task-contest event"
 ],
 [
  "进程PID=",
  "process PID="
 ],
 [
  "分钟奖励结算",
  "-minute reward settlement"
 ],
 [
  "神装技能备注",
  "divine-gear skill note"
 ],
 [
  "六界圣殿奖池",
  "Six Realms Hall prize pool"
 ],
 [
  "请使用包装类",
  "use a wrapper class"
 ],
 [
  "的支付记录",
  " payment records"
 ],
 [
  "组队冠军赛",
  "team championship"
 ],
 [
  ")加载错误",
  ") load error"
 ],
 [
  "战力排行榜",
  "power leaderboard"
 ],
 [
  "冠军赛数据",
  "championship data"
 ],
 [
  "圣诞树奖励",
  "Christmas Tree reward"
 ],
 [
  "vip客服",
  "VIP support"
 ],
 [
  "vip积分",
  "VIP points"
 ],
 [
  "vm参数:",
  "VM args:"
 ],
 [
  "浏览器打开",
  "open in browser"
 ],
 [
  "已被修改为",
  "changed to"
 ],
 [
  "国战阵营",
  "nation-war faction"
 ],
 [
  "全局配置",
  "global config"
 ],
 [
  "定时邮件",
  "scheduled mail"
 ],
 [
  "每日邀请",
  "daily invite"
 ],
 [
  "服务器组",
  "server group"
 ],
 [
  "密码错误",
  "wrong password"
 ],
 [
  "阵容数据",
  "lineup data"
 ],
 [
  "启动时间",
  "start time"
 ],
 [
  "结算时间",
  "settlement time"
 ],
 [
  "玩家阵容",
  "player lineup"
 ],
 [
  "正常运行",
  "uptime"
 ],
 [
  "任务比拼",
  "task contest"
 ],
 [
  "全量数据",
  "full data"
 ],
 [
  "排行数据",
  "ranking data"
 ],
 [
  "洞天福地",
  "Grotto Paradise"
 ],
 [
  "开服时间",
  "server open time"
 ],
 [
  "阵营属性",
  "faction attributes"
 ],
 [
  "特殊事件",
  "special event"
 ],
 [
  "据点信息",
  "stronghold info"
 ],
 [
  "每日汇总",
  "daily summary"
 ],
 [
  "错误信息",
  "error message"
 ],
 [
  "鸿运当头",
  "Good Fortune"
 ],
 [
  "整点处理",
  "hourly processing"
 ],
 [
  "巅峰会武",
  "Peak Tournament"
 ],
 [
  "激活道具",
  "activation item"
 ],
 [
  "全部据点",
  "all strongholds"
 ],
 [
  "类路径:",
  "class path:"
 ],
 [
  "库路径:",
  "library path:"
 ],
 [
  "加载错误",
  "load error"
 ],
 [
  "关闭完成",
  "closed"
 ],
 [
  "玩家下线",
  "player disconnected"
 ],
 [
  "默认时区",
  "default timezone"
 ],
 [
  "抽奖次数",
  "draw count"
 ],
 [
  "上古之战",
  "Ancient War"
 ],
 [
  "竞猜奖励",
  "betting reward"
 ],
 [
  "发生变化",
  "changed"
 ],
 [
  "奖励同步",
  "reward sync"
 ],
 [
  "凌霄殿",
  "Lingxiao Hall"
 ],
 [
  "数据库",
  "database"
 ],
 [
  "排行榜",
  "leaderboard"
 ],
 [
  "游戏服",
  "game server"
 ],
 [
  "找不到",
  "not found"
 ],
 [
  "服务器",
  "server"
 ],
 [
  "公会战",
  "guild war"
 ],
 [
  "5分钟",
  "5-minute"
 ],
 [
  "读取到",
  "read"
 ],
 [
  "演武场",
  "arena"
 ],
 [
  "冠军赛",
  "championship"
 ],
 [
  "叶子戏",
  "Yezixi"
 ],
 [
  "嵌入式",
  "embedded"
 ],
 [
  "的奖励",
  " reward"
 ],
 [
  "不存在",
  "does not exist"
 ],
 [
  "的配置",
  " config"
 ],
 [
  "圣诞树",
  "Christmas Tree"
 ],
 [
  "跨天了",
  "day rollover"
 ],
 [
  "本次共",
  "this run:"
 ],
 [
  "服环境",
  "server environment"
 ],
 [
  "浏览器",
  "browser"
 ],
 [
  "初始化",
  "initialise"
 ],
 [
  "文件夹",
  "folder"
 ],
 [
  "文本库",
  "text library"
 ],
 [
  "成功率",
  "success rate"
 ],
 [
  "新消息",
  "new message"
 ],
 [
  "本服务",
  "this service"
 ],
 [
  "服务端",
  "server side"
 ],
 [
  "客户端",
  "client"
 ],
 [
  "请注意",
  "note"
 ],
 [
  "关闭中",
  "closing"
 ],
 [
  "国际化",
  "i18n"
 ],
 [
  "建议如",
  "recommend"
 ],
 [
  "请检查",
  "check"
 ],
 [
  "下线啦",
  "went offline"
 ],
 [
  "成员",
  "member"
 ],
 [
  "组队",
  "team"
 ],
 [
  "数据",
  "data"
 ],
 [
  "邮件",
  "mail"
 ],
 [
  "道具",
  "item"
 ],
 [
  "阶段",
  "stage"
 ],
 [
  "皮肤",
  "skin"
 ],
 [
  "属性",
  "attribute"
 ],
 [
  "跨服",
  "cross-server"
 ],
 [
  "完成",
  "done"
 ],
 [
  "时间",
  "time"
 ],
 [
  "请求",
  "request"
 ],
 [
  "阵营",
  "faction"
 ],
 [
  "星级",
  "star level"
 ],
 [
  "阵容",
  "lineup"
 ],
 [
  "读取",
  "read"
 ],
 [
  "过期",
  "expired"
 ],
 [
  "挂机",
  "idle"
 ],
 [
  "主角",
  "character"
 ],
 [
  "本服",
  "this server"
 ],
 [
  "开始",
  "start"
 ],
 [
  "国战",
  "nation war"
 ],
 [
  "排行",
  "ranking"
 ],
 [
  "启动",
  "start"
 ],
 [
  "玩家",
  "player"
 ],
 [
  "内容",
  "content"
 ],
 [
  "毫秒",
  "ms"
 ],
 [
  "战力",
  "combat power"
 ],
 [
  "全局",
  "global"
 ],
 [
  "错误",
  "error"
 ],
 [
  "重置",
  "reset"
 ],
 [
  "端口",
  "port"
 ],
 [
  "列表",
  "list"
 ],
 [
  "配置",
  "config"
 ],
 [
  "类型",
  "type"
 ],
 [
  "成功",
  "success"
 ],
 [
  "名称",
  "name"
 ],
 [
  "支付",
  "payment"
 ],
 [
  "记录",
  "record"
 ],
 [
  "福地",
  "blessed land"
 ],
 [
  "结算",
  "settlement"
 ],
 [
  "这是",
  "this is"
 ],
 [
  "版本",
  "version"
 ],
 [
  "公会",
  "guild"
 ],
 [
  "估值",
  "valuation"
 ],
 [
  "结果",
  "result"
 ],
 [
  "积分",
  "points"
 ],
 [
  "礼包",
  "gift pack"
 ],
 [
  "活动",
  "event"
 ],
 [
  "英雄",
  "hero"
 ],
 [
  "邀请",
  "invite"
 ],
 [
  "消耗",
  "consumption"
 ],
 [
  "日志",
  "log"
 ],
 [
  "参数",
  "args"
 ],
 [
  "密码",
  "password"
 ],
 [
  "任务",
  "task"
 ],
 [
  "事件",
  "event"
 ],
 [
  "历史",
  "history"
 ],
 [
  "奖励",
  "reward"
 ],
 [
  "模块",
  "module"
 ],
 [
  "耗时",
  "took"
 ],
 [
  "查询",
  "query"
 ],
 [
  "但是",
  "but"
 ],
 [
  "特性",
  "features"
 ],
 [
  "插入",
  "inserted into"
 ],
 [
  "打开",
  "open"
 ],
 [
  "删除",
  "deleted"
 ],
 [
  "库中",
  "in DB"
 ],
 [
  "当前",
  "current"
 ],
 [
  "全部",
  "all"
 ],
 [
  "所有",
  "all"
 ],
 [
  "其他",
  "other"
 ],
 [
  "如果",
  "if"
 ],
 [
  "需要",
  "needs"
 ],
 [
  "可以",
  "can"
 ],
 [
  "以及",
  "and"
 ],
 [
  "同步",
  "sync"
 ],
 [
  "检测",
  "check"
 ],
 [
  "推送",
  "push"
 ],
 [
  "广播",
  "broadcast"
 ],
 [
  "收到",
  "received"
 ],
 [
  "发送",
  "sent"
 ],
 [
  "保存",
  "save"
 ],
 [
  "处理",
  "processing"
 ],
 [
  "转移",
  "moved"
 ],
 [
  "运行",
  "running"
 ],
 [
  "关闭",
  "closed"
 ],
 [
  "连接",
  "connection"
 ],
 [
  "客服",
  "support"
 ],
 [
  "统计",
  "stats"
 ],
 [
  "文件",
  "file"
 ],
 [
  "条目",
  "entry"
 ],
 [
  "超时",
  "timeout"
 ],
 [
  "警告",
  "warning"
 ],
 [
  "分析",
  "parse"
 ],
 [
  "缺失",
  "missing"
 ],
 [
  "实例",
  "instance"
 ],
 [
  "怪物",
  "monster"
 ],
 [
  "神龙",
  "Divine Dragon"
 ],
 [
  "创建",
  "create"
 ],
 [
  "登录",
  "login"
 ],
 [
  "角色",
  "role"
 ],
 [
  "在线",
  "online"
 ],
 [
  "人数",
  "count"
 ],
 [
  "失败",
  "failed"
 ],
 [
  "分钟",
  "min"
 ],
 [
  "小时",
  "h"
 ],
 [
  "来自",
  "from"
 ],
 [
  "发放",
  "grant"
 ],
 [
  "加载",
  "load"
 ],
 [
  "输出",
  "output"
 ],
 [
  "最多",
  "max"
 ],
 [
  "官方",
  "official"
 ],
 [
  "游戏",
  "game"
 ],
 [
  "执行",
  "run"
 ],
 [
  "消息",
  "message"
 ],
 [
  "解析",
  "parse"
 ],
 [
  "缺少",
  "missing"
 ],
 [
  "正常",
  "normal"
 ],
 [
  "环境",
  "environment"
 ],
 [
  "出错",
  "error"
 ],
 [
  "服务",
  "service"
 ],
 [
  "以下",
  "the following"
 ],
 [
  "重启",
  "restart"
 ],
 [
  "停止",
  "stop"
 ],
 [
  "开启",
  "enabled"
 ],
 [
  "等待",
  "waiting"
 ],
 [
  "重试",
  "retry"
 ],
 [
  "超过",
  "exceeds"
 ],
 [
  "限制",
  "limit"
 ],
 [
  "数量",
  "count"
 ],
 [
  "大小",
  "size"
 ],
 [
  "长度",
  "length"
 ],
 [
  "状态",
  "status"
 ],
 [
  "结束",
  "end"
 ],
 [
  "地址",
  "address"
 ],
 [
  "个数",
  "count"
 ],
 [
  "更新",
  "update"
 ],
 [
  "写入",
  "write"
 ],
 [
  "获取",
  "get"
 ],
 [
  "设置",
  "set"
 ],
 [
  "返回",
  "returned"
 ],
 [
  "调用",
  "call"
 ],
 [
  "接口",
  "API"
 ],
 [
  "由于",
  "because"
 ],
 [
  "导致",
  "caused"
 ],
 [
  "原因",
  "reason"
 ],
 [
  "问题",
  "problem"
 ],
 [
  "完毕",
  "finished"
 ],
 [
  "构建",
  "build"
 ],
 [
  "仓库",
  "repo"
 ],
 [
  "样品",
  "sample"
 ],
 [
  "管理",
  "manager"
 ],
 [
  "原先",
  "was"
 ],
 [
  "去除",
  "removed"
 ],
 [
  "目前",
  "currently"
 ],
 [
  "目录",
  "dir"
 ],
 [
  "异常",
  "exception"
 ],
 [
  "使用",
  "using"
 ],
 [
  "登陆",
  "logged in"
 ],
 [
  "无法",
  "cannot"
 ],
 [
  "监听",
  "listener"
 ],
 [
  "是否",
  "whether"
 ],
 [
  "正确",
  "correct"
 ],
 [
  "生成",
  "generate"
 ],
 [
  "提交",
  "submit"
 ],
 [
  "本地",
  "local"
 ],
 [
  "下线",
  "offline"
 ],
 [
  "上线",
  "online"
 ],
 [
  "第",
  "#"
 ],
 [
  "条",
  " rows"
 ],
 [
  "共",
  "total"
 ],
 [
  "次",
  "x"
 ],
 [
  "的",
  " "
 ],
 [
  "个",
  ""
 ],
 [
  "了",
  ""
 ],
 [
  "在",
  " in "
 ],
 [
  "和",
  " and "
 ],
 [
  "或",
  " or "
 ],
 [
  "为",
  ": "
 ],
 [
  "是",
  " is "
 ],
 [
  "不",
  "not "
 ],
 [
  "有",
  "has "
 ],
 [
  "无",
  "no "
 ],
 [
  "中",
  " in "
 ],
 [
  "到",
  " to "
 ],
 [
  "从",
  "from "
 ],
 [
  "已",
  "already "
 ],
 [
  "未",
  "not yet "
 ],
 [
  "则",
  "then"
 ],
 [
  "表",
  "table"
 ],
 [
  "秒",
  "s"
 ],
 [
  "天",
  "d"
 ],
 [
  "端",
  ""
 ],
 [
  "读",
  "read"
 ],
 [
  "取",
  "get"
 ],
 [
  "参",
  "arg"
 ],
 [
  "值",
  "value"
 ],
 [
  "空",
  "empty"
 ],
 [
  "该",
  "this "
 ],
 [
  "此",
  "this "
 ],
 [
  "被",
  ""
 ],
 [
  "将",
  ""
 ],
 [
  "把",
  ""
 ],
 [
  "并",
  " and "
 ],
 [
  "与",
  " and "
 ],
 [
  "但",
  "but"
 ],
 [
  "而",
  "and"
 ],
 [
  "警",
  "warn"
 ],
 [
  "误",
  "error"
 ],
 [
  "常",
  ""
 ],
 [
  "行",
  ""
 ],
 [
  "执",
  ""
 ],
 [
  "现",
  "now"
 ],
 [
  "仅",
  "only"
 ],
 [
  "本",
  "this"
 ],
 [
  "官",
  "official"
 ],
 [
  "组",
  "group"
 ],
 [
  "请",
  "please "
 ],
 [
  "服",
  "server"
 ],
 [
  "高",
  "high"
 ],
 [
  "目",
  ""
 ],
 [
  "确",
  ""
 ],
 [
  "生",
  ""
 ],
 [
  "提",
  ""
 ],
 [
  "交",
  ""
 ],
 [
  "法",
  ""
 ],
 [
  "登",
  ""
 ],
 [
  "陆",
  ""
 ],
 [
  "异",
  ""
 ],
 [
  "女",
  "F"
 ],
 [
  "男",
  "M"
 ],
 [
  "啦",
  ""
 ],
 [
  "线",
  ""
 ]
];

	// Thay CUM DAI TRUOC: '国战5分钟奖励结算begin' phai duoc thay tron ven, neu de
	// '国战' thay truoc thi phan con lai thanh cau nua Trung nua Anh khong doc noi.
	TU_DIEN.sort(function (a, b) { return b[0].length - a[0].length; });

	var CO_TRUNG = /[\u4e00-\u9fff]/;

	function dich(s) {
		if (typeof s !== 'string' || !CO_TRUNG.test(s)) { return s; }
		for (var i = 0; i < TU_DIEN.length; i++) {
			var tr = TU_DIEN[i][0], en = TU_DIEN[i][1];
			if (s.indexOf(tr) < 0) { continue; }
			// Tu them dau cach khi hai ben la chu/so: tieng Trung khong co dau cach nen
			// ghep thang se ra "querytook10ms" thay vi "query took 10ms".
			var ra = '', j = 0, k;
			while ((k = s.indexOf(tr, j)) >= 0) {
				var truoc = k > 0 ? s.charAt(k - 1) : '';
				var sau = s.charAt(k + tr.length);
				var d = (/[0-9A-Za-z]/.test(truoc) && /^[0-9A-Za-z]/.test(en)) ? ' ' : '';
				var c = (/[0-9A-Za-z]/.test(sau) && /[0-9A-Za-z]$/.test(en)) ? ' ' : '';
				ra += s.slice(j, k) + d + en + c;
				j = k + tr.length;
			}
			s = ra + s.slice(j);
		}
		return s;
	}

	['log', 'info', 'warn', 'error', 'debug'].forEach(function (ten) {
		var goc = console[ten];
		if (typeof goc !== 'function') { return; }
		console[ten] = function () {
			var args = new Array(arguments.length);
			for (var i = 0; i < arguments.length; i++) { args[i] = dich(arguments[i]); }
			return goc.apply(console, args);
		};
	});

	console.info('[op-console-en] console da duoc dich sang tieng Anh (' + TU_DIEN.length + ' muc)');
})();
