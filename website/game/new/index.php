<?php
include './config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Tích nạp</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.slim.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="./assets/index.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/@sweetalert2/theme-minimal/minimal.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js"></script>
</head>
<body>

<div class="container">
<div class="my-3 text-center btn btn-primary">Tổng nạp <span class="badge badge-danger"><?=number_format($tongNap)?> vnđ</span></div>
<div class="my-3 text-center btn btn-primary">Thời gian bắt đầu <span class="badge badge-danger"><?=$startTime?></span></div>
<div class="my-3 text-center btn btn-primary">Thời gian kết thúc <span class="badge badge-danger"><?=$endTime?></span></div>
<div class="my-3 text-center btn btn-primary">Còn <span class="badge badge-danger"><?=$remainingDays+1?> ngày</span></div>
<table class="table table-striped">
    <thead>
      <tr>
        <th>Mốc</th>
        <th>Vật phẩm</th>
        <th>Tình trạng</th>
      </tr>
    </thead>
    <tbody>
<?php foreach($getData as $item){?>        
      <tr>
        <td><?=number_format($item['moc'])?> vnđ</td>
        <td><?=$item['name']?></td>
        <td>
           <?php if($tongNap < $item['moc']){
                echo '<button class="badge badge-dark">Chưa đạt</button>';
           }else{
            $moc = $item['moc'];
            $getLog = $pdo->query("SELECT * FROM `tichluy_log` WHERE `username` = '$username' AND `moc` = '$moc' ")->fetch();
            if($getLog == true){
                echo '<button class="badge badge-danger">Đã nhận</button>';
            }else{
                echo '<button id="dataId" onclick="popup('.$moc.')" data-toggle="modal" data-target="#myModal" class="badge badge-success">Nhận</button>';
            }
            
           }
           ?> 
        </td>
      </tr>
<?php } ?>     
    </tbody>
  </table>

  <div class="modal fade" id="myModal">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">

      <!-- Modal Header -->
      <div class="modal-header">
        <h4 class="modal-title">Thông tin nhận</h4>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>

      <!-- Modal body -->
      <div class="modal-body">
        <form method="POST" onsubmit="return false">
            <div class="form-group">
                <label for="moc">Mốc nhận:</label>
                <div id="mocinput" ></div>
            </div>
            <div class="form-group">
                <label for="role">Chọn nhân vật:</label>
                <select id="role" class="form-control">
                <?php foreach($getRole as $item){?>    
                    <option value="<?=$item['master_name']?>|<?=$item['srv_code']?>"><?=$item['master_name']?> - <?=$item['srv_code']?></option>
                <?php } ?>                    
                </select>
                <button onclick="btnNhan()" class="btn btn-primary my-3">Xác nhận</button>
            </div>
        </form>
      </div>

      <!-- Modal footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-dismiss="modal">Close</button>
      </div>

    </div>
  </div>
</div>

</body>
</html>
