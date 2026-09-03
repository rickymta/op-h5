<?php
error_reporting(1);
$PZ = array(
	'DB_HOST'=>'127.0.0.1',// 服务器地址
	'DB_NAME'=>'cdks',// 游戏数据库
	'DB_USER'=>'root',// 用户名
	'DB_PWD'=>'__MYSQL_ROOT_PASSWORD__',// 密码
	'DB_PORT'=>'3306',// 端口
	'DB_CHARSET'=>'utf8',// 数据库字符集
	'NAME_URL'=>'http://127.0.0.1:7788/',// 查询角色
	'GM_URL'=>'http://127.0.0.1:9999/',// gm地址
	'title'=>'Hệ Thống Tích Lũy',// 邮件标题
	'content'=> 'Bạn vừa nhận thành công quà tích lũy mốc '. $_POST['text']// 邮件内容	
);

$gm_code = "__GMHANGLONG_CODE__";//gm授权码

//登录 发送 充值
function curl_post($url, $data ,$headers=[]) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; MSIE 5.01; Windows NT 5.0)');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($ch, CURLOPT_AUTOREFERER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER,true);
    $tmpInfo = curl_exec($ch);
    if (curl_errno($ch)) {
        return false;
    }else{
        return $tmpInfo;
    }
}

//查询角色
function get_content($url, $headers) { 
    $ch = curl_init(); 
    curl_setopt($ch, CURLOPT_URL, $url); 
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);  
    $rs = curl_exec($ch); //执行cURL抓取页面内容 
    curl_close($ch); 
    return $rs; 
} 

//登录后台
//设置post的数据 
$data = array (
    'username' => 'admin', //后台账号 thay pas login gm gov6 đi ông
    'password' => '__CONSOLE_ADMIN_PASSWORD__', //后台密码
); 
$data = json_encode($data); 
$headers[]  =  "Content-Type: application/json";
//登录地址 
$url = $PZ['GM_URL']."staff/login"; 
//模拟登录 获取token 
$res = curl_post($url, $data , $headers);
?>