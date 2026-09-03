<?php
include './config.php';
$status = $post['status'];
$amount = $post['receive_amount'];
$task_id = $post['content'];
$kmnap = 1.5; //0 là bt, 1 là km 100%, 2 là km 200%
$xuadd = $amount + $kmnap*$amount; // đang km 20%
$username = $pdo->query("SELECT * FROM card_log WHERE task_id = '$task_id'")->fetch()['username'];
switch($status){
	case 'thanhcong':
		$pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")->execute(array($xuadd, $username));
		$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `task_id` = ?")->execute(array('Thành công', $task_id));
	break;
	
	case 'saimenhgia':
		$pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")->execute(array($xuadd, $username));
		$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `task_id` = ?")->execute(array('Sai mệnh giá', $task_id));
	break;
	
	case 'thatbai':
		$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `task_id` = ?")->execute(array('Thất bại', $task_id));
	break;
	
	default:
		exit('langtukids!');
}