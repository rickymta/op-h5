<?php include_once($_SERVER['DOCUMENT_ROOT'] . '/api/config.php');?>
<!DOCTYPE html>
<html lang="vi">
<?php 

?>
<head>
	<title>Đại Hải Trình Mobile</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0,maximum-scale=1.0,user-scalable=no">   
    <script src="/assets/js/jquery.min.js"></script>
	<script src="/assets/js/sweetalert2.min.js"></script>
    <link rel="stylesheet" href="/assets/css/style.css">
    <link rel="stylesheet" href="/assets/css/font-awesome.css">
	<link rel="stylesheet" href="/assets/css/sweetalert2.min.css">
	<link rel="shortcut icon" href="/assets/images/favicon.ico" type="image/x-icon"/>
	<script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
	<link rel="stylesheet" href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css">
	
	<!-- Google / Search Engine Tags -->
	<meta itemprop="name" content="Đại Hải Trình Mobile">
	<meta itemprop="description" content="Đại Hải Trình Mobile">
	<!--<meta itemprop="image" content="https://imgur.com/blcTh3q.png">-->
	
	<!-- Facebook Meta Tags -->
	<meta property="og:url" content="http://192.168.1.69">
	<meta property="og:type" content="website">
	<meta property="og:title" content="Đại Hải Trình Mobile">
	<meta property="og:description" content="Đại Hải Trình Mobile">
	<!--<meta property="og:image" content="https://imgur.com/blcTh3q.png">-->
	
</head>

