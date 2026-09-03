<div class="content-wrapper luna-new-year" id="f-content">
    <h1 style="font-size:0"><?=$_SESSION['username']?></h1>
    <div class="content-bg">
        <div class="user--avatar sb-avatar sb-avatar--text" style="display:inline-block;vertical-align:middle;width:50px;height:50px;border-radius:100%;font-family:Helvetica, Arial, sans-serif;position:absolute;top:16px;left:30px">
            <div class="user--avatar sb-avatar__text" style="width: 50px; height: 50px; line-height: initial; text-align: center; text-transform: uppercase; color: rgb(255, 255, 255); border-radius: 100%; background: #ff5722;">
                <div style="display: table; table-layout: fixed; width: 100%; height: 100%; font-size: 20px;"><span style="font-weight: 700;display: table-cell; vertical-align: middle; white-space: nowrap;"><span><?=substr($_SESSION['username'],0,1)?></span></span>
                </div>
            </div>
        </div>
        <h3 class="rs"><?=$_SESSION['username']?></h3>
        <p class="rs v-boxAccount-id">ID: <?=$info['id']?></p>
        <p class="rs v-boxAccount-id">Xu: <?=number_format($info['xu'])?></p>
    </div>

    <div class="tag">
        <div class="tab-list">
            <a href="#" class="tag-key" id="form-change-info">
                <span class="icon-seting"></span>Đổi thông tin, mật khẩu
            </a>
            <a href="#" class="tag-key" id="form-active-mail">
                <span class="icon-email"></span>Đổi địa chỉ email
                <br>
            </a>
        </div>
        <div class="tab-list">
            <a href="/play-game" class="tag-key" style="font-weight: bold;">
                <span class="icon-chinh-sach"></span>Chơi game
            </a>
            <a class="tag-key" href="https://zalo.me/g/rjnyeb871">
                <span class="icon-ho-tro"></span>Nhóm Zalo
            </a>
            <a class="tag-key" href="/nap-tien" style="font-weight: bold;">
                <span class="icon-nap-tien"></span>Nạp tiền
            </a>
            <a class="tag-key" href="/lich-su">
                <span class="icon-lich-su"></span>Lịch sử giao dịch
            </a>
        </div>
    </div>
    <div class="boxShadow pd8 mrl16 mb16 v-logout">
        <a role="presentation" style="cursor:pointer" href="javascript: clickLogOut();">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
                <path d="M6.04013 21L11.3202 21C11.5536 21 11.7774 20.9073 11.9424 20.7423C12.1075 20.5772 12.2002 20.3534 12.2002 20.12C12.2002 19.8866 12.1075 19.6628 11.9424 19.4977C11.7774 19.3327 11.5536 19.24 11.3202 19.24L6.04013 19.24C5.80674 19.24 5.5829 19.1473 5.41787 18.9822C5.25283 18.8172 5.16012 18.5934 5.16012 18.36L5.16012 6.03984C5.16012 5.80645 5.25284 5.58261 5.41787 5.41758C5.5829 5.25255 5.80674 5.15983 6.04013 5.15983L11.3202 5.15983C11.5536 5.15983 11.7774 5.06712 11.9424 4.90208C12.1075 4.73705 12.2002 4.51322 12.2002 4.27982C12.2002 4.04643 12.1075 3.8226 11.9424 3.65756C11.7774 3.49253 11.5536 3.39981 11.3202 3.39981L6.04013 3.39981C5.33995 3.39981 4.66845 3.67796 4.17335 4.17306C3.67825 4.66816 3.4001 5.33966 3.4001 6.03984L3.4001 18.36C3.4001 19.0602 3.67825 19.7317 4.17335 20.2268C4.66845 20.7219 5.33995 21 6.04013 21Z" fill="#EE4623"></path>
                <path d="M15.978 9.30212C15.8939 9.22094 15.8269 9.12384 15.7808 9.01647C15.7346 8.90911 15.7104 8.79363 15.7094 8.67679C15.7083 8.55994 15.7306 8.44406 15.7748 8.33591C15.8191 8.22776 15.8844 8.12951 15.9671 8.04688C16.0497 7.96425 16.1479 7.89891 16.2561 7.85466C16.3642 7.81041 16.4801 7.78815 16.597 7.78916C16.7138 7.79018 16.8293 7.81446 16.9367 7.86058C17.044 7.9067 17.1411 7.97374 17.2223 8.05779L20.7423 11.5778C20.9073 11.7428 21 11.9666 21 12.2C21 12.4333 20.9073 12.6571 20.7423 12.8222L17.2223 16.3422C17.1411 16.4262 17.044 16.4933 16.9367 16.5394C16.8293 16.5855 16.7138 16.6098 16.597 16.6108C16.4801 16.6118 16.3642 16.5896 16.2561 16.5453C16.1479 16.5011 16.0497 16.4357 15.9671 16.3531C15.8844 16.2705 15.8191 16.1722 15.7748 16.0641C15.7306 15.9559 15.7083 15.84 15.7094 15.7232C15.7104 15.6063 15.7346 15.4909 15.7808 15.3835C15.8269 15.2761 15.8939 15.179 15.978 15.0979L17.9958 13.08L7.80005 13.08C7.56665 13.08 7.34282 12.9873 7.17779 12.8222C7.01275 12.6572 6.92004 12.4334 6.92004 12.2C6.92004 11.9666 7.01275 11.7428 7.17779 11.5777C7.34282 11.4127 7.56665 11.32 7.80005 11.32L17.9958 11.32L15.978 9.30212Z" fill="#EE4623"></path>
            </svg>
            Đăng xuất
        </a>
    </div>
