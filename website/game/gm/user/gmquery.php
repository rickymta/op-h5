<?php
include '../config.php';
include './function/common.php';


$checknum   = trim(poststr('checknum'));    //gm码
$type       = trim(poststr('type'));        //请求类型
$uid        = trim(poststr('uid'));         //账户id

$quarr = get_qu_list();
$quid       = trim(poststr('qu'));          //区号
$qu         = $quarr[$quid];                    //区数据
$dbip       = $qu['host'];                      //区ip
$dbname     = $qu['dbname'];
$dbuser     = $qu['user'];
$dbpwd      = $qu['pwd'];
$quname     = $qu['name'];
$signkey    = $qu['key'];
//$url        = $qu['url'];
$s          = $qu['code'];

if($checknum  != $gmcode){
    exit('GM码不对');
}

if($quid < 1 || $quid == ''){
    exit('区号错误');
}


/*处理程序*/
//处理充值的和邮件
if($type == 'charge' || $type == 'mail'){
    if(empty($uid)){
        exit('请输入正确的账号!');
    }
    $playerId = get_user_info($dbip,$dbuser,$dbpwd,$dbname,$uid,$quname);
    switch ($type) {
        case 'charge':
            $chargetype = trim(poststr('chargetype'));
            $chargenum = trim(poststr('chargenum'));
            send_charge($dbip,$dbuser,$dbpwd,$dbname,$playerId,$chargetype,$chargenum,$s);
            break;
        case 'mail':
            $title = trim(poststr('title'));
            $content = trim(poststr('content'));
            $reward = trim(poststr('item')).':'.trim(poststr('num'));
            send_email($dbip,$dbuser,$dbpwd,$dbname,$playerId,$title,$content,$reward,$s);
            break;
        default:
            exit('系统异常，请重试!');
            break;
    }
}

//处理全服邮件的
if($type == 'quanfu'){
    $server= trim(poststr('qu'));
    $servername = '正式'.$server.'区';
    $title = trim(poststr('title'));
    $content = trim(poststr('content'));
    $reward = trim(poststr('item')).':'.trim(poststr('num'));

    send_all_email($dbip,$dbuser,$dbpwd,$dbname,$title,$content,$reward,$servername,$s);
}
