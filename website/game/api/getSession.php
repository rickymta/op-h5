<?php
include '../api/config.php';

// Cau noi web<->game: client LayaAir goi GET /api/getSession.php?u=&p=
//
// Hop dong GET KHONG doi duoc o buoc nay: chuoi goi nam trong bundle client 9,4 MB
// da lam roi ma, khong co nguon de dung lai. Doi lai:
//   - mat khau doi chieu qua password_hash (web_password_verify trong config.php)
//   - nhanh tu tao tai khoan da co kiem tra dinh dang va gioi han theo IP, thay vi
//     nhan bat ky chuoi nao nhu truoc
//   - nginx khong ghi query string cua duong dan nay vao access log
// Ca ba deu la bien phap tam. Ke hoach that: bo han file nay khi lop Adapter len,
// luc do client lay token tu he thong ID chu khong gui mat khau qua URL nua.

$username = strtolower(trim($_GET['u']));
$password = $_GET['p'];

if($username === '' || $password === ''){
	exit('lamgiday');
}

// Dang nhap duoc -> xong
if(web_password_verify($pdo, $username, $password)){
	$_SESSION['username'] = $username;
	exit('true');
}

// Sai mat khau cho tai khoan da ton tai -> tu choi, khong tao gi them
$stmt = $pdo->prepare("SELECT `id` FROM `user` WHERE `username` = ? LIMIT 1");
$stmt->execute(array($username));
if($stmt->fetch()){
	session_destroy();
	exit('lamgiday');
}

// Tai khoan chua co: tao moi, nhung ap dung dung cac rang buoc nhu case 'reg'
// (truoc day nhanh nay nhan moi chuoi va khong gioi han so luong).
$countUser = strlen($username);
$countPwd  = strlen($password);
if($countUser < 6 || $countUser > 15 || $countPwd < 6 || $countPwd > 15){
	session_destroy();
	exit('lamgiday');
}
if(!preg_match('/^[a-z0-9_]+$/', $username)){
	session_destroy();
	exit('lamgiday');
}
$checkIp = $pdo->prepare("SELECT COUNT(`id`) AS total FROM `user` WHERE `ip` = ?");
$checkIp->execute(array($ip));
if((int)$checkIp->fetch(PDO::FETCH_ASSOC)['total'] >= 2){
	session_destroy();
	exit('lamgiday');
}

$pdo->prepare("INSERT INTO `user` (`username`, `password`, `ip`) VALUES (?,?,?)")
    ->execute(array($username, web_password_hash($password), $ip));
$_SESSION['username'] = $username;
exit('taoaccmoi');
