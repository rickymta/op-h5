<?php
require_once __DIR__ . '/../gmhanglong/config/auth.php';
gm_bootstrap();
$GM = gm_require();
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>GM后台</title>
</head>
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <!-- 最新版本的 Bootstrap 核心 CSS 文件 -->
    <link rel="stylesheet" href="./css/bootstrap.min.css">
</head>
<body>
<div class="text-center col-md-4 center-block">

    <h3 style="color:blue">GM Hậu trường</h3> <br>
    <button class="btn btn-info btn-block" onclick="window.location.href='./user/gm/email.php'">Bưu kiện hệ thống</button>
    <button class="btn btn-info btn-block" onclick="window.location.href='./user/gm/qfemail.php'">Toàn bộ server bưu kiện hệ thống</button>
    <br>
    <?php include_once './user/gm/footer.php'; ?>
</div>

</body>
</html>