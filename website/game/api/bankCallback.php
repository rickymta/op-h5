<?php
//{urlcallback của bạn}}?transid={{transid}}&amount={{amount}}&code={{code}}&status={{status}}&note={{note}}&reqid={{reqid}}&bankCode=VPB&bankCode={{bankCode}}&phoneName={{phoneName}}&phoneNum={{phoneNum}}&checksum=2ba952b5c33d13c73488fa3cd3169e4f
include './config.php';
$transid = $_GET['transid'];
$amount = $_GET['amount'];
$code = $_GET['code'];
$status = $_GET['status'];
$note = $_GET['note'];
$reqid = $_GET['reqid'];
$xuadd = $amount + round(($amount*20)/100); // đang km 20%
$kmnap = 1; //0 là bt, 1 là km 100%, 2 là km 200%
$xuaddthat = $kmnap*$amount + $xuadd;
$username = $pdo->query("select * from card_log where task_id = '$code' ")->fetch()['username'];
if($status == 99 or $status == 100){
	$pdo->prepare("UPDATE `card_log` SET `status` = ?, `menhgia` = ? WHERE `task_id` = ? AND `reqid` = ?")->execute(array('Thành công', $amount, $code, $reqid));
	$pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")->execute(array($xuaddthat, $username));
	exit('okhub');
}else{
	$pdo->prepare("UPDATE `card_log` SET `status` = ?, `menhgia` = ? WHERE `task_id` = ? AND `reqid` = ?")->execute(array('Thất bại', $amount, $code, $reqid));
}