<?php
// Kiểm tra key
if (!isset($_GET['key']) || $_GET['key'] !== '__REV_QUERY_KEY__') {
    header('HTTP/1.0 403 Forbidden');
    exit('Access Denied');
}

// Kết nối đến cơ sở dữ liệu
$pdo = new PDO("mysql:host=localhost;dbname=web","root","__WEB_DB_PASSWORD_REV__");
$pdo->exec('set names utf8');

// Lấy dữ liệu từ cơ sở dữ liệu
$tongnapthe = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE phuongthuc IN ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status = 'Thành công'")->fetch();
$tongnapbank = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE phuongthuc IN ('bank','autoACB')")->fetch();
$napbankhomnay = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE DATE(date) = CURDATE() AND phuongthuc IN ('bank','autoACB')")->fetch();
$napbankhomqua = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE DATE(date) = CURDATE() - INTERVAL 1 DAY AND phuongthuc IN ('bank','autoACB')")->fetch();
$napbankhomkia = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE DATE(date) = CURDATE() - INTERVAL 2 DAY AND phuongthuc IN ('bank','autoACB')")->fetch();
$napthehomnay = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE DATE(date) = CURDATE() AND phuongthuc IN ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status = 'Thành công'")->fetch();
$napthehomqua = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE DATE(date) = CURDATE() - INTERVAL 1 DAY AND phuongthuc IN ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status = 'Thành công'")->fetch();
$napthehomkia = $pdo->query("SELECT IFNULL(sum(menhgia), 0) as total FROM card_log WHERE DATE(date) = CURDATE() - INTERVAL 2 DAY AND phuongthuc IN ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status = 'Thành công'")->fetch();
$tongacc = $pdo->query("SELECT IFNULL(COUNT(*), 0) as total FROM user")->fetch();
$tongacchomnay = $pdo->query("SELECT IFNULL(COUNT(*), 0) as total FROM user WHERE DATE(time) = CURDATE()")->fetch();
$tongacchomqua = $pdo->query("SELECT IFNULL(COUNT(*), 0) as total FROM user WHERE DATE(time) = CURDATE() - INTERVAL 1 DAY")->fetch();

// Tổng số tiền nạp
$tongnap = $tongnapthe['total'] + $tongnapbank['total'];
$tongnaphomnay = $napbankhomnay['total'] + $napthehomnay['total'];
$tongnaphomqua = $napbankhomqua['total'] + $napthehomqua['total'];
$tongnaphomkia = $napbankhomkia['total'] + $napthehomkia['total'];
// Tạo mảng dữ liệu để trả về dưới dạng JSON
$data = array(
    'Tổng Nạp' => $tongnap,
    'Hôm Kia' => $tongnaphomkia,
 	'Hôm Qua' => $tongnaphomqua,
	'Hôm Nay' => $tongnaphomnay,
    'Bank nay' => isset($napbankhomnay['total']) ? $napbankhomnay['total'] : 0,
    'Thẻ nay' => isset($napthehomnay['total']) ? $napthehomnay['total'] : 0,
    'User nay' => $tongacchomnay['total'],
    'User qua' => $tongacchomqua['total'],
    'Tổng User' => $tongacc['total'],
 
);

// Trả về dữ liệu dưới dạng JSON
header('Content-Type: application/json');
echo json_encode($data);

// Đóng kết nối
$pdo = null;
?>
