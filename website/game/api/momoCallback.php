<?php
	$signature = "__MOMO_CALLBACK_SIGNATURE__";
	$DataInput  = json_decode(file_get_contents("php://input"));
	
	if(isset($DataInput->signature) and $DataInput->signature == $signature){
	    include './config.php';
	    
		$phone = $DataInput->phone; 				//số điện thoại Momo nhận tiền
		$tranId = $DataInput->tranId; 				//Mã giao dịch
		$ackTime = $DataInput->ackTime;				//thời gian giao dịch
		$partnerId = $DataInput->partnerId;			//Tài khoản gửi (nếu có)
		$partnerName = $DataInput->partnerName; 	//Tên tài khoản gửi (nếu có)
		$amount = $DataInput->amount;				//số tiền nhận được
		$noidung = $DataInput->comment; 			//Nội dung ghi chú
		$comment = explode("_",$noidung);
		
		if(!file_exists("temp/".$tranId.".log")){
    		$username = trim($comment[1]);
			$task_id = $username.'_'.time();
    		if($username != ""){
    		    $xuadd = $amount + round(($amount*0)/100); // đang km 20%
    		    $kmnap = 1.5; //0 là bt, 1 là km 100%, 2 là km 200%
    		    $xuaddthat = $kmnap*$amount + $xuadd;
    		    $pdo->prepare("UPDATE user SET xu = xu + ? WHERE username = ?")->execute(array($xuaddthat, $username));
                $pdo->prepare("INSERT INTO `card_log` (`username`, `task_id`, `phuongthuc`, `status`, `menhgia`) VALUES (?,?,?,?,?)")->execute(array($username, $task_id, 'momo', 'Thành công', $amount));
                file_put_contents("temp/".$tranId.".log",$tranId.' - '.$noidung);
                echo $username."-".$xuadd;
    		}
        	else{
        	    echo "Sai cu phap";
        	}
		}    
	}
	else{
		echo "Không có quyền truy cập!";
	}