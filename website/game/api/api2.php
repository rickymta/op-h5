<?php
error_reporting(1);
date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo = new PDO("mysql:host=127.0.0.1;dbname=web","root","__MYSQL_ROOT_PASSWORD__");
$pdo->exec('set names utf8');
$post = $_POST;
$get = $_GET;
$getfilter="'|(and|or)\\b.+?(>|<|=|in|like)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$postfilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$cookiefilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
function StopAttack($StrFiltKey,$StrFiltValue,$ArrFiltReq){
	if(is_array($StrFiltValue)){
		$StrFiltValue=implode($StrFiltValue);
	}
	if (preg_match("/".$ArrFiltReq."/is",$StrFiltValue)==1){
		exit('langtukids ^^!');
	}
}
foreach($_GET as $key=>$value){
	StopAttack($key,$value,$getfilter);
}
foreach($_POST as $key=>$value){
	StopAttack($key,$value,$postfilter);
}
foreach($_COOKIE as $key=>$value){
	StopAttack($key,$value,$cookiefilter);
}
$payid = $get['payid'];
$username = "";
if(isset($get['user'])){
    $username = $get['user'];
    $_SESSION['username'] = $username;
} else {
    $username =$_SESSION['username'];
}

if($_SESSION['username']){
	$name = $_SESSION['username'];
	$info = $pdo->query("select * from user where username = '$name' limit 1")->fetch();
	$logxu = $pdo->query("select * from log_xu where username = '$name' order by id desc")->fetchall();
	$lognapthe = $pdo->query("select * from card_log where username = '$name' order by id desc")->fetchall();
	$logck = $pdo->query("select * from log_nap where username = '$name' order by id desc")->fetchall();
}

// $payid = $get['payid'];
// $username = "";
// if(isset($get['user'])){
//     $username = $get['user'];
// } else {
//     $username =$_SESSION['username'];
// }
$xu = $info['xu'];
$file = fopen("./id.txt", "r");
while (!feof($file)) {
    $line = fgets($file);
    $txts = explode(';', $line);
    if ($txts[0] == $payid) {
        $truxu = trim($txts[1]);
        break;
    }
}
fclose($file);
if($xu <= 0 or $xu < $truxu){
	exit('false');
}else{
	exit('true');
}
?>