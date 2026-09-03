<?php
include '../api/config.php';
$username = strtolower($_GET['u']); // Note: Changed from $get to $_GET
$password = $_GET['p']; // Note: Changed from $get to $_GET
$sql = "SELECT * FROM user WHERE username = :username AND password = :password";
$stmt = $pdo->prepare($sql);
$stmt->bindParam(':username', $username);
$stmt->bindParam(':password', $password);
$stmt->execute();

if($stmt->rowCount() > 0){
    $_SESSION['username'] = $username;
    exit('true');
}else{
    // Check if the username exists, if not, insert it
    $sql2 = "SELECT * FROM user WHERE username = :username";
    $stmt2 = $pdo->prepare($sql2);
    $stmt2->bindParam(':username', $username);
    $stmt2->execute();

    if($stmt2->rowCount() === 0){
        $pdo->prepare("INSERT INTO `user` (`username`, `password`, `ip`) VALUES (?,?,?)")->execute(array($username, $password, $ip)); // Note: Added $ip variable, assuming it's defined elsewhere
        $_SESSION['username'] = $username;
        exit('taoaccmoi');
    } else {
        session_destroy();
        exit('lamgiday');
    }
	

    
}
?>