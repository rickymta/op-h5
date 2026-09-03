
<?php


error_reporting(0);
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);


session_start();

 if (!isset($_SESSION['last_post_time']) || (time() - $_SESSION['last_post_time']) > 1) {
 $_SESSION['last_post_time'] = time();

date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo = new PDO("mysql:host=localhost;dbname=web","root","__MYSQL_ROOT_PASSWORD__");; // khai báo db tcg
$pdo->exec('set names utf8');

if(!$_SESSION['username']){
    exit;
}

// chống sqli
$getfilter="'|(and|or)\\b.+?(>|<|=|in|like)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$postfilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$cookiefilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
function StopAttack($StrFiltKey,$StrFiltValue,$ArrFiltReq){
    if(is_array($StrFiltValue)){
        $StrFiltValue=implode($StrFiltValue);
    }
    if (preg_match("/".$ArrFiltReq."/is",$StrFiltValue)==1){
        exit('Đi chỗ khác chơi đi bạn ơi!');
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
$username = $_SESSION['username'];
$getData = $pdo->query("SELECT * FROM `tichluy`  ")->fetchAll();
$getTime = $pdo->query("SELECT * FROM `timetichluy` WHERE `type` = 1 ")->fetch();
$startTime = $getTime["starttime"];
$endTime = $getTime["endtime"];
$currentTime = time();
$targetTime = strtotime($endTime);
$remainingSeconds = $targetTime - $currentTime;
$remainingDays = floor($remainingSeconds / (24 * 60 * 60));
$daytichluy = floor($remainingSeconds / (24 * 60 * 60));
$sql = "SELECT SUM(menhgia) AS total FROM `card_log` WHERE `status` = 'Thành công' AND `username` = :username AND `menhgia` > 0 AND `date` BETWEEN :start_time AND :end_time";

$stmt = $pdo->prepare($sql);
$stmt->bindParam(':username', $username, PDO::PARAM_STR);
$stmt->bindParam(':start_time', $startTime, PDO::PARAM_STR);
$stmt->bindParam(':end_time', $endTime, PDO::PARAM_STR);
$stmt->execute();
$getTotal = $stmt->fetch();



$tongNap =  $getTotal['total'];
$getServer = $pdo->query("SELECT * FROM tcg.srv_game ORDER BY `id` DESC")->fetchAll();
$getXu = $pdo->query("SELECT * FROM user WHERE `username` = '$username' ")->fetch();
$getUid = $pdo->query("SELECT * FROM tcg.account WHERE `username` = '$username' ")->fetch()['uid'];
$getRole = $pdo->query("SELECT * FROM tcg.account_master WHERE `account_uid` = '$getUid' ")->fetchAll();
$getBuy = $pdo->query("SELECT * FROM sellcoin WHERE `status` = 1 ORDER BY `num` DESC")->fetchAll();

$getShop = $pdo->query("SELECT * FROM webshop ORDER BY `id` DESC")->fetchAll();


function get10ngay($n, $i){
    $startDate = new DateTime($n);
    $endDate = clone $startDate;
    $endDate->modify('+10 days');
    $currentDate = new DateTime();
    $interval = $currentDate->diff($endDate);
    $daysRemaining = $interval->days;
    if ($currentDate < $endDate) {
        echo '<button onclick="btn10ngay('.$daysRemaining.')" class="btn btn-danger">Thu hồi</button>';
        // thieu ngay nen k cho thu hoi
    } else {       
        echo '<button onclick="btnThuhoi('.$i.')" class="btn btn-danger">Thu hồi</button>';
        // qua 10 ngay r thi cho thu hoi
    }
}



$priceCoin = 20; // giá 1 con = 20 xu ông
$wcoin = 100223; // id wcoin
$soluongban = 5000; // số lượng cho phép bán



switch($get['act']){
    case 'nhan':
        $data = explode("|", $post['role']);
        $moc = $post['moc'];
        $role = $data[0];
        $srv = $data[1];
        $getLog = $pdo->query("select * from `tichluy_log` where `username` = '$username' and `moc` = '$moc' ")->fetch();
        if($getLog == true){
            exit("Bạn đã nhận mốc này rồi");
        }
        if($tongNap <=0 || $tongNap < $moc){
            exit('false');
        }else{
            $getItem = $pdo->query("SELECT * FROM `tichluy` WHERE `moc` = '$moc' ")->fetch();
            // $json = json_decode($getItem['item'], true);           
            $item = $getItem['item'];
            $num = $getItem['moc'];

                $post = [
                    'qu' => $srv,
                    'sqm' => '111111',
                    'usr'   => $role,
                    'bao'   => 0,
                    'num'   => $num,
                    'item'   => $item,
                    'text'  => number_format($moc). ' vnđ',
                    'gnxz'   => 2
                ];
                $ch = curl_init('http://127.0.0.1/gmhanglong/gm/tichluy.php');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
                $response = curl_exec($ch);
                curl_close($ch);
            }
           $pdo->prepare("INSERT INTO `tichluy_log` (`username`, `role`, `moc`, `server`) VALUES (?, ?, ?, ?)")->execute(array($username, $role, $moc, $srv));
        
    break;
    case 'data':
        $data = explode("|", $get['data']);
        $role = $data[0];
        $srv = $data[1];
        $post = [
            'qu' => $srv,
            'sqm' => '111111',
            'usr'   => $role,
            'bao'   => 0,
            'gnxz'   => 999
        ];
        $ch = curl_init('http://127.0.0.1/gmhanglong/gm/coin.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
        $response = curl_exec($ch);
        curl_close($ch);
        $json = json_decode($response, true);
        foreach($json['data'] as $val){
            $id = $val['id'];
            $num = $val['num'];
            $name = $val['name'];
            $iditem = $val['iditem'];
            $hexItem = $val['id'];

            if($wcoin == $iditem){
                $itemTrue = $name." x".$num;
                $na = $name;
                $nu = $num;
                $id = $hexItem;
            }                 
        }
        
    break;  
    case'sell':
        $posNum = $post['num'];
        $role = $post['roles'];
        $srv = $post['srvs'];
        if($post['num'] < $soluongban){
            exit("bạn không đủ số lượng ". $soluongban);
        }elseif($post['num'] > $post['realNum'] ){
            exit("coin của bạn đâu nhiều tối mức đó");
        }else{
        $post = [
            'qu' => $post['srvs'],
            'sqm' => '111111',
            'usr'   => $post['roles'],
            'bao'   => 0,
            'gnxz'   => 3,
            'iddel'   => $post['idDel'],
            'numdel'   => $post['num']
        ];
            echo "thành công";
            $ch = curl_init('http://127.0.0.1/gmhanglong/gm/coin.php');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
            $response = curl_exec($ch);
            curl_close($ch);
            $price = $priceCoin * $posNum; // 20 * 5000 hay nhân ông nhỉ nhana chu
            $pdo->prepare("INSERT INTO `sellcoin` (`username`, `price`, `num`, `role`, `srv`) VALUES (?, ?, ?, ?, ?)")->execute(array($username, $price, $posNum, $role, $srv));
        }
    break;
    case'buy':
        $xuCon = $getXu['xu'];
        $idBuys = $post['idBuy'];
        $data = $post['getRole'];
        $role = explode("|", $data)[0];
        $srv = explode("|", $data)[1];


        $idBuy = $pdo->query("SELECT * FROM `sellcoin` WHERE `id` = '$idBuys' AND `status` = 1 LIMIT 1")->fetch();

        if($idBuy == false){
            exit("Bạn đã mua món này rồi!");
        }

        $usersell = $idBuy['username'];
        $buynum = $idBuy['num'];
        $pricebuy = $idBuy['price'];
        $buyId = $idBuy['id'];
        $srvsell = $idBuy['srv'];
        $rolesell = $idBuy['role'];

        if($xuCon <= 0 || $xuCon < $idBuy['price']){
            exit('Bạn không đủ xu');
        }else{
            $post = [
                'qu' => $srv,
                'sqm' => '111111',
                'usr'   => $role,
                'bao'   => 0,
                'gnxz'   => 2,
                'item'   => "3:".$wcoin,
                'content'   => "Bạn vừa mua thành công ".number_format($buynum)." coin từ tài khoản ". $usersell,
                'num'   => $buynum
            ];
                $ch = curl_init('http://127.0.0.1/gmhanglong/gm/coin.php');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
                $response = curl_exec($ch);
                curl_close($ch);

                $pdo->prepare("INSERT INTO `sellcoin_log` (`usersell`, `userbuy`, `rolebuy`, `numbuy`, `pricebuy`, `srvbuy`) VALUES (?, ?, ?, ?, ?, ?)")->execute(array($usersell, $username, $role, $buynum, $pricebuy, $srv));
                
                $pdo->prepare("UPDATE `sellcoin` SET `status` = 0 WHERE `id` = ?")->execute(array($buyId));
                
                $pdo->prepare("UPDATE `user` SET `xu` = `xu` - ? WHERE `username` = ?")->execute(array($pricebuy, $username));

                $pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")->execute(array($pricebuy, $usersell));

                

            //////// mua thành công gửi thư cho thằng bán

            $post = [
                'qu' => $srvsell, //sv thawngf ban va sv thang mua khac nhau ma ong
                'sqm' => '111111',
                'usr'   => $rolesell,
                'bao'   => 0,
                'gnxz'   => 22,
                'item'   => "0:0", // món cho thằng bán đi ông cho tiền đồng đc r mà
                'contentMail'   => "Bạn vừa bán thành công ".number_format($buynum)." coin cho tài khoản ". $username ." hãy ra web kiểm tra xu",
                'num'   => 1
            ];
                
                $ch = curl_init('http://127.0.0.1/gmhanglong/gm/coin.php');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
                $response = curl_exec($ch);
                curl_close($ch);
                exit("Thành Công");
        }
    break;
    case'thuhoi':
        $id = $post['idItem'];
        $getData = $pdo->query("SELECT * FROM `sellcoin` WHERE `id` = '$id' AND `status` = 1 ")->fetch();
        if($getData == false){
            exit('Thu Hồi làm đéo gì mà lắm thế?');
        }

        $role = $getData['role'];
        $srv = $getData['srv'];
        $num = $getData['num'];
        $post = [
            'qu' => $srv, //sv thawngf ban va sv thang mua khac nhau ma ong
            'sqm' => '111111',
            'usr'   => $role,
            'bao'   => 0,
            'gnxz'   => 2,
            'titleThuhoi'   => "Thu Hồi Coin",
            'item'   => "3:".$wcoin, // món cho thằng bán đi ông cho tiền đồng đc r mà
            'content'   => "Bạn vừa thu hồi thành công ".number_format($num)." coin.",
            'num'   => $num
        ];
            
            $ch = curl_init('http://127.0.0.1/gmhanglong/gm/coin.php');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
            $response = curl_exec($ch);
            curl_close($ch);

            $pdo->prepare("INSERT INTO `sellcoin_log` (`usersell`, `rolebuy`, `numbuy`, `srvbuy`, `type`) VALUES (?,?,?,?,?)")->execute(array($username, $role, $num, $srv, 'Thu Hồi'));

            $pdo->prepare("UPDATE `sellcoin` SET `status` = 0 WHERE `id` = ?")->execute(array($id));

            exit("Thành Công");
    break;

    case 'muashop':
        $itemNum = $post['itemNum'];
        $item = $post['item'];
        $getrole = $post['role'];

       $srv = explode("|", $getrole)[1];
       $role = explode("|", $getrole)[0];

        $infoShop = $pdo->query("select * from `webshop` where `id` = '$item' limit 1 ")->fetch();
        $price = $infoShop['price'];
        $itemID = $infoShop['item'];
        $itemName = $infoShop['name'];
        $totalPrice =  $price*$itemNum;

		
        if($itemNum <=0){
            exit("Số lượng phải lớn hơn 0");
        }
        if(!$itemNum || !$item || !$getrole){
            exit("Vui lòng chọn đúng thông tin");
        }
        if($getXu['xu'] <= 0 || $totalPrice > $getXu['xu']){
            exit("Bạn không đủ xu");
        }else{
            $postdata = [
                    'qu' => $srv,
                    'sqm' => '111111',
                    'usr'   => $role,
                    'bao'   => 0,
                    'num'   => $itemNum,
                    'item'   => $itemID,
                    'gnxz'   => 2
                ];
                $ch = curl_init('http://127.0.0.1/gmhanglong/gm/webshop.php');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
                $response = curl_exec($ch);
                curl_close($ch);
        }

           $pdo->prepare("INSERT INTO `webshop_log` (`username`, `role`, `srv`, `item`, `num`, `price`) VALUES (?, ?, ?, ?,?,?)")->execute(array($username, $role, $srv, $itemID, $itemNum, $totalPrice));
           $pdo->prepare("UPDATE `user` SET `xu` = `xu` - ? WHERE `username` = ?")->execute(array($totalPrice, $username));
           exit("Bạn đã mua thành công");
        
    break;
}
}else{
    echo "Bạn đã thao tác quá nhanh";
    unset($_SESSION['last_post_time']);
    exit('<script>top.location.reload();</script>');
}