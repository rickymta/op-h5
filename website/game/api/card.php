<?php
include './config.php';
$_SESSION['username'] = $post['tentaikhoan'];
$task_id = $_SESSION['username'].'_'.time();
$post = [
    'APIkey' => '__THESIEUTOC_API_KEY__',
    'type' => $post['type'],
    'seri' => $post['seri'],
    'mathe' => $post['mathe'],
    'menhgia' => $post['menhgia'],
    'content' => $task_id
];
$ch = curl_init('https://thesieutoc.net/chargingws/v2');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
$response = curl_exec($ch);
curl_close($ch);
$json = json_decode($response);
if($json->status == 00){
	$result = $pdo->prepare("INSERT INTO `card_log` (`username`, `task_id`, `seri`, `pin`, `phuongthuc`, `menhgia`, `status`) VALUES (?,?,?,?,?,?,?)")->execute(array($_SESSION['username'], $task_id, $post['seri'], $post['mathe'], $post['type'], $post['menhgia'], 'Chờ duyệt'));
	exit('{"msg":"'.$json->msg.'","check":"success"}');	
}else{
	exit('{"msg":"'.$json->msg.'","check":"error"}');
}
