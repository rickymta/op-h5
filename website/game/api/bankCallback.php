<?php
//{urlcallback của bạn}}?transid={{transid}}&amount={{amount}}&code={{code}}&status={{status}}&note={{note}}&reqid={{reqid}}&bankCode=VPB&bankCode={{bankCode}}&phoneName={{phoneName}}&phoneNum={{phoneNum}}&checksum=__BANK_CALLBACK_CHECKSUM__
include './config.php';
require_once __DIR__ . '/id_wallet.php';

// Checksum trong URL truoc day KHONG he duoc doc: bat ky ai goi duoc dia chi nay deu
// cong duoc tien cho bat ky tai khoan nao, voi so tien tuy y. Gio doi chieu bang
// hash_equals (khong phu thuoc thoi gian).
$expected = '__BANK_CALLBACK_CHECKSUM__';
$got      = isset($_GET['checksum']) ? $_GET['checksum'] : '';
if ($expected === '' || strpos($expected, '__') === 0) {
	// Chua dien secret (cay dang o trang thai da che) — tu choi thay vi chay khong kiem tra.
	http_response_code(503);
	exit('chua cau hinh checksum');
}
if (!hash_equals($expected, $got)) {
	http_response_code(403);
	error_log('bankCallback: checksum sai tu ' . $_SERVER['REMOTE_ADDR']);
	exit('sai checksum');
}

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
	// transid la ma giao dich cua ngan hang -> khoa chong trung. Truoc day khong co
	// khoa nay: cong thanh toan ban lai callback la cong tien them mot lan nua.
	id_wallet_credit($pdo, $username, $xuaddthat, 'bank-' . $transid,
	                 'Nạp ngân hàng ' . $note, $transid);
	exit('okhub');
}else{
	$pdo->prepare("UPDATE `card_log` SET `status` = ?, `menhgia` = ? WHERE `task_id` = ? AND `reqid` = ?")->execute(array('Thất bại', $amount, $code, $reqid));
}
