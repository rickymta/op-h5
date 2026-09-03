<?php
include './config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>webshop</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.slim.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="./assets/index.js"></script>
  <link href="https://cdn.datatables.net/2.0.8/css/dataTables.dataTables.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@sweetalert2/theme-minimal/minimal.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js"></script>
<script src="https://cdn.datatables.net/2.0.8/js/dataTables.js"></script>
</head>
<body>

<div class="container">
<table id="webshop" class="display" style="width:100%">
        <thead>
            <tr>
                <th>Icon</th>
                <th>Tên vp</th>
                <th>Giá</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
<?php foreach($getShop as $item){?>
            <tr>
                <td><img style="width:50px;" src="/iconshop/iconshop/item<?=$item['icon']?>.png"/></td>
                <td><?=$item['name']?></td>
                <td><?=number_format($item['price'])?> Xu</td>
                <td><button onclick="buyShop('<?=$item[id]?>')" class="btn btn-primary">Mua</button></td>
            </tr>
<?php }?>
        </tbody>    
</table>

<script>
new DataTable('#webshop');

function buyShop(n){
    $('#clickShow').click();
    $('#itemId').html('<input type="number" id="item" hidden value="'+n+'">');
}
function submitBuy(){
    var itemNum = $('#itemNum').val();
    var item = $('#item').val();
    var role = $('#role').val();

    if(!itemNum || !item || !role){
        Swal.fire({
        position: "center",
        icon: "error",
        html: "Vui lòng chọn đúng thông tin",
        showConfirmButton: false,
        timer: 1500
        });
        return;
    }else{
        $.ajax({                    
            url: "./config.php?act=muashop",
                type: "post",
                dataType: "text",
                data: {
                    itemNum: $('#itemNum').val(),
                    item: $('#item').val(),                 
                    role: $('#role').val(),                 
            },
                success: function(result) {                        
               if(result == "true"){
                Swal.fire({
                position: "center",
                icon: "success",
                html: "Mua thành công",
                showConfirmButton: false,
                timer: 1500
                });
                return;
               }else{
                Swal.fire({
                position: "center",
                icon: "error",
                html: result,
                showConfirmButton: false,
                timer: 1500
                });
                return;
               }
            }
        });  
    }

    
}

</script>
<button type="button" id="clickShow" hidden data-toggle="modal" data-target="#modalShop"></button>

<!-- The Modal -->
<div class="modal" id="modalShop">
  <div class="modal-dialog">
    <div class="modal-content">

      <!-- Modal Header -->
      <div class="modal-header">
        <h4 class="modal-title">Mua</h4>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>

      <!-- Modal body -->
      <div class="modal-body">
        <form method="POST" onsubmit="return false">

            <div class="input-group mb-3">
                <div class="input-group-prepend">
                <span class="input-group-text">Chọn nhân vật</span>
                </div>
                    <select id="role" class="form-control">
                        <?php foreach($getRole as $item){?>    
                          <option value="<?=$item['master_name']?>|<?=$item['srv_code']?>"><?=$item['master_name']?> - <?=$item['srv_code']?></option>
                         <?php } ?> 
                    </select>     
            </div>

            <div class="input-group mb-3">
                <div class="input-group-prepend">
                <span class="input-group-text">Số lượng</span>
                </div>
                <input type="number" id="itemNum" class="form-control" value="1">
                <span id="itemId"></span>
            </div>
        <button onclick="submitBuy()" class="btn btn-primary">Xác nhận mua</button>
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