</div>
<div class="form-change-info form-get-gc fixBox" style="display: none">
    <form id="login-form" action="/act-pwd">
        <div class="input-elm input-code-wrapper">
            <span>Tài khoản:</span>
            <input type="text" class="input-code" disabled placeholder="Nhập tài khoản" value="<?=$_SESSION['username']?>">
        </div>

        <div class="input-elm input-code-wrapper">
            <span>Số diện thoại:</span>
		<?php if($info['phone'] == ''){?>	
            <input type="tel" class="input-code" name="sdt" placeholder="Nhập số điện thoại" value="">
		<?php } else{?>	
			<input type="text" class="input-code"  disabled value="<?=$info['phone']?>">
		<?php } ?>
        </div>

        <div class="input-elm input-code-wrapper">
            <span>Nhập mật khẩu mới:</span>
            <input type="password" class="input-code" name="password-new" placeholder="Nhập mật khẩu mới" value="">
            <b style="color:red;font-size:10px;">Chỉ nhập mật khẩu mới, khi muốn đổi mật khẩu.</b>
        </div>

        <div class="input-elm input-code-wrapper">
            <span>Nhập lại mật khẩu mới:</span>
            <input type="password" class="input-code" name="password1-new" placeholder="Nhập lại mật khẩu mới" value="">
            <b style="color:red;font-size:10px;">Chỉ nhập mật khẩu mới, khi muốn đổi mật khẩu.</b>
        </div>


        <div class="input-elm input-code-wrapper">
            <span>Nhập mật khẩu hiện tại:</span>
            <input type="password" class="input-code" name="password-old" placeholder="Nhập mật khẩu hiện tại" value="">
        </div>

        <div class="input-elm">
            <button type="submit" onclick="btnPhone();" class="fun-btn-v3 fluid lg active">Cập nhật thông tin</button>
        </div>
        <div class="input-elm">
            <button type="button" class="fun-btn-v3 fluid lg" onclick="location.reload();">Quay lại</button>
        </div>
    </form>
</div>
<div class="form-active-mail form-get-gc fixBox" style="display: none">
    <form id="login-form" action="/act-email">
        <div class="input-elm input-code-wrapper">
            <span>Địa chỉ email:</span>
            <input type="email" class="input-code" name="email" placeholder="Nhập địa chỉ email..." value="">
        </div>
        <div class="box-note" style="padding: 0px;">
            <p>1. - Sẽ có email xác nhận gửi đến email hiện tại</p>
            <p>2. - Sau khi email hiện tại xác nhận, sẽ cập nhật địa chỉ email mới</p>
        </div>
        <div class="input-elm">
            <button type="submit" class="fun-btn-v3 fluid lg active">Cập nhật email</button>
        </div>
        <div class="input-elm">
            <button type="button" class="fun-btn-v3 fluid lg" onclick="location.reload();">Quay lại</button>
        </div>
    </form>
</div>