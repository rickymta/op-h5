<div class="content-wrapper luna-new-year" id="f-content">
    <h1 style="font-size:0">Đại Hải Trình Mobile</h1>
    <ul class="progressbar">
        <li id="step1">Phương thức thanh toán</li>
        <li id="step2">Chọn gói nạp</li>
        <li id="step3">Chuyển khoản</li>
    </ul>
    <div class="form-card form-get-gc">
        <div class="form-group" id="account-pay">
            <label>Thông tin giao dịch</label>
            <div class="payment-invoice">
                <div class="form-group">
                    <label>Tài khoản</label>
                    <div><?=$_SESSION['username']?></div>
                </div>
                <div class="form-group" id="game-bonus">
                    <label>Coin hiện có</label>
                    <div class="xu" style="color:green"><?=number_format($info['xu'])?></div>
                </div>

            </div>
        </div>

        <fieldset class="payment" id="phuong-thuc">
            <div class="form-group">
                <label>Phương thức thanh toán</label>
                <div class="list-methods block" id="method-section">
                    <div class="method card goToBottom" onclick="thecao()">
                        <label for="ntt">
                            <div class="method-detail">
                                <div class="method-thumb icon-nap">
                                    <img src="/assets/images/card.png" class="img-fluid">
                                </div>
                                <div class="method-meta">
                                    <div class="method-name">Nạp Thẻ Cào</div>
                                    <div class="method-gift">
                                        <i class="fa fa-gift" aria-hidden="true"></i>Khuyến mãi x2.5
                                    </div>
                                </div>
                            </div>
                        </label>
                    </div>
                    <div class="method atms goToBottom" onclick="atm()">
                        <label for="bank_atm">
                            <div class="method-detail">
                                <div class="method-thumb icon-nap">
                                    <img src="/assets/images/atm-ibanking.jpg" class="img-fluid">
                                </div>
                                <div class="method-meta">
                                    <div class="method-name">Thẻ ATM/iBanking</div>
                                    <div class="method-gift">
                                        <i class="fa fa-gift" aria-hidden="true"></i>Đang khuyến mại x3
                                    </div>
                                </div>
                            </div>
                        </label>
                    </div>
                    <div class="method momos goToBottom" onclick="momo()">
                        <label for="momo_ewallet">
                            <div class="method-detail">
                                <div class="method-thumb icon-nap">
                                    <img src="/assets/images/momo.jpg" class="img-fluid">
                                </div>
                                <div class="method-meta">
                                    <div class="method-name">Momo</div>
                                    <div class="method-gift">
                                        <i class="fa fa-gift" aria-hidden="true"></i>Đang khuyến mại x3
                                    </div>
                                </div>
                            </div>
                        </label>
                    </div>
                    
                </div>
            </div>
        </fieldset>
        <div class="thecao fade" style="display:none">
			<fieldset class="payment" id="form-the-cao" style="">
    <div class="form-group divThe">
			<h3 id="method-name" class="mb-3">Thanh toán bằng Thẻ Cào</h3>
										<div class="alert alert-danger">
										Nạp thẻ cào mệnh giá 100,000 số xu nhận tương ứng 250,000 xu.
										</div>
                                        
										<form id="login-form" action="/card">
                                        <div class="input-elm input-code-wrapper">
										<select name="tentaikhoan" class="input-code">
										<option value="<?=$info['username']?>"><?=$info['username']?></option>
										</select>
										</div>

										<div class="input-elm input-code-wrapper">
										<select name="type" class="input-code">
										<option value="Viettel">Viettel</option>
										<option value="Mobifone">Mobifone</option>
										<option value="Vinaphone">Vinaphone</option>
										<option value="Zing">Zing</option>
										<option value="Vietnamobile">Vietnamobile</option>
										<option value="Vcoin">Vcoin</option>
										<option value="Gate">Gate</option>
										</select>
										</div>
										
										<div class="input-elm input-code-wrapper">
										<select name="menhgia" class="input-code">
										<option value="">Chọn mệnh giá</option>
										<option value="50000">50.000đ</option>
										<option value="100000">100.000đ</option>
										<option value="200000">200.000đ</option>
										<option value="300000">300.000đ</option>
										<option value="500000">500.000đ</option>
										<option value="1000000">1.000.000đ</option>
										</select>
										<p style="color: #E53935; font-size: 12px;text-align: left;">Chọn sai mệnh giá có thể mất thẻ cào, vui lòng kiểm tra.</p>
										</div>
								
            <div class="input-elm input-code-wrapper">
                <input type="text" class="input-code" placeholder="Mã Pin Thẻ" name="mathe" >
            </div>

            <div class="input-elm input-code-wrapper">
                <input type="text" class="input-code" placeholder="Số Serial Thẻ" name="seri" >
            </div>

            <div class="input-elm">
                <button style="width: 100%;" type="submit" class="fun-btn-v3 fluid lg active">Nạp thẻ cào</button>
            </div>
        </form>
    </div>