<body>
    <div id="__next">
        <div id="app" class="">
            <div class="header luna-new-year">
                <div class="title-page">
                    <a class="logo" href="/user">
                        <img class="home-logo" src="/assets/images/logo.png">
                    </a>
                </div>
                <div class="user-info">
                    <div class="box-login">
					<?php if(!$_SESSION['username']){?>
                        <div role="presentation" class="fun-btn-v3 sm short">Đăng nhập</div>
					<?php } else{?>
						<div role="presentation" class="fun-btn-v3 sm short"><?=number_format($info['xu'])?> <img src="/assets/images/xu.png"></div>			
						<div onclick="clickLogOut();" style="border: solid 1px red; color: red;" role="presentation" class="fun-btn-v3 sm short">Thoát</div>
					<?php } ?>	
                    </div>
                </div>
            </div>
            <div class="breadcrumbs">
                <nav aria-label="breadcrumbs">
                    <ul>
                        <li>
                            <a href="/user">Trang chủ></a>
                        </li>
                        <li>&nbsp;Tài khoản</li>

                    </ul>
                </nav>
            </div>
            <?php
				if(!$_SESSION['username']){include './login-reg.php';}
				else{
					if(!$get['page']){
						include './taikhoan.php';
					}else{
						include "./$get[page].php";
						}
					}
			?>
            <script>
                $(".gc-box-btn-top .button-df").click(function() {
                    let form = $(this).attr("form");
                    $(".form-get-gc div.form-div").hide();
                    $(".form-get-gc #re-form").hide();
                    $("#" + form).show();
                    $(".gc-box-btn-top .button-df").removeClass("active");
                    $(this).addClass("active");
                });

                $("#form-change-info").click(function() {
                    $("#f-content").hide();
                    $(".form-change-info").show();
                });
                $("#form-active-mail").click(function() {
                    $("#f-content,.footer").hide();
                    $(".form-active-mail").show();
                });
            </script>
            <div class="footer">
                <div class="footer-logo"><img src="/assets/images/logo.png" width="130">
                </div>
                <div class="bq">Chơi quá 180p ảnh hưởng đến sức khỏe</strong>
                </div>
                <div class="bq">Một sản phẩm của KGAME</div>
            </div>

            <div class="box-cnhd" id="fixed-menu">
                <div class="fixCen main-menu luna-new-year">
                    <a role="presentation" class="btn-cnm btnbt-6 " href="/user"><span class="fun-ic ic-homepage"></span>Trang Chủ</a>
                    <a role="presentation" class="btn-cnm btnbt-3 " href="/nap-tien"><span class="fun-ic ic-nap"></span>Nạp Tiền</a>
                    <a role="presentation" class="btn-cnm btnbt-3 " href="/tich-luy"><span class="fun-ic ic-tich"></span>Tích Lũy</a>
					<a role="presentation" class="btn-cnm btnbt-4 " href="/web-shop"><span class="fun-ic ic-knb"></span>Webshop</a>
                    <a role="presentation" class="btn-cnm btnbt-6 " href="/lich-su"><span class="fun-ic ic-history"></span>Lịch Sử</a>
                    <a role="presentation" class="btn-cnm btnbt-5 " href="/tai-khoan"><span class="fun-ic ic-account"></span>Tài Khoản</a>
                </div>
            </div>
            <div class="loading" style="display:none;">Loading&#8230;</div>
            <script>
                var typeLogin = "";

                function isHome() {
                    return typeLogin == "";
                }

                function isWeb() {
                    return typeLogin == "web" || typeLogin == "local";
                }

                function isIos() {
                    return typeLogin == "ios";
                }

                function isAndroid() {
                    return typeLogin == "android";
                }

                function hideIframe() {
                    parent.postMessage('hideDiv', getDomainDom());
                }
                $(function() {
                    if (isIos() || isAndroid()) {
                        $(".reload").show();
                        $("div.footer").hide();
                        $(".vaogamebtn").hide();
                    }
                    if (isWeb()) {
                        $(".vaogamebtn").hide();
                    }
                });

                function clickReload() {
                    parent.postMessage('reload', getDomainDom());
                }

                function clickLogOut() {
                    if (isHome()) {
                        location.href = "/user-logout";
                    } else {
                        parent.postMessage('logOut', getDomainDom());
                    }
                }

                function getDomainDom() {
                    return '*';
                }
                function paySuccess() {
                    Swal.fire({
                        icon: 'success',
                        title: 'Đại Hải Trình Mobile',
                        text: 'Thanh toán thành công, có thể vào game chọn gói cần nạp rồi!',
                        showCancelButton: true,
                        confirmButtonText: "Tiếp tục nạp",
                        cancelButtonText: "Chọn gói",
                    }).then((result) => {
                        if (result.isConfirmed) {
                            location.reload();
                        } else {
                            hideIframe();
                        }
                    })
                }
                if (isIos()) {
                    window.addEventListener('message', function(event) {
                        window[event.data]();
                    }, false);
                }

                function alertReturn(type, msg, time) {
                    if (type == "error" || type == "warning") {
                        Swal.fire({
                            icon: 'error',
                            title: 'Đại Hải Trình Mobile',
                            text: msg,
                            timer: time,
                            timerProgressBar: true,
                            didOpen: () => {
                                Swal.showLoading()
                                timerInterval = setInterval(() => {
                                    const content = Swal.getContent()
                                    if (content) {
                                        const b = content.querySelector('b')
                                        if (b) {
                                            b.textContent = Swal.getTimerLeft()
                                        }
                                    }
                                }, 100)
                            },
                            willClose: () => {
                                clearInterval(timerInterval)
                            }
                        });
                    } else if (type == "success") {
                        Swal.fire({
                            icon: 'success',
                            title: 'Đại Hải Trình Mobile',
                            text: msg,
                            timer: time + 1000,
                            timerProgressBar: true,
                            didOpen: () => {
                                Swal.showLoading()
                                timerInterval = setInterval(() => {
                                    const content = Swal.getContent()
                                    if (content) {
                                        const b = content.querySelector('b')
                                        if (b) {
                                            b.textContent = Swal.getTimerLeft()
                                        }
                                    }
                                }, 100)
                            },
                            willClose: () => {
                                clearInterval(timerInterval)
                            }
                        });
                    }

                }
                $(function() {

                    $("#fixed-menu .main-menu a").each(function() {
                        if ($(this).attr("href") == window.location.pathname) {
                            $(this).addClass("active");
                        }

                    });
                    $("form").submit(function(e) {
                        e.preventDefault();
                        var action = $(this).attr("action");
                        var data = $(this).serializeArray();

                        $(".loading").show();
                        $.ajax({
                            type: "POST",
                            url: action,
                            async: true,
                            dataType: "json",
                            data: data,
                            success: function(result) {
                                $(".loading").hide();
                                if (action == "/act-card" && result.check == "success") {
                                    Swal.fire({
                                        icon: result.check,
                                        title: 'Đại Hải Trình Mobile',
                                        text: result.msg,
                                        showCancelButton: true,
                                        confirmButtonText: "Xem lịch sử",
                                        cancelButtonText: "Tiếp tục nạp",
                                    }).then((result) => {
                                        if (result.isConfirmed) {

                                            location.href = "/lich-su#the-cao";

                                        }
                                    })
                                } else if ((action == "/user/login.php" || action == "/user/register.php") && result.check == "success") {
                                    location.href = "/tai-khoan";
                                } else if ((action == "/user/email.php" || action == "/user/quenmatkhau.php") && result.check == "success") {
                                    Swal.fire({
                                        icon: result.check,
                                        title: 'Đại Hải Trình Mobile',
                                        text: result.msg,
                                        confirmButtonText: "Xác Nhận",
                                    }).then((result) => {
                                        location.reload();
                                    })
                                } else {
                                    alertReturn(result.check, result.msg, 3000);
                                    if (result.check == "success")
                                        setInterval(function(){location.reload();},3000);
                                }
                            },
                            error: function(result) {
                                $(".loading").hide();
                                alert("Lỗi hệ thống, liên hệ admin");
                            }
                        });
                    });

                })
				
            </script>
        </div>
    </div>

</body>

</html>