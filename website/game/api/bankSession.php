<?php
include './config.php';
$reqid = $get['reqid'];
$tokenBank = md5($_SESSION['username'].$ip);
$username = $_SESSION['username'];
$result = $pdo->query("select * from card_log where username = '$username' and tokenBank = '$tokenBank' and status = 'Thành công' and reqid = '$reqid'")->fetch();

if(isset($get['huy'])){
	$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `username` = ? and tokenBank = ?")->execute(array('Thất bại', $username, $tokenBank));
		exit('true');
}else{
	if($result == true){
	exit("true");
}else{
	exit("false"); 
}
}