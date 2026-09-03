<?php
$t = time ();
?>
<!DOCTYPE html>
<html>   
<?php
include_once './head.php';
include_once '../../config.php';;

include_once '../function/common.php';;
$qu_list = get_qu_list();
$wp_list = get_wp_item();
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
                      <b>Toàn bộ server bưu kiện hậu trường</b>
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
                                        foreach($qu_list as $key=>$value){
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
                             <h4>Bưu kiện hệ thống - Vật phẩm</h4>
                                <input type="text" id="title" name="title" class="form-control" min="0" max="9999" value="" placeholder="Bưu kiện tiêu đề" required>
                            </div>
                        </div>

                       <div class="form-group">
                            <div class="col-sm-10">
                                <input type="text" id="content" name="content" class="form-control" min="0" max="9999" value="" placeholder="Trong bưu kiện cho" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="col-sm-10">
                                <select id="mailid" name="mailid" class="selectpicker show-tick form-control" data-live-search="true" data-size="10" title="Mời lựa chọn vật phẩm">
                                    <?php
                                    foreach($wp_list as $key=>$value){
                                        echo '<option value="'.$key.'">'.$value.'</option>';
                                    }
                                    ?>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="col-sm-10">
                                <input type="text" id="mailnum" name="mailnum" class="form-control" min="0" max="9999" value="" placeholder="Số lượng" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="col-sm-10 ">
                            <button type="submit" class="btn btn-primary btn-block" onclick="send_allmails()">Bưu kiện gửi đi</button>
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

 </div>

 <script src="../../js/msg.js?v=<?php echo $t;?>"></script>
</body>
</html>