</fieldset>
        </div>
		<div class="atm fade" style="display:none">
			<div class="payment-card mt-0 info-bank" style="">
    <h3 class="mb-3">Thông tin chuyển tiền</h3>
    <div class="form-group">
        <label>Nội dung chuyển khoản</label>
        <div class="alert alert-danger">
										Khuyến mại x3, Chuyển khoản 100,000 số xu nhận tương ứng 300,000 xu </br>
										</div>
    </div>
    <p>Quý khách vui lòng chuyển khoản theo nội dung dưới đây:</p>
    <div class="popup-transfer">
        <ul class="nav nav-tabs" role="tablist" id="tab-header">
            <li role="presentation" class="nav-item">
                <a href="#" class="nav-link active" aria-controls="momo_mob">
                    <img src="" class="img-responsive"> <span>VIETCOMBANK (VCB)</span>
                </a>
            </li>
        </ul>
        <div class="tab-content">
            <div id="momo_mob" class="panel tab-pane active">
                <div>
                    <p style="font-weight: bold;">
                        Khi thực hiện việc chuyển tiền qua Bank của Đại Hải Trình Mobile:</br>
						<strong style="color:red">[Phần Nội Dung]</strong> bạn nhớ ghi đúng <strong style="color:red">[HL3D <?=$info['username']?>]</strong> để nhận được Xu.
                    </p>
                </div>
                <ul>
                    <li>Tài khoản: <strong>0811000039855</strong></li>
                    <li>Ngân hàng: <strong>VIETCOMBANK (VCB)</strong></li>
                    <li>Chủ tài khoản: <strong>PHAM QUOC KHANH</strong></li>
					<li>Số tiền: <strong>Phải là số lớn hơn 50,000 vnd</strong></li>
                    <li style="color:red">Lưu ý: Chuyển khoản xong hãy chờ hệ thống auto tự động cộng coin sau 1-2 phút <strong>Nếu nạp sai cú pháp hãy liên hệ Admin Zalo hoặc admin Fanpage</strong></li>
                   <!-- <strong style="color:red;display: block;padding: 15px" class="text-center cuphap_game_momo">Bạn vui lòng truy cập vào App Banking để quét mã QR dưới đây để nạp</strong>
					<center id="urlQR"></center>
					<p id="countdown" style="color:red" class="text-center"></p>
					<div style="text-align:center;margin-left:-30px;">
						<button onclick="huyBank()" style="color: #fff; background-color: #dc3545; border: solid 1px #dc3545; padding: 10px; border-radius: 4px;">Hủy giao dịch</button>-->
					</div>
                </ul>
            </div>
        </div>
    </div>
