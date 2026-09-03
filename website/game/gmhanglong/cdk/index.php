<!DOCTYPE html>
<html lang="zh-cn">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="renderer" content="webkit">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Tạo ủy Quyền</title>
<link href="css/bootstrap.min.css" rel="stylesheet">
<link href="css/bootstrap-select.min.css" rel="stylesheet">
<link href="images/main.css" rel="stylesheet">
<script type="text/javascript" src="js/jquery.min.js"></script>
<script type="text/javascript" src="js/bootbox.min.js"></script>
<script type="text/javascript" src="js/bootstrap.min.js"></script>
<script type="text/javascript" src="js/bootstrap-select.min.js"></script>
<script type="text/javascript" src="js/defaults-zh_CN.js"></script>
</head>
<body>
  <div class="intro" style="margin-top:0px;">
  	 &nbsp;
    <div class="col-md-4 col-centered tac"> <img src="images/logo.png" alt="logo"> </div>
    <div class="container">
      <div class="row">
        <div class="col-md-3 col-sm-8 col-centered">
          <form method="post" id="register-form" autocomplete="off" action="cdks.php" class="nice-validator n-default" novalidate>
            &nbsp;
			<div class="form-group">
			  <input type="text" class="form-control" id="sqm" name="sqm" placeholder="Mã ủy quyền GM" autocomplete="off">
            </div>
			<div class="form-group">
			  <input type="text" class="form-control" id="num" name="num" placeholder="Tạo số lượng" autocomplete="off">
            </div>
            <div class="form-group">
              <select id="type" class="form-control" name="type"><option value="0">Vui lòng chọn loại</option><option value="1">Chỉ nạp KNB
</option><option value="2">Full quyền</option></select>
            </div>
            <div class="form-center-button">
			  <input class="btn btn-danger" type="submit" value="Tạo mã ủy quyền">
			</div><br>
            <div id="divMsg" style="color:#F00" class="validator-tips">2023 源码屋：www.51boshao.com</div>
          </form>
        </div>
      </div>
    </div>
  </div>
<script>
document.onkeydown = function(event) {
	var target, code, tag;
	if (!event) {
		event = window.event; //针对ie浏览器
		target = event.srcElement;
		code = event.keyCode;
		if (code == 13) {
			tag = target.tagName;
			if (tag == "TEXTAREA") { return true; }
			else { return false; }
		}
	}else {
		target = event.target; //针对遵循w3c标准的浏览器，如Firefox
		code = event.keyCode;
		if (code == 13) {
			tag = target.tagName;
			if (tag == "INPUT") { return false; }
			else { return true; }
		}
	}
};
</script>
</body>
</html>