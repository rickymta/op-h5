window.screenOrientation = "sensor_landscape";
var ydwxConfig = {};
window.ydwxConfig = ydwxConfig;
ydwxConfig.version = 202203301615;
ydwxConfig.gameId = 10091;
ydwxConfig.platform = "yezixi";
ydwxConfig.basePath = location.protocol + "//" + location.host + "/";
ydwxConfig.debug = false;
ydwxConfig.loginType = 1;
// Goi CUNG GOC thay vi theo cong.
//
// Ban goc dung location.hostname + ":12345/" va ":7788/". Server that chi mo 80 va
// 443, nen hai duong do khong toi noi; va khi trang chay HTTPS thi trinh duyet con
// chan noi dung hon hop, khong co duong lui.
//
// nginx chuyen /meta/ -> 127.0.0.1:12345 va /stat/ -> 127.0.0.1:7788. Dung
// location.origin nen scheme va cong tu khop, khong phai doan.
ydwxConfig.metaDataServer = location.origin + "/meta/";
ydwxConfig.statisticServer = location.origin + "/stat/";
ydwxConfig.clientVersion = appVersion;
//loadLib("8e40e-89c8c-95a05.js"); 
loadLib("libs/0c1cc-498bc-931f1.js");
loadLib("libs/0c12c-498bc-931f2.js"); 
loadLib("libs/b025d-4e5e6-14e03.js"); 
loadLib("libs/70b25-fd225-cca11.js");
loadLib("libs/6c019-63500-58428.js");
loadLib("libs/9e1f8-d19bc-ca79a.js");
loadLib("libs/0e8e7-bdd92-8bd5a.js");
loadLib("libs/fe8a3-bb91d-7fb1b.js");
// opBundleV (do play.php dat, theo filemtime) di kem appVersion: doi host thi bundle
// duoc sed lai, URL phai doi theo, neu khong cache "immutable 30d" giu ban cu.
loadLib("libs/e228b-0b904-ac44c.js?v="+appVersion+(typeof opBundleV!=="undefined"?"&b="+opBundleV:""));
loadLib("libs/795bf-bff72-0d910.js?v="+appVersion); 