</div>
        </div>
		<div class="momo fade" style="display:none">
			<div class="payment-card mt-0 info-bank">
    <h3 class="mb-3">Thông tin chuyển tiền</h3>
    <div class="alert alert-danger">
                        Khuyến mại x3, Chuyển khoản 100,000 số xu nhận tương ứng 300,000 xu
                        </br>
										</div>
    <div class="form-group">
        <label>Nội dung chuyển khoản</label>
        <div class="input-elm input-code-wrapper">
            <input type="text" class="input-code" disabled="" value="HL3D <?=$info['username']?>">
        </div>
    </div>
    <p>Quý khách vui lòng chuyển khoản theo nội dung dưới đây:</p>
    <div class="popup-transfer">
        <ul class="nav nav-tabs" role="tablist" id="tab-header">
            <li role="presentation" class="nav-item">
                <a href="#" class="nav-link active" aria-controls="momo_mob">
            
                </a>
            </li>
        </ul>
        <div class="tab-content">
            <div id="momo_mob" class="panel tab-pane active">
                <div>
                    <p style="font-weight: bold;">
                        Khi thực hiện việc chuyển tiền qua gói dịch vụ MoMo của Đại Hải Trình Mobile:</br>
						<strong style="color:red">[Phần Nội Dung]</strong> bạn nhớ ghi đúng <strong style="color:red">[HL3D <?=$info['username']?>]</strong> để nhận được Xu.</br>
                        <!--<strong style="color:red">Các bạn hãy chọn mục chuyển khoản ngân hàng giống ảnh sau đó chọn thông tin như dưới</strong>
                        <center><img src="/assets/images/momobank.png" class="img-responsive" width="300px" height="300px" style="margin:0px 50px"></center>-->
                    </p>
                </div>

                <ul>
                    <li>Số ví Momo: <strong>0797021629</strong></li>
                    <li>Chủ tài khoản: <strong>PHAM QUOC KHANH</strong></li>
					<li>Số tiền: <strong>Phải là số lớn hơn 50,000 vnd</strong></li>
                    <li style="color:red">Lưu ý: Chuyển khoản xong hãy chờ hệ thống auto tự động cộng coin sau 1-2 phút <strong>Nếu nạp sai cú pháp hãy liên hệ Admin Zalo hoặc admin Fanpage</strong></li>
                    <!--<li>Số Momo: <strong>0762037661</strong></li>
                    <li>Người nhận: <strong>Hà Văn Triệu</strong></li>
                    <li>Nội dung: <strong style="color:red" class="cuphap_game_momo">7ball_<?=$info['username']?></strong></li>
					<strong style="color:red;display: block;padding: 15px" class="text-center cuphap_game_momo">Bạn cũng có thể truy cập vào App MOMO để quét mã QR dưới đây</strong>
					<center><img src="https://momosv3.apimienphi.com/api/QRCode?phone=__MOMO_PHONE__&amount=500000&note=7ball_<?=$info['username']?>" width="200px" height="200px" style="margin:0px 50px"></img></center>-->
                </ul>
            </div>
        </div>
    </div>
</div>
        </div>

    </div>
</div>
<script>
function huyBank(){
	$.get("../api/bankSession.php?huy="+1, function(data){
		if(data == 'true'){
			Swal.fire({
                icon: "error",
                title: 'Đại Hải Trình Mobile',
                text: "Hủy giao dịch thành công!",
                confirmButtonText: "Xác Nhận",
				timer: 2000,
				timerProgressBar: true,
            }),setInterval(function(){location.reload();},2000);
		}
	});
}



function atm(){
	$.get("../api/bankQR.php", function(data){
		var result = data.split('|');
		if(result[1] == 'true'){
			$("#urlQR").html('<img src="'+ result[2] +'" width="200px" height="200px" style="margin:0px 50px"></img>');
			$("#iNoidung").html('<input type="text" class="input-code" disabled="" value="'+ result[3] +'">');
			$("#iNoidung2").html('['+ result[3] +']');
		}else{
			$("#urlQR").html('<img src="'+ result[1] +'" width="200px" height="200px" style="margin:0px 50px"></img>');
			$("#iNoidung").html('<input type="text" class="input-code" disabled="" value="'+ result[2] +'">');
			$("#iNoidung2").html('['+ result[2] +']');
		}
		
			var countDownDate = new Date(result[0]).getTime();
			var x = setInterval(function() {
			var now = new Date().getTime();
			var distance = countDownDate - now;
			var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((distance % (1000 * 60)) / 1000);
			$("#countdown").html("Mã QR sẽ hết hạn sau "+ minutes + " Phút " + seconds + " Giây ");
			if (distance < 0) {
			  clearInterval(x);
			$.get("../api/bankQR.php?noidung="+result[3], function(data1){});
			  location.reload();
			}
		  }, 1000);
		
		
	});
	$('#step1,#step2,#step3').addClass('active');
	$('.atms,.atm').addClass('active').css('display','block');
	$('.thecao,.momo').css('display','none');
	$('.card,.momos').removeClass('active');
}
function thecao(){
	$('#step1,#step2,#step3').addClass('active');
	$('.card,.thecao').addClass('active').css('display','block');
	$('.atm,.momo').css('display','none');
	$('.atms,.momos').removeClass('active');
}
function momo(){
	$('#step1,#step2,#step3').addClass('active');
	$('.momos,.momo').addClass('active').css('display','block');
	$('.atm,.thecao').css('display','none');
	$('.atms,.card').removeClass('active');
}
$('.goToBottom').click(function(){
	$("html, body").animate({ scrollTop: 700 }, 1000);
}); 
</script>