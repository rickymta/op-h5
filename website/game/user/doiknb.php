<div class="content-wrapper luna-new-year" id="f-content">
    <h1 style="font-size:0">Đại Hải Trình Mobile</h1>
    <div class="form-card form-get-gc">
        <div class="form-group" id="account-pay">
            <label><b>Đổi Kim Nguyên Bảo</b></label>
            <div class="payment-invoice">
                <div class="form-group">
                    <label>Tài khoản</label>
                    <div><?=$_SESSION['username']?></div>
                </div>
                <div class="form-group" id="game-bonus">
                    <label>Xu hiện có</label>
                    <div class="xu" style="color:green"><?=number_format($info['xu'])?></div>
                </div>

            </div>
        </div>

        <fieldset class="payment" id="phuong-thuc">
            <div class="form-group">
                <label>Thông tin gói</label>
                <div class="list-methods block" id="method-section">
                <?php foreach($knb as $item){?>    
					<div class="method card goToBottom" onclick="popbuy(<?=$item['id']?>)">
                        <label for="ntt">
                            <div class="method-detail">
                                <div class="method-thumb icon-nap">
                                    <img src="/assets/images/xu.png" class="img-fluid"><br>
									<?=number_format($item['xutru'])?> Xu<hr class="hr">
                                </div>
                                <div class="method-meta">
                                    <div class="knb-name"><?=$item['name']?></div>
                                </div>
                            </div>
                        </label>
                    </div>
                <?php } ?>   
                </div>
            </div>
        </fieldset>
<script>
function popbuy(id){
	$.get("/get/"+id, function(data){
		var getData = data.split('_');
		var itemName = getData[0];
		var itemXu = getData[1];
		Swal.fire({
		title: 'Đại Hải Trình Mobile',
		html: 'Nội dung: <input disabled class="input-buy" value="Gói '+itemName+'">'+
			'Giá bán: <input disabled class="input-buy" value="'+itemXu+' Xu">'+
			'Chọn Server: <select id="Sid" onchange="serverId(this.value)" class="input-buy"><option value="">Vui lòng chọn</option>'+
			'<?php foreach($getSid as $item){?><option value="<?=$item[serverId]?>"><?=$item[serverName]?></option><?php } ?>'+
			'</select>'+
			'<div id="roleName"></div>'+
			'<input type="hidden" id="itemId" value="'+id+'">'+
			'<button class="btn-buy" onclick="btnBuy()">Xác Nhận</button>',
		showConfirmButton: false
	});
	});
}
function btnBuy(){
$.ajax({
	url: "/buy",
		type: "post",
		dataType: "text",
		data: {
		itemId: $('#itemId').val(),               
		nameRole: $('#nameRole').val(),               
		Sid: $('#Sid').val(),               
	},
		success: function(result) {  
		if(result == 'true'){
			Swal.fire({
                            icon: 'success',
                            title: 'Đại Hải Trình Mobile',
                            text: 'Đổi gói thành công',
                            timer: 2500,
                            timerProgressBar: true
                        });
		}else{
						Swal.fire({
                            icon: 'error',
                            title: 'Đại Hải Trình Mobile',
                            text: result,
                            timer: 2500,
                            timerProgressBar: true
                        });
		}
	}
});     
}
function serverId(value){
    $.ajax({
	url: "/buy?act=getrole",
		type: "post",
		dataType: "text",
		data: {
		sid: value,               
	},
		success: function(result) { 
		$('#roleName').html('Nhân vật: <input disabled id="nameRole" class="input-buy" value="'+result+'">');
	}
}); 
}
</script>
    </div>
</div>