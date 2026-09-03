<div class="content-wrapper luna-new-year" id="f-content">
    <h2 class="form-get-gc method-info--title">LỊCH SỬ GIAO DỊCH</h2>
    <div class="form-get-gc">
        <button onclick="btnCard()" class="btn-ls fClick">Lịch Sử - Nạp Tiền <i class="fa fa-caret-square-o-down"></i></button>
		<div id="lsCard" style="display:none">
			<span id="lsCard_close" class="b" onclick="lsCard_close()" >Lịch Sử - Nạp Tiền <i class="fa fa-window-close"></i></span>
				<!-- <div class="fade center b">
					<table id="logpay" class="display">
						<thead>
							<tr>
								<th>Tài khoản</th>
								<th>Phương thức</th>
								<th>Mệnh giá</th>
								<th>Tình trạng</th>
								<th>Thời gian</th>
							</tr>
						</thead>
						<tbody>
						<?php foreach($logPay as $item){ ?>
							<tr>
								 <td><?=$item['username']?></td>
								<td><?=$item['phuongthuc']?></td>
								<td><?=number_format($item['menhgia'])?></td>
								<td>
									<?php
										if($item['status'] == 'Chờ duyệt'){echo "<span class='badge bg-warning'>".$item['status']."</span>";}
										if($item['status'] == 'Sai mệnh giá'){echo "<span class='badge bg-warning'>".$item['status']."</span>";}
										if($item['status'] == 'Thất bại'){echo "<span class='badge bg-danger'>".$item['status']."</span>";}
										if($item['status'] == 'Thành công'){echo "<span class='badge bg-success'>".$item['status']."</span>";}
										
									?>
								</td>
								<td><?=date("d-m-Y H:i:s", strtotime($item['date']));?></td> 
							</tr>
						<?php } ?>	
						</tbody>
					</table>	
				</div> -->
		</div>
		
		<button onclick="btnXu()" class="btn-ls">Lịch Sử - Dùng Xu <i class="fa fa-caret-square-o-down"></i></button>
		<div id="lsXu" style="display:none">
			<span id="lsXu_close" class="b" onclick="lsXu_close()" >Lịch Sử - Dùng Xu <i class="fa fa-window-close"></i></span>
				<!-- <div class="fade center b">
					<table id="logxu" class="display">
						<thead>
							<tr>
								<th>Tài khoản</th>
								<th>XU trừ</th>
								<th>Thời gian</th>
							</tr>
						</thead>
						<tbody>
						 <?php foreach($logxu as $item){ ?>
							 <tr>
								<td><?=$item['username']?></td>
								<td><?=number_format($item['xu'])?></td>
								<td><?=date("d-m-Y H:i:s", strtotime($item['time']));?></td>
							</tr> 
						<?php } ?>	
						</tbody>
					</table>	
				</div> -->
		</div>
    </div>
</div>
<script>
$(".fClick").click();
function btnCard(){
	$("#lsCard").css("display","block");
	$("#lsCard_close").css("display","block");
}
function lsCard_close(){
	$("#lsCard").css("display","none");
}
function btnXu(){
	$("#lsXu").css("display","block");
	$("#lsXu_close").css("display","block");
}
function lsXu_close(){
	$("#lsXu").css("display","none");
}
$(document).ready(function () {
    $('#logxu, #logpay').DataTable();
});
</script>
<style>
#logpay_wrapper{
	overflow: auto !important;
}
th{
	text-align: center !important;
}
table{
	width:100%;font-size: 13px;font-weight: 100;
}
.bg-warning {
    background-color: #ffc107!important;
	color: #000 !important;
}
.bg-danger {
    background-color: #dc3545!important;
}
.bg-success {
    background-color: #198754!important;
}
.badge {
    display: inline-block;
    padding: 0.35em 0.65em;
    font-size: .75em;
    font-weight: 700;
    line-height: 15px;
    color: #fff;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: 0.25rem;
}
</style>