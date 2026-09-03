console.log("欢迎使用动态配置");
// 个人GJK环境: teamGJK
// 个人ZX环境: teamZX
// 本地环境（开发主机localhost）：local
// 内网开发环境: dev
// 首发正式环境: release
// 首发演示环境: demo
// IOS审核环境: iosExam
// 微信小程序审核环境：wxappExam
// 微信小程序正式环境：wxapp
// 港澳台演示环境: gatDemo
// 港澳台审核环境: gatExam
// 港澳台正式环境: gat
document.env_local_mode = 'local';
document.env_local_title = '正式环境';