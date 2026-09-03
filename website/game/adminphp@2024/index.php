<?php
include('./db.php');
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
<?php if(!$_SESSION['admin']){?>  
  <form method="POST" onsubmit="return false">
    <div class="mb-3 mt-3">
      <label for="text">Tài khoản (admin):</label>
      <input type="text" class="form-control" id="username" placeholder="nhập tài khoản">
    </div>
    <div class="mb-3">
      <label for="pwd">Password(pgaming):</label>
      <input type="password" class="form-control" id="password" placeholder="Nhập password">
    </div>
    <div id="err_msg" class="form-check mb-3"></div>
    <button type="submit" class="btn btn-primary" onclick="btnLogin()">Submit</button>
  </form>
<?php } else{?>  
<ul class="nav nav-tabs">
    <li class="nav-item">
      <a class="nav-link active">Chào, <?=$_SESSION['admin']?></a>
    </li>
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">Chức năng</a>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#taikhoan" href="javascript:void(0);">Tài khoản</a></li>
        <li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#addsk" href="javascript:void(0);">Sự kiện</a></li>
        <li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#addxu" href="javascript:void(0);">Add xu</a></li>
		<li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#addcode" href="javascript:void(0);">Addcode</a></li>
        <li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#logbank" href="javascript:void(0);">Log bank</a></li>
        <li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#logthe" href="javascript:void(0);">Log the</a></li>
        <li><a class="dropdown-item" data-bs-toggle="offcanvas" data-bs-target="#logrut" href="javascript:void(0);">Log Rút</a></li>
      </ul>
    </li>
    <li class="nav-item">
        <a class="nav-link" href="./vietbai.php">Viết bài</a>
    </li>
    <li class="nav-item">
        <a class="nav-link" href="./thongbao.php">Thông Báo</a>
    </li>

    <li class="nav-item">
        <a class="nav-link" href="./db.php?act=thoat">Thoát</a>
    </li>
  </ul>
  
 <div class="my-3">
     <h1 class="offcanvas-title" ><font color=red>Thống kê số liệu VL5B</font></h1>
     <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                         <tr class="table-danger">
                            <th class="table-danger">Tổng Doanh Thu:</th>
                            <th class="table-danger"><?=number_format($tongnapbank['total'] +$tongnapmomo['total'] + $tongnapthe['total'])?> VND</th>
                        </tr>

                       </thead>  
                        <tbody>
                        <tr>

                        </tr>
                         </tr>
                        <tr>
                            <td><b></b>
                            </td>
                            <td></font>
                            </td>
                        </tr>

                    </tbody>
                    <thead>
                      
                        <tr class="table-primary">
                            <th class="table-primary">Thống Kê Bank</th>
                            <th class="table-primary">Số Tiền VND</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b><font color=blue>Nạp bank hôm nay</font></b>
                            </td>
                            <td><font color=red><?=number_format($napbankhomnay['total'])?></font>
                            </td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Nạp bank hôm qua</font></b>
                            </td>
                            <td><font color=red><?=number_format($napbankhomqua['total'])?></font>
                            </td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tổng nạp bank</font></b>
                            </td>
                            <td><font color=red><?=number_format($tongnapbank['total'])?></font>
                            </td>
                        </tr>
                    </tbody>
                    <thead>
                      
                        <tr class="table-primary">
                            <th class="table-primary">Thống Kê Momo</th>
                            <th class="table-primary">Số Tiền VND</th>
                        </tr>
                    </thead>                  
                    <thead>
                        <tr class="table-success">
                            <th class="table-success">Thống Kê Card</th>
                            <th class="table-success">Số Tiền VND</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b><font color=blue>Nạp thẻ hôm nay</font></b>
                            </td>
                            <td><font color=red><?=number_format($napthehomnay['total'])?></font>
                            </td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Nạp thẻ hôm qua</font></b>
                            </td>
                            <td><font color=red><?=number_format($napthehomqua['total'])?></font>
                            </td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tổng nạp thẻ</font></b>
                            </td>
                            <td><font color=red><?=number_format($tongnapthe['total'])?></font>
                            </td>
                        </tr>
                    </tbody>
                    <thead>
                        <tr class="his">
                            <th class="table-warning">Thống Kê Account</th>
                            <th class="table-warning">Số Tài Khoản</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><b><font color=blue>Tài khoản mới hôm nay</font></b>
                            </td>
                            <td><font color=red><?=number_format($tongacchomnay['total'])?></font>
                            </td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tài khoản mới hôm qua</font></b>
                            </td>
                            <td><font color=red><?=number_format($tongacchomqua['total'])?></font>
                            </td>
                        </tr>
                        <tr>
                            <td><b><font color=blue>Tổng tài khoản</font></b>
                            </td>
                            <td><font color=red><?=number_format($tongacc['total'])?></font>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
 </div>
 
 
 <!-- add taikhoan -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="taikhoan">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Tài khoản</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
            <table id="member" class="display" style="width:100%">
        <thead>
            <tr>
                <th>#</th>
                <th>Tài khoản</th>
                <th>Mật khẩu</th>
                <th>Xu</th>
            </tr>
        </thead>
        <tbody>
        <?php $i=1; foreach($member as $item){?>    
            <tr>
                <td><?=$i++?></td>
                <td><?=$item['username']?></td>
                <td><?=$item['password']?></td>
                <td><?=number_format($item['xu'])?></td>
            </tr>
        <?php } ?>    
        </tbody>    
  </table>

    </div>
</div> 
<!-- end taikhoan --> 
<!-- add xu -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="addxu">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Addxu</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <form method="POST" onsubmit="return false">
    <div class="mb-3 mt-3">
      <label for="text">Tài khoản:</label>
      <input type="text" class="form-control" id="user" placeholder="nhập tài khoản">
    </div>
    <div class="mb-3">
      <label for="number">Số Xu:</label>
      <select type="number" id="xu" class="form-control">
                        <option value="30000">10k bank</option>
                        <option value="60000">20k bank</option>
                        <option value="120000">40k bank</option>
                        <option value="150000">50k bank</option>
                        <option value="300000">100k bank</option>
                        <option value="600000">200k bank</option>
                        <option value="900000">300k bank</option>
                        <option value="1200000">400k bank</option>
                        <option value="1500000">500k bank</option>
                        <option value="3000000">1000k bank</option>
                        <option value="6000000">2000k bank</option>          
                        <option value="9000000">3000k bank</option>          
                        <option value="15000000">5000k bank</option>                  
       </select>
    </div>
    <div id="xu_msg" class="form-check mb-3"></div>
    <button type="submit" class="btn btn-primary" onclick="btnXu()">Submit</button>
  </form>
    </div>
</div> 
<!-- end add xu -->
<!-- add sự kiện xu -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="addsk">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Xu sự kiện</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <form method="POST" onsubmit="return false">
    <div class="mb-3 mt-3">
      <label for="text">Tài khoản:</label>
      <input type="text" class="form-control" id="user2" placeholder="nhập tài khoản">
    </div>
    <div class="mb-3">
      <label for="number">Số Xu:</label>
      <select type="number" id="xu2" class="form-control">
                        <option value="50000">50k sk</option>      
                        <option value="20000">20k sk</option>      
                        <option value="40000">40k sk</option>      
                        <option value="60000">60k sk</option>      
                        <option value="10000">10k sk</option>      
                        <option value="100000">100k sk</option>      
                        <option value="200000">200k sk</option>      
                        <option value="500000">500k sk</option>      
                        <option value="1000000">1000k sk</option>      
                        <option value="1500000">1500k sk</option>      
                        <option value="2000000">2000k sk</option>      
                        <option value="3000000">3000k sk</option>      
                        <option value="20000000">20000k sk</option>      
                        </select>
    </div>
    <div id="xu_msg123" class="form-check mb-3"></div>
    <button type="submit" class="btn btn-primary" onclick="btnXu2()">Submit</button>
  </form>
    </div>
</div> 
<!-- end sự kiện xu -->
<!-- gift -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="giftcode">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Giftcode</h1>
    <button class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#addcode">Thêm code</button>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <table id="gift" class="display" style="width:100%">
        <thead>
            <tr>
                <th>#</th>
                <th>Code</th>
                <th>Item</th>
                <th>loại code</th>
                <th>Hành động</th>
            </tr>
        </thead>
        <tbody>
        <?php $i=1; foreach($gift as $item){?>    
            <tr>
                <td><?=$i++?></td>
                <td><?=$item['code']?></td>
                <td><?=$item['item']?></td>
                <td><?=$item['noidungcode']?></td>
                <td>
                    <a class="btn btn-primary getid" data-id="<?=$item['code']?>_<?=$item['id']?>" data-bs-toggle="modal" data-bs-target="#editcode">Sửa</a>
                    <a class="btn btn-danger" onclick="return confirm('Bạn chắc chắn muốn xóa?'),del(<?=$item['id']?>)">Xóa</a>
                </td>
            </tr>
        <?php } ?>    
        </tbody>    
  </table>
    </div>
</div> 
<!-- end gift -->
<!-- add code -->
<div class="modal" id="addcode">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title">Add code</h4>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form method="POST" onsubmit="return false">
            <div class="mb-3 mt-3">
              <label for="text">code:</label>
              <input type="text" class="form-control" id="code" placeholder="nhập code">
            </div>
            <div class="mb-3">
              <label for="text">Item:</label>
              <input type="text" class="form-control" id="item" value='[{ "item": "26013", "num": "2" }, { "item": "26014", "num": "3" }, { "item": "26015", "num": "4" }]'>
            </div>
            <div class="mb-3">
              <label for="text">Loại code:</label>
              <input type="text" class="form-control" id="loaicode" placeholder="Ví dụ: Code tân thủ">
            </div>
            <div id="code_msg" class="form-check mb-3"></div>
            <button type="submit" class="btn btn-primary" onclick="btnAddcode()">Submit</button>
          </form>
      </div>

      <!-- Modal footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-bs-dismiss="modal">Close</button>
      </div>

    </div>
  </div>
</div>
<!-- end add code -->
<!-- edit code -->
<div class="modal" id="editcode">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title">Edit code</h4>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
          <script>
                $(document).ready(function() {
                    $(".getid").on("click", function() {
                        var dataId = $(this).attr("data-id");
                        var myArray = dataId.split("_");
                        var idcode = myArray[1];
                        var namecode = myArray[0];
                        document.getElementById("codeid").innerHTML = '<input type="text" class="form-control" id="code1" value='+namecode+'><input type="hidden" id="idcode" value='+idcode+'>';
                        $.get("./db.php?act=getidcode&id="+idcode, function(data, status){
                            document.getElementById("itemcodeid").innerHTML = "<input type=text class=form-control id=item1 value='"+data+"'>";
                         });    
                        
                        
                    });
                });
            </script>
        <form method="POST" onsubmit="return false">
            <div class="mb-3 mt-3">
              <label for="text">code:</label>
              <i id="codeid"></i>
            </div>
            <div class="mb-3">
              <label for="text">Item:</label>
              <i id="itemcodeid"></i>
            </div>
            <div class="mb-3">
              <label for="text">Loại code:</label>
              <input type="text" class="form-control" id="loaicode1" placeholder="Ví dụ: Code tân thủ">
            </div>
            <div id="edit_msg" class="form-check mb-3"></div>
            <button type="submit" class="btn btn-primary" onclick="btnEditcode()">Submit</button>
          </form>
      </div>

      <!-- Modal footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-bs-dismiss="modal">Close</button>
      </div>

    </div>
  </div>
</div>
<!-- end edit code -->

<!-- log nap -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="logbank">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Log Nạp</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <table id="logbank1" class="display" style="width:100%">
        <thead>
            <tr>
                <th>#</th>
                <th>Tài khoản</th>
                <th>Tiền</th>
                <th>Server</th>
                <th>Thời gian</th>
            </tr>
        </thead>
        <tbody>
        <?php $i=1; foreach($lognapbank as $item){?>    
            <tr>
                <td><?=$i++?></td>
                <td><?=$item['username']?></td>
                <td><?=$item['price']?></td>
                <td><?=$item['sid']?></td>
                <td><?=$item['time']?></td>
            </tr>
        <?php } ?>    
        </tbody>    
  </table>
    </div>
</div> 
<!-- end log nap -->
<!-- log nap -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="logthe">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Log Nạp thẻ</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <table id="logthe1" class="display" style="width:100%">
        <thead>
            <tr>
                <th>#</th>
                <th>Tài khoản</th>
                <th>Tiền</th>
                <th>Trạng Thái</th>
                <th>Thời gian</th>
            </tr>
        </thead>
        <tbody>
        <?php $i=1; foreach($lognapthe as $item){?>    
            <tr>
                <td><?=$i++?></td>
                <td><?=$item['username']?></td>
                <td><?=$item['menhgia']?></td>
                <td><?=$item['status']?></td>
                <td><?=$item['time']?></td>
            </tr>
        <?php } ?>    
        </tbody>    
  </table>
    </div>
</div> 
<!-- end log nap -->
<!-- log rut -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="logrut">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Log Rút</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <table id="logrut1" class="display" style="width:100%">
        <thead>
            <tr>
                <th>#</th>
                <th>Tài khoản</th>
                <th>Tiền</th>
                <th>Thời gian</th>
            </tr>
        </thead>
        <tbody>
        <?php $i=1; foreach($logrut as $item){?>    
            <tr>
                <td><?=$i++?></td>
                <td><?=$item['username']?></td>
                <td><?=$item['xu']?></td>
                <td><?=$item['time']?></td>
            </tr>
        <?php } ?>    
        </tbody>    
  </table>
    </div>
</div> 
<!-- end log rut -->
<!-- log giftcode -->
<div class="offcanvas offcanvas-bottom" style="height: auto;" id="loggiftcode">
  <div class="offcanvas-header">
    <h1 class="offcanvas-title">Log Giftcode</h1>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
     <div class="offcanvas-body">
        <table id="loggiftcode1" class="display" style="width:100%">
        <thead>
            <tr>
                <th>#</th>
                <th>Tài khoản</th>
                <th>Nhân vật</th>
                <th>Server</th>
                <th>Giftcode</th>
                <th>Thời gian</th>
            </tr>
        </thead>
        <tbody>
        <?php $i=1; foreach($loggiftcode as $item){?>    
            <tr>
                <td><?=$i++?></td>
                <td><?=$item['username']?></td>
                <td><?=$item['role']?></td>
                <td><?=$item['server']?></td>
                <td><?=$item['code']?></td>
                <td><?=$item['time']?></td>
            </tr>
        <?php } ?>    
        </tbody>    
  </table>
    </div>
</div> 
<!-- end log giftcode -->
<?php } ?>
</div>
<script src="./script.js"></script>

</body>
</html>
