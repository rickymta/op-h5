<?php
include './config.php';
$payid = $get['payid'];
$username = "";
if(isset($get['user'])){
    $username = $get['user'];
} else {
    $username =$_SESSION['username'];

}
$xu = $info['xu'];
$file = fopen("./id.txt", "r");
while (!feof($file)) {
    $line = fgets($file);
    $txts = explode(';', $line);
    if ($txts[0] == $payid) {
        $truxu = trim($txts[1]);
        break;
    }
}
fclose($file);
if($xu <= 0 or $xu < $truxu){
	exit('false');
}else{
	exit('true');
}
?>