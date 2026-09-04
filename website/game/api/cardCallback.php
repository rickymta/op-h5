<?php
include './config.php';
require_once __DIR__ . '/id_wallet.php';
$status = $post['status'];
$amount = $post['receive_amount'];
$task_id = $post['content'];
$kmnap = 1.5; //0 là bt, 1 là km 100%, 2 là km 200%
$xuadd = $amount + $kmnap*$amount; // đang km 20%
$username = $pdo->query("SELECT * FROM card_log WHERE task_id = '$task_id'")->fetch()['username'];
switch($status){
	case 'thanhcong':
		// task_id la ma giao dich duy nhat sinh o card.php -> khoa chong trung.
		// Truoc day khong co khoa nay: nha cung cap ban lai callback la cong tien lan nua.
		id_wallet_credit($pdo, $username, $xuadd, 'the-' . $task_id, 'Nạp thẻ cào', $task_id);
		$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `task_id` = ?")->execute(array('Thành công', $task_id));
	break;
	
	case 'saimenhgia':
		id_wallet_credit($pdo, $username, $xuadd, 'the-' . $task_id, 'Nạp thẻ cào (sai mệnh giá)', $task_id);
		$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `task_id` = ?")->execute(array('Sai mệnh giá', $task_id));
	break;
	
	case 'thatbai':
		$pdo->prepare("UPDATE `card_log` SET `status` = ? WHERE `task_id` = ?")->execute(array('Thất bại', $task_id));
	break;
	
	default:
		exit('langtukids!');
}