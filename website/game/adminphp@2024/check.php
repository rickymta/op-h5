<?php
include('./db.php');

// Dữ liệu từ các URL
$all_data1 = array();
$all_data2 = array();
$all_data3 = array();
$all_data4 = array();
$all_data5 = array();

// Lấy dữ liệu từ URL đầu tiên
$url_1 = 'http://127.0.0.1/adminphp@2024/rev.php?key=__REV_QUERY_KEY__';
$response_1 = file_get_contents($url_1);
if ($response_1 !== false) {
    $data_1 = json_decode($response_1, true);
    if ($data_1 === null) {
        $data_1 = array();
    }
    $all_data1[] = $data_1;
}

// Lấy dữ liệu từ URL thứ hai
$url_2 = 'http://127.0.0.1/adminphp@2024/rev.php?key=__REV_QUERY_KEY__';
$response_2 = file_get_contents($url_2);
if ($response_2 !== false) {
    $data_2 = json_decode($response_2, true);
    if ($data_2 === null) {
        $data_2 = array();
    }
    $all_data2[] = $data_2;
}

// Lấy dữ liệu từ URL thứ ba
$url_3 = 'http://127.0.0.1/adminphp@2024/rev.php?key=__REV_QUERY_KEY__';
$response_3 = file_get_contents($url_3);
if ($response_3 !== false) {
    $data_3 = json_decode($response_3, true);
    if ($data_3 === null) {
        $data_3 = array();
    }
    $all_data3[] = $data_3;
}

// Lấy dữ liệu từ URL thứ tư
$url_4 = 'http://127.0.0.1/adminphp@2024/rev.php?key=__REV_QUERY_KEY__';
$response_4 = file_get_contents($url_4);
if ($response_4 !== false) {
    $data_4 = json_decode($response_4, true);
    if ($data_4 === null) {
        $data_4 = array();
    }
    $all_data4[] = $data_4;
}

// Lấy dữ liệu từ URL thứ năm
$url_5 = 'http://127.0.0.1/adminphp@2024/rev.php?key=__REV_QUERY_KEY__';
$response_5 = file_get_contents($url_5);
if ($response_5 !== false) {
    $data_5 = json_decode($response_5, true);
    if ($data_5 === null) {
        $data_5 = array();
    }
    $all_data5[] = $data_5;
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
  <title>VL5B Tool</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.5.1.js"></script>
  <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
  
</head>
<body>

<div class="container mt-3">
  <h2>VL5B Tool</h2>
<ul class="nav nav-tabs">
    <li class="nav-item">
      <a class="nav-link active">Chào, <?=$_SESSION['admin']?></a>
    </li>
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">Chức năng</a>
      <ul class="dropdown-menu">
      </ul>
    </li>
  </ul>
  
 <div class="my-3">
     <h1 class="offcanvas-title" ><font color=red>Thống kê số liệu Game</font></h1>
     <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                         <tr class="table-danger">
                            <th class="table-danger">Game:</th>
                            <th class="table-danger">VL5B</th>
                            <th class="table-danger">OP</th>
                            <th class="table-danger">Hero</th>
                            <th class="table-danger">7ball</th>
                            <th class="table-danger">Natra</th>
                           
                        </tr>

                       </thead>
                       <thead>
                      
                      </thead> 
                       <thead>
                         <tr class="table-danger">
                            <th class="table-danger">Tổng Doanh Thu:</th>
                            <th class="table-danger"><font color=red><?=number_format($data_1['Tổng Nạp'])?></font></th>
                            <th class="table-danger"><font color=red><?=number_format($data_2['Tổng Nạp'])?></font></th>
                            <th class="table-danger"><font color=red><?=number_format($data_3['Tổng Nạp'])?></font></th>
                            <th class="table-danger"><font color=red><?=number_format($data_4['Tổng Nạp'])?></font></th>
                            <th class="table-danger"><font color=red><?=number_format($data_5['Tổng Nạp'])?></font></th>
                           
                        </tr>

                       </thead>   
                    <thead>
                      
                    </thead>
                    <tbody>
                        <tr>
                        <td><b><font color=blue>Tổng Nạp Hôm Kia</font></b></td>
                            <td><font color=red><?=number_format($data_1['Hôm Kia'])?></font></td>
                            <td><font color=red><?=number_format($data_2['Hôm Kia'])?></font></td>
                            <td><font color=red><?=number_format($data_3['Hôm Kia'])?></font></td>
                            <td><font color=red><?=number_format($data_4['Hôm Kia'])?></font></td>
                            <td><font color=red><?=number_format($data_5['Hôm Kia'])?></font></td>
                        </tr>

                        <tr>
                        <td><b><font color=blue>Tổng Nạp Hôm Qua</font></b></td>
                            <td><font color=red><?=number_format($data_1['Hôm Qua'])?></font></td>
                            <td><font color=red><?=number_format($data_2['Hôm Qua'])?></font></td>
                            <td><font color=red><?=number_format($data_3['Hôm Qua'])?></font></td>
                            <td><font color=red><?=number_format($data_4['Hôm Qua'])?></font></td>
                            <td><font color=red><?=number_format($data_5['Hôm Qua'])?></font></td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tổng Nạp Nay</font></b></td>
                            <td><font color=red><?=number_format($data_1['Hôm Nay'])?></font></td>
                            <td><font color=red><?=number_format($data_2['Hôm Nay'])?></font></td>
                            <td><font color=red><?=number_format($data_3['Hôm Nay'])?></font></td>
                            <td><font color=red><?=number_format($data_4['Hôm Nay'])?></font></td>
                            <td><font color=red><?=number_format($data_5['Hôm Nay'])?></font></td>
                        </tr>
                    </tbody>
                    <thead>
                      
                    </thead>                  
                    <thead>
                    </thead>
                    <tbody>
                    <tr>
                            <td><b><font color=blue>Bank hôm nay</font></b></td>
                            <td><font color=red><?=number_format($data_1['Bank nay'])?></font></td>
                            <td><font color=red><?=number_format($data_2['Bank nay'])?></font></td>
                            <td><font color=red><?=number_format($data_3['Bank nay'])?></font></td>
                            <td><font color=red><?=number_format($data_4['Bank nay'])?></font></td>
                            <td><font color=red><?=number_format($data_5['Bank nay'])?></font></td>
                        </tr>


                    </tbody>
                    <thead>
                    </thead>
                    <tbody>
                        <tr>
                        <td><b><font color=blue>Thẻ hôm nay</font></b></td>
                            <td><font color=red><?=number_format($data_1['Thẻ nay'])?></font></td>
                            <td><font color=red><?=number_format($data_2['Thẻ nay'])?></font></td>
                            <td><font color=red><?=number_format($data_3['Thẻ nay'])?></font></td>
                            <td><font color=red><?=number_format($data_4['Thẻ nay'])?></font></td>
                            <td><font color=red><?=number_format($data_5['Thẻ nay'])?></font></td>
                        </tr>
                    </tbody>
                    <thead>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b><font color=blue>Tổng User Hôm nay</font></b></td>
                            <td><font color=red><?=number_format($data_1['User nay'])?></font></td>
                            <td><font color=red><?=number_format($data_2['User nay'])?></font></td>
                            <td><font color=red><?=number_format($data_3['User nay'])?></font></td>
                            <td><font color=red><?=number_format($data_4['User nay'])?></font></td>
                            <td><font color=red><?=number_format($data_5['User nay'])?></font></td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tổng User Hôm qua</font></b></td>
                            <td><font color=red><?=number_format($data_1['User qua'])?></font></td>
                            <td><font color=red><?=number_format($data_2['User qua'])?></font></td>
                            <td><font color=red><?=number_format($data_3['User qua'])?></font></td>
                            <td><font color=red><?=number_format($data_4['User qua'])?></font></td>
                            <td><font color=red><?=number_format($data_5['User qua'])?></font></td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tổng User </font></b></td>
                            <td><font color=red><?=number_format($data_1['Tổng User'])?></font></td>
                            <td><font color=red><?=number_format($data_2['Tổng User'])?></font></td>
                            <td><font color=red><?=number_format($data_3['Tổng User'])?></font></td>
                            <td><font color=red><?=number_format($data_4['Tổng User'])?></font></td>
                            <td><font color=red><?=number_format($data_5['Tổng User'])?></font></td>
                        </tr>
                    </tbody>  

                </table>
            </div>
 </div>
 
<!-- end log giftcode -->

</div>
<script src="./script.js"></script>

</body>
</html>
