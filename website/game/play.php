<html>
<head>
    <title>Đại Hải Trình Mobile</title>
    <meta charset='utf-8' />
	<link rel="shortcut icon" href="/assets/images/favicon.ico" type="image/x-icon"/>
 <!-- <meta name='viewport' content='width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no' /> -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <script src="/assets/js/jquery-1.9.1.js"></script>
    <script src="/assets/js/jquery-ui.js"></script>
    <script src="/assets/js/jquery.ui.touch-punch.min.js"></script>
    <script src="/assets/js/jquery.modal.min.js"></script>
	<link rel="stylesheet" href="/assets/css/jquery.modal.min.css" />
    <!--<script src="/check.js"></script>-->
</head>

<body id="body">
<div class="frame" style="margin: auto;" id="iframe"></div>
<button onclick="closes()" id="close" style="display:none;position: absolute; z-index: 99999999; left: auto; right: 6px; top: 6px; width: 44px; height: 46px; border: 0px; cursor: pointer; background: url(/assets/images/back.png) no-repeat; font-size: 0;">Đóng</button>
<script>
var appVersion = "28.3";

function closes(){
	$('.none').css('display','none');
	$('#close').css('display','none');
}
$(function() {
    $('.dragitem').draggable({
        containment: "#body",
        scroll: false
    });
$('.dragitem').click(function() {
	$('#close').css('display','block');
	$('#iframe').html("<iframe class='none' style='z-index: 999999; position: absolute;width: 100%; height: 100%;border: 0;' src='/nap-tien'></iframe>");
});
});
function openNapTien(){
	$('#close').css('display','block');
    $('#iframe').html("<iframe class='none' style='z-index: 999999; position: absolute;width: 100%; height: 100%;border: 0;' src='/nap-tien'></iframe>");
}
</script>
    <div style="display:none" class="dragitem"></div>
    <style>
        #body {
            width: 100%;
            height: 100%;
        }
        @font-face {
            font-family: Arial;
            src: url(/assets/fonts/msyh.ttf);
        }
        @font-face {
            font-family: heroname;
            src: url(/assets/fonts/heroname.ttf);
        }
		@font-face {
            font-family: Helvetica;
            src: url(/assets/fonts/msyh.ttf);
        }
		@font-face {
            font-family: Times;
            src: url(/assets/fonts/msyh.ttf);
        }
        * {
            font-family: Times, Arial;
        }
        .dragitem {
            background: url(/assets/images/icon.png) 50% 50% / 60px 60px no-repeat rgb(255, 255, 255);
            width: 55px;
            height: 55px;
            display: block;
            left: 0px;
            cursor: pointer;
            border-radius: 50%;
            border: unset;
            user-select: none;
            position: absolute;
            top: 100px;
            transform: translateX(-27px);
            z-index: 3;
            pointer-events: initial !important;
        }
    </style>
    <script type="text/javascript">
        function loadLib(url) {
            var script = document.createElement("script");
            script.async = false;
            script.src = url;
            document.body.appendChild(script);
        }
    </script>
    <script type="text/javascript" src="a3b31-4c087-1dc2f.js"></script>
</body>
</html>