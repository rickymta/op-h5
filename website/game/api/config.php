<?php
error_reporting(0);
session_start();
date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo = new PDO("mysql:host=localhost;dbname=web","root","__MYSQL_ROOT_PASSWORD__");
$pdo->exec('set names utf8');
$get = $_GET;
$post = $_POST;
$getfilter="'|(and|or)\\b.+?(>|<|=|in|like)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$postfilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$cookiefilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
function StopAttack($StrFiltKey,$StrFiltValue,$ArrFiltReq){
	if(is_array($StrFiltValue)){
		$StrFiltValue=implode($StrFiltValue);
	}
	if (preg_match("/".$ArrFiltReq."/is",$StrFiltValue)==1){
		exit('Lỗi không xác định!');
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
//if(isset($get["u"])){
//	$username = strtolower($get['u']);
//		$password = $get['p'];
//		if(!$username || !$password){
//			exit('{"msg":"L\u01b0u \u00fd! Vui l\u00f2ng nh\u1eadp \u0111\u1ee7 c\u00e1c tr\u01b0\u1eddng!","check":"error"}');
//		}else{
//			$result = $pdo->query("select * from user where username = '$username' and password = '$password' limit 1")->fetch();
//			if($result == false){
//				exit('{"msg":"L\u01b0u \u00fd! Vui L\u00f2ng Ki\u1ec3m Tra T\u00e0i Kho\u1ea3n Ho\u1eb7c M\u1eadt Kh\u1ea9u!","check":"error"}');
//			}else{
//				$_SESSION['username'] = $username;
//				$pdo->prepare("UPDATE `user` SET `ip` = ?, `time` = NOW() WHERE `username` = ?")->execute(array($ip,$username));
			//	echo "login thanh cong";
			//	exit('{"msg":"\u0110\u0103ng nh\u1EADp th\u00E0nh c\u00F4ng","check":"success"}');
//			}
//		}
//}
function hide(){
	return ($_SESSION['username'] != '') ? 'display_none' : 'display_block';
}
if(isset($_SESSION['username'])){
	$loginName = $_SESSION['username'];
	$info = $pdo->query("select * from user where username = '$loginName'")->fetch();
	$knb = $pdo->query("select * from knb")->fetchall();
	$logPay = $pdo->query("select * from card_log where username = '$loginName' order by id desc")->fetchall();
	$logxu = $pdo->query("select * from log_xu order by id desc")->fetchall();
	$getSid = $pdo->query("select * from server order by id desc")->fetchall();
	$tichluy = $pdo->query("select * from tichluy ")->fetchall();
	$totalPay = $pdo->query("select sum(menhgia) as total from card_log where username = '$loginName' and status = 'Thành công' ")->fetch();
}
// check phone
$GLOBALS["carriers_number"] = [
    '096' => 'Viettel',
    '097' => 'Viettel',
    '098' => 'Viettel',
    '032' => 'Viettel',
    '033' => 'Viettel',
    '034' => 'Viettel',
    '035' => 'Viettel',
    '036' => 'Viettel',
    '037' => 'Viettel',
    '038' => 'Viettel',
    '039' => 'Viettel',

    '090' => 'Mobifone',
    '093' => 'Mobifone',
    '070' => 'Mobifone',
    '071' => 'Mobifone',
    '072' => 'Mobifone',
    '076' => 'Mobifone',
    '078' => 'Mobifone',

    '091' => 'Vinaphone',
    '094' => 'Vinaphone',
    '083' => 'Vinaphone',
    '084' => 'Vinaphone',
    '085' => 'Vinaphone',
    '087' => 'Vinaphone',
    '089' => 'Vinaphone',

    '099' => 'Gmobile',

    '092' => 'Vietnamobile',
    '056' => 'Vietnamobile',
    '058' => 'Vietnamobile',

    '095'  => 'SFone'
];
function start_with($needle, $haystack) {
    $length = strlen($needle);
    return (substr($haystack, 0, $length) === $needle);
}
function detect_number ($number) {
    $number = str_replace(array('-', '.', ' '), '', $number);
    if (!preg_match('/^0[0-9]{9,9}$/', $number)) return false;
    $start_numbers = array_keys($GLOBALS["carriers_number"]);
    foreach ($start_numbers as $start_number) {
        if (start_with($start_number, $number)) {
            return $GLOBALS["carriers_number"][$start_number];
        }
    }
    return false;
}
// end check phone



$ip = $_SERVER['REMOTE_ADDR'];
$act = $get['act'];
switch($act){
	case 'nhanxu':
		$username = $_SESSION['username'];	
		$today = date("Y-m-d");
		$xu = 50000; // mỗi ngày cho 50k xu
		$todayReceivedCheck = $pdo->query("SELECT id FROM diemdanh WHERE username = '$username' AND DATE(time) = '$today' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
		if ($todayReceivedCheck !== false) {
			exit('{"status": "0", "msg":"Hôm nay bạn đã điểm danh"}');
		}
		$todayIpCheck = $pdo->query("SELECT id FROM diemdanh WHERE DATE(time) = '$today' AND ip = '$ip' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
		if ($todayIpCheck != false) {
			exit('{"status": "0", "msg":"Hôm nay IP của bạn đã nhận điểm danh"}');
		}
		$userCheck = $pdo->query("SELECT id FROM diemdanh WHERE username = '$username' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
		if ($userCheck == false) {
		$pdo->prepare("INSERT INTO diemdanh (username, ip, time) VALUES (?,?,?)")->execute(array($username, $ip, date('Y-m-d H:i:s')));	
		$pdo->prepare("UPDATE user SET xu = xu + ? WHERE username = ?")->execute(array($xu, $username));
			exit('{"status": "1", "msg":"Điểm danh thành công, bạn nhận được' .number_format($xu).' Xu"}');
		} else {
		$pdo->prepare("UPDATE diemdanh SET ip = ?, time = ? WHERE username = ?")->execute(array($ip, date('Y-m-d H:i:s'), $username));
		$pdo->prepare("UPDATE user SET xu = xu + ? WHERE username = ?")->execute(array($xu, $username));
			exit('{"status": "1", "msg":"Điểm danh thành công, bạn nhận được' .number_format($xu).' Xu"}');
		}
	break;	
	case 'login':
		$username = strtolower($post['username']);
		$password = $post['password'];
		if(!$username || !$password){
			exit('Vui lòng nhập tài khoản và mật khẩu.');
		}else{
			//$result = $pdo->query("select * from user where username = '$username' and password = '$password' limit 1")->fetch();
			$sql = "SELECT * FROM user WHERE username = :username AND password = :password";
			$stmt = $pdo->prepare($sql);
			$stmt->bindParam(':username', $username);
			$stmt->bindParam(':password', $password);
			$stmt->execute();
			if($stmt->rowCount() > 0){
				$_SESSION['username'] = $username;
				$pdo->prepare("UPDATE `user` SET `ip` = ?, `time` = NOW() WHERE `username` = ?")->execute(array($ip,$username));
				exit('true');
			}else{
				exit('Tài khoản hoặc mật khẩu không đúng.');
			}
		}
	break;
	
	case 'mlogin':
		$username = strtolower($post['username']);
		$password = $post['password'];

			$sql = "SELECT * FROM user WHERE username = :username AND password = :password";
			$stmt = $pdo->prepare($sql);
			$stmt->bindParam(':username', $username);
			$stmt->bindParam(':password', $password);
			$stmt->execute();

		if(!$username || !$password){
			exit('{"msg":"L\u01b0u \u00fd! Vui l\u00f2ng nh\u1eadp \u0111\u1ee7 c\u00e1c tr\u01b0\u1eddng!","check":"error"}');
		}else{
			$result = $pdo->query("select * from user where username = '$username' and password = '$password' limit 1")->fetch();
			if($stmt->rowCount() > 0){
				$_SESSION['username'] = $username;
				$pdo->prepare("UPDATE `user` SET `ip` = ?, `time` = NOW() WHERE `username` = ?")->execute(array($ip,$username));
				exit('{"msg":"\u0110\u0103ng nh\u1EADp th\u00E0nh c\u00F4ng","check":"success"}');
			}else{
				exit('{"msg":"L\u01b0u \u00fd! Vui L\u00f2ng Ki\u1ec3m Tra T\u00e0i Kho\u1ea3n Ho\u1eb7c M\u1eadt Kh\u1ea9u!","check":"error"}');
			}
		}
	break;

	case 'reg':
		$username = strtolower($post['username']);
		$password = $post['password'];
		$email = strtolower($post['email']);
		$countUser = strlen($username);
		$countPwd = strlen($password);
		if(!$username || !$password || !$email){
			exit('Vui lòng nhập đầy đủ thông tin.');
		}else{			
				$checkUser = $pdo->query("select * from user where username = '$username' limit 1")->fetch();
				$checkMail = $pdo->query("select * from user where email = '$email' limit 1")->fetch();
				$checkIp = $pdo->query("select count(id) as total from user where ip = '$ip'")->fetch()['total'];
				if($countUser < 6 or $countUser > 15){
					exit('Tài khoản dài 6-15 ký tự.');
				}
				if($checkUser == true){
					exit('Tài khoản đã được sử dụng.');
				}
				if($countPwd < 6 or $countPwd > 15){
					exit('Mật khẩu dài 6-15 ký tự.');
				}
				if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
				exit('Email không đúng định dạng.');
				}
				$valMail = explode('@',$email)[1];
				if($valMail != 'gmail.com'){
					exit('Email phải là @gmail.com.');
				}
				if($checkMail == true){
					exit('Email đã được sử dụng.');
				}
				if($checkIp >= 2){
					exit('Bạn chỉ được phép tạo tối đa 2 tài khoản.');
				}else{
					$_SESSION['username'] = $username;
					$pdo->prepare("INSERT INTO `user` (`username`, `password`, `email`, `ip`) VALUES (?,?,?,?)")->execute(array($username, $password, $email, $ip));
					exit('true');
				}
		}
	break;
	
	case 'mreg':
		$ip = $_SERVER['REMOTE_ADDR'];
		$username = strtolower($post['username']);
		$countUser = strlen($username);
		$password = $post['password'];
		$repassword = $post['repassword'];
		$email = strtolower($post['email']);
		$checkUser = $pdo->query("select * from user where username = '$username' limit 1")->fetch();
		$checkMail = $pdo->query("select * from user where email = '$email' limit 1")->fetch();
		$checkIp = $pdo->query("select count(id) as total from user where ip = '$ip'")->fetch()['total'];
		$countUser = strlen($username);
		$countPwd = strlen($password);
		if(!$username || !$password || !$email){
			exit('{"msg":"Vui l\u00f2ng nh\u1eadp \u0111\u1ee7 c\u00e1c tr\u01b0\u1eddng!","check":"error"}');
		}
		if($countUser < 6 or $countUser > 15){
			exit('{"msg":"Tài khoản dài 6-15 ký tự.","check":"error"}');
		}
		if($checkUser == true){
			exit('{"msg":"T\u00E0i kho\u1EA3n \u0111\u00E3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng!","check":"error"}');
		}
		if($countPwd < 6 or $countPwd > 15){
			exit('{"msg":"Mật khẩu dài 6-15 ký tự.","check":"error"}');
		}
		if($password != $repassword){
			exit('{"msg":"Hai m\u1eadt kh\u1ea9u \u0111\u00e2ng nh\u1eadp kh\u00f4ng kh\u1edbp!","check":"error"}');
		}
		if(!filter_var($email, FILTER_VALIDATE_EMAIL)) {
			exit('{"msg":"Email kh\u00F4ng \u0111\u00FAng \u0111\u1ECBnh d\u1EA1ng!","check":"error"}');
		}
		$valMail = explode('@',$email)[1];
		if($valMail != 'gmail.com'){
			//echo $valMail;
			exit('{"msg":"Email ph\u1EA3i l\u00E0 gmail.com!","check":"error"}');
		}
		if($checkMail == true){
			exit('{"msg":"Email \u0111\u00E3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng!","check":"error"}');
		}
		if($checkIp >= 2){
			exit('{"msg":"Bạn chỉ được tạo tối đa 2 tài khoản!","check":"error"}');
		}else{
			$_SESSION['username'] = $username;
			$pdo->prepare("INSERT INTO `user` (`username`, `password`, `email`, `ip`) VALUES (?,?,?,?)")->execute(array($username, $password, $email, $ip));
			exit('{"msg":"\u0110\u0103ng k\u00FD th\u00E0nh c\u00F4ng","check":"success"}');
		}
	break;
	
	case 'logout':
		session_destroy();
		echo "<script>top.location.href='/play.html'</script>";
	break;
	
	case 'pwd':
		$passNew =  $post['password-new'];
		$passNew1 =$post['password1-new'];
		$passOld = $post['password-old'];
		$checkPwd = $pdo->query("select * from user where username = '$_SESSION[username]' limit 1")->fetch();
		$sdt = $post['sdt'];
		if($sdt == ''){
			$sdt = $checkPwd['phone'];
		}
		$checkSdt = detect_number($sdt);
		$checkPhone = $pdo->query("select * from user where phone = '$sdt' limit 1")->fetch();
		if(!$passOld){
			exit('{"msg":"Vui l\u00F2ng nh\u1EADp m\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i!","check":"error"}');
		}
		if($checkSdt == ''){
			exit('{"msg":"S\u1ED1 \u0111i\u1EC7n tho\u1EA1i kh\u00F4ng \u0111\u00FAng \u0111\u1ECBnh d\u1EA1ng!","check":"error"}');
		}
		
		if($post['sdt'] != ''){
			if($checkPhone == true){
			exit('{"msg":"S\u1ED1 \u0111i\u1EC7n tho\u1EA1i \u0111\u00E3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng!","check":"error"}');
		}
		}
		
		if($checkPwd['password'] != $passOld){
			exit('{"msg":"M\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i kh\u00f4ng \u0111\u00fang","check":"error"}');
		}
		if($passNew != $passNew1){
			exit('{"msg":"2 m\u1EADt kh\u1EA9u m\u1EDBi kh\u00F4ng gi\u1ED1ng nhau!","check":"error"}');
		}else{
			if($passNew == null){
				$passNew = $passOld;
			}
			$pdo->prepare("UPDATE `user` SET `phone` = ?, `password` = ? WHERE `username` = ?")->execute(array($sdt,$passNew,$_SESSION['username']));
			$pdo->prepare("UPDATE tcg.account SET password = ? WHERE username = ?")->execute(array($passNew,$_SESSION['username']));
			exit('{"msg":"C\u1EADp nh\u1EADt th\u00F4ng tin th\u00E0nh c\u00F4ng!","check":"success"}');
		}
	break;
}