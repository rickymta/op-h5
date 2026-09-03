<?php
$t = time ();

?>
<!DOCTYPE html>
<html>   
<?php
include_once './head.php';
include_once '../../config.php';;

include_once '../function/common.php';;

$itemdata = get_pay_item();
$quarr = get_qu_list();
?>    
 
<body>
 <div class="container">
   <br>

   <div class="row">

     <div class="container-fluid">
         <div class="modal-dialog">
            <div class="modal-content">
              <ul class="breadcrumb">
                  <li>
                      <b>Nạp tiền hậu trường</b>
                  </li>
              </ul>

              <div class="modal-body">
                <div class="form-horizontal" role="form">

                <div class="form-group">
                    <div class="col-sm-10">
					<h4>Tin tức điền</h4>
                        <input type="password" id="checknum" name="checknum" class="form-control" maxlength="16" value="" placeholder="Đưa vào GM Kiểm tra mã" required>
                    </div>
                </div>

				<div class="form-group">
                    <div class="col-sm-10">
                        <select id="qu" name="qu" class="form-control selectpicker" data-size="5" required>
                            <?php
						
						foreach($quarr as $key=>$value){
							if($value['hidde']!=true){
								echo '<option value="'.$key.'">'.$value['name'].'</option>';	
								
						}
						}
							
						?>
                        </select>
                    </div>
                </div>

				<div class="form-group">
                    <div class="col-sm-10">
                        <input type="text" id="uid" name="uid" class="form-control" value="" placeholder="Xin điền vào nhân vật ID" required>
                    </div>
                </div>

				<div class="form-group">
                    <div class="col-sm-10">
					<h4>Nạp tiền hệ thống</h4>
                       <input type="text" id="chargenum" name="chargenum" class="form-control" min="0" max="9999" value="" placeholder="Số lượng" required>  		
                    </div>
                </div>

                <div class="form-group">
                    <div class="col-sm-10">					
                   	<select id="chargetype" name="chargetype" class="form-control selectpicker" data-size="10" data-live-search="true" required>
                    <?php
                        foreach($itemdata as $key=>$val){
                            echo '<option value="'.$val['pay_id'].'" title="'.$val['pay_name'].'">'.$val['pay_name'].'</option>';
                        }
                    ?>
                    </select>
                    </div>
                </div>

                <div class="form-group">
                    <div class="col-sm-10 ">
						<button type="submit" class="btn btn-danger btn-block" onclick="chargebtn()">Nạp tiền</button>						
                    </div>					
                </div>		

                </div>
                  <br>
                 <?php include_once './footer.php'; ?>
              </div>
            </div>
         </div>
     </div>

   </div>

 </div>

 <script src="../../js/msg.js?v=<?php echo $t;?>"></script>
</body>
</html>