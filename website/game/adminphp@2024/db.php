<?php
error_reporting(1);
session_start();
date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo = new PDO("mysql:host=127.0.0.1;dbname=web","root","__MYSQL_ROOT_PASSWORD__");
$pdo->exec('set names utf8');

$getfilter="'|(and|or)\\b.+?(>|<|=|in|like)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$postfilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$cookiefilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
function StopAttack($StrFiltKey,$StrFiltValue,$ArrFiltReq){
	if(is_array($StrFiltValue)){
		$StrFiltValue=implode($StrFiltValue);
	}
	if (preg_match("/".$ArrFiltReq."/is",$StrFiltValue)==1){
		exit('Hack gì đấy');
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
$post = $_POST;
$get = $_GET;
$act= $get['act'];

// Moi thao tac tru 'login' deu phai co phien admin. Truoc day switch chay khong
// kiem tra gi, nen bat ky ai POST db.php?act=xu cung cong duoc xu cho tai khoan.
function requireAdmin(){
	if(empty($_SESSION['admin'])){
		http_response_code(403);
		exit('Chua dang nhap');
	}
}
$today = date("Y-m-d");
$newdate = strtotime ( '-1 day' , strtotime ( $today ) ) ;
$newdate = date ( 'Y-m-d' , $newdate );
$gettime = $pdo->query("SELECT * FROM user ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
$member = $pdo->query("SELECT * FROM user ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
$lognapbank = $pdo->query("SELECT * FROM card_log ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
$lognapthe = $pdo->query("SELECT * FROM card_log ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
$logrut = $pdo->query("SELECT * FROM log_xu ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
$tongnapthe = $pdo->query("select sum(menhgia) as total from card_log where  phuongthuc in ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status in ('Thành công')")->fetch();
$napthehomqua = $pdo->query("select sum(menhgia) as total from card_log where  DATE(date) = '$newdate' AND phuongthuc in ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status in ('Thành công')")->fetch();
$napthehomnay = $pdo->query("select sum(menhgia) as total from card_log where  DATE(date) = '$today' AND phuongthuc in ('1','2','3','4','5','6','7','8','9','10','Viettel','Mobifone','Vinaphone','Zing','Vietnamobile','Vcoin','Gate') AND status in ('Thành công')")->fetch();
$tongnapbank = $pdo->query("select sum(menhgia) as total from card_log where  phuongthuc in ('bank','autoACB')")->fetch();
$tongnapmomo = $pdo->query("select sum(menhgia) as total from card_log where  phuongthuc in ('momo','momo')")->fetch();
$napbankhomqua = $pdo->query("select sum(menhgia) as total from card_log where DATE(date) = '$newdate' AND phuongthuc in ('bank','autoACB')")->fetch();
$napmomohomqua = $pdo->query("select sum(menhgia) as total from card_log where DATE(date) = '$newdate' AND phuongthuc in ('momo','momo')")->fetch();
$napbankhomnay = $pdo->query("select sum(menhgia) as total from card_log where DATE(date) = '$today' AND phuongthuc in ('bank','autoACB')")->fetch();
$napmomohomnay = $pdo->query("select sum(menhgia) as total from card_log where DATE(date) = '$today' AND phuongthuc in ('momo','momo')")->fetch();
$tongacc = $pdo->query("select COUNT(Id) as total from user ")->fetch();
$tongacchomnay = $pdo->query("select COUNT(Id) as total from user WHERE DATE(time) = '{$today}'")->fetch();
$tongacchomqua = $pdo->query("select COUNT(Id) as total from user WHERE DATE(time) = '{$newdate}'")->fetch();

switch ($act) {
    case 'login':
        $username = $post['username'];
        $password = $post['password'];
        $sql = "SELECT * FROM admin_user WHERE username = :username AND password = :password";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':password', $password);
        $stmt->execute();

        if(!$username||!$password){
            exit('Vui lòng nhập tài khoản và mật khẩu');
        }else{
        //    $result = $pdo->query("select * from admin_user where username = '$username' and password = '$password' ")->fetch();
            if($stmt->rowCount() < 1){
                exit('tài khoản hoặc mk ko đúng');
            }else{
                $_SESSION['admin'] = $username;
                exit('true');
            }
        }
    break;
    case 'thoat':
        unset($_SESSION['admin']);
        header('location: /admin');
    break;    
    case 'xu':
        requireAdmin();
        $username = $post['username'];
        $xu = $post['xu'];
        $xuthat = $xu/3;
        if(!$username || !$xu){
            exit('Nhập tài khoản và xu đi');
        }else{
            $pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")->execute(array($xu,$username));
            $pdo->prepare("INSERT INTO `card_log` (`username`, `task_id`, `phuongthuc`, `status`, `menhgia`) VALUES (?,?,?,?,?)")->execute(array($username, 'tay', 'bank', 'Thành công', $xuthat));
            exit('true');
        }
    break;
    case 'xusk':
        requireAdmin();
        $username = $post['username'];
        $xu = $post['xu'];
        if(!$username || !$xu){
            exit('Nhập tài khoản và xu đi');
        }else{
            $pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")->execute(array($xu,$username));
            exit('true');
        }
    break;     

    case 'code':
        requireAdmin();
        $code = $post['code'];
        $item = $post['item'];
        $loaicode = $post['loaicode'];
        if(!$code || !$item || !$loaicode){
            exit('Nhập thông tin đi');
        }else{
            $pdo->prepare("INSERT INTO `giftcode` (`code`, `item`, `noidungcode`) VALUES (?,?,?)")->execute(array($code,$item,$loaicode));
            exit('true');
        }
    break;    
    case 'edit':
        requireAdmin();
        $code = $post['code'];
        $item = $post['item'];
        $idcode = $post['idcode'];
        $loaicode = $post['loaicode'];
        if(!$code || !$item || !$loaicode){
            exit('Nhập thông tin đi');
        }else{
            $pdo->prepare("UPDATE `giftcode` SET `code` = ?, `item` = ?, `noidungcode` =? WHERE `id` = ?")->execute(array($code,$item,$loaicode,$idcode));
            exit('true');
        }
    break;     
    case 'getidcode':
        requireAdmin();
        $stmtG = $pdo->prepare("SELECT `item` FROM `giftcode` WHERE `id` = ?");
        $stmtG->execute(array($get['id']));
        $rowG = $stmtG->fetch(PDO::FETCH_ASSOC);
        echo $rowG ? $rowG['item'] : '';
    break;
    case 'del':
        requireAdmin();
        echo $pdo->prepare("DELETE FROM `giftcode` WHERE `id` = ?")->execute(array($get['id']));
    break; 

}