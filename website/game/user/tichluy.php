<?php
session_start();
if(!$_SESSION['username']){
	exit;
}
?>
<iframe style="height: 70vh; border: 0;" src="/new"></iframe>