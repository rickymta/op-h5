<?php
require_once __DIR__ . '/../config/auth.php';
$GM = gm_require(true);

error_reporting(0);
$qu = $_POST['qu'];
$sqm = $_POST['sqm'];
$usr = $_POST['usr'];
$cdk = $_POST['cdk'];
$sqm = str_replace(array(' ','%'),'',$sqm);
$usr = str_replace(array(' ','%'),'',$usr);
$cdk = str_replace(array(' ','%'),'',$cdk);
$qu =='' && (die('Khu vực phải được chọn'));
$cdk =='' && (die('Vui lòng nhập CDKEY'));
$usr =='' && (die('Vui lòng nhập tên nhân vật'));
$sqm =='' && (die('Vui lòng đặt mật khẩu SDK'));
include "../config/config.php";
$mysql = mysqli_connect($PZ['DB_HOST'],$PZ['DB_USER'],$PZ['DB_PWD'],$PZ['DB_NAME'],$PZ['DB_PORT']) or die("Lỗi kết nối cơ sở dữ liệu");
$mysql->query('set names utf8');
//查询角色
$roleName = urlencode($usr);
$headers[]  =  "Content-Type: application/json";
$headers[]  =  "Login-Token:{$res}";
$url = $PZ['NAME_URL']."role/record/list?srvCode={$qu}&roleName={$roleName}&page=1&pageSize=10"; 
$res = get_content($url, $headers);
$uid = json_decode($res); 
$rid = $uid->data->records['0']->roleId; //角色ID
var_dump($rid);
$rid =='' && (die('Không có tên nhân vật như vậy, vui lòng kiểm tra và thử lại'));
$xxx = mysqli_fetch_assoc($mysql->query("SELECT * FROM cdk WHERE cdk = '$cdk' limit 1"));
$xxx['id'] == '' && (die('Không có thẻ ủy quyền như vậy'));
$xxx['status'] != 0 && (die('Thẻ ủy quyền này đã được sử dụng'));
$lx = $xxx['type'] + 100;
$ss = mysqli_fetch_assoc($mysql->query("SELECT type FROM cdk WHERE uid = '$rid' limit 1"));
$xlx = $ss['type'] + 100;

if($xlx == 100){
    if($mysql->query("UPDATE cdk SET status = 1 , uid = '$rid', pass = '$sqm' WHERE cdk = '$cdk';")){
        die('Ủy quyền vai trò thành công! Vui lòng giữ mật khẩu nền bạn đã đặt đúng');
    }else{
	    die('Ủy quyền không thành công. Vui lòng liên hệ với quản trị viên');
    }
}elseif($xlx == $lx){
    die('Vai trò này đã là người dùng được ủy quyền và không cần phải kích hoạt lại');
}elseif($xlx < $lx){
    $mysql->query("DELETE FROM cdk WHERE uid = '$rid' limit 1");
    if($mysql->query("UPDATE cdk SET status = 1 , uid = '$rid', pass = '$sqm' WHERE cdk = '$cdk';")){
        die('Ủy quyền vai trò thành công! Vui lòng giữ mật khẩu nền bạn đã đặt đúng');
    }else{
	    die('Ủy quyền không thành công. Vui lòng liên hệ với quản trị viên');
    }
}elseif($xlx > $lx){
    die('Vai trò này đã là người dùng được ủy quyền và không cần phải kích hoạt lại');
}
?>