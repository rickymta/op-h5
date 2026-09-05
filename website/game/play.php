<?php
// Hoi Adapter mot phien game da san sang, roi nhung ket qua vao trang.
//
// Vi sao goi o day chu khong de client tu goi: cookie phien (haitac_sess) la HttpOnly,
// va lam o phia server thi cong chan tai (Adapter tu choi khi may chu day) chay TRUOC
// khi client kip tai 9.4 MB tai nguyen.
//
// Khong co ADAPTER_BASE_URL, khong co cookie, hay Adapter tu choi -> $opAuto = null va
// trang chay y het nhu cu (client hien man hinh dang nhap cua no). Day la duong lui bat
// buoc: tang PHP nay con phuc vu ca luong dang nhap cu.
// Trang nay gio mang du lieu phien RIENG cua tung nguoi choi (token game, uid, may chu).
// Truoc day no la HTML tinh nen khong ai dat header cache; de nguyen thi trinh duyet —
// hay bat ky proxy nao dung truoc — co the tra phien cua nguoi nay cho nguoi khac.
header('Cache-Control: no-store, private');
header('Pragma: no-cache');

$opAuto = null;
$opAutoErr = '';
$adapterBase = getenv('ADAPTER_BASE_URL');
if ($adapterBase && isset($_COOKIE['haitac_sess'])) {
	$ch = curl_init(rtrim($adapterBase, '/') . '/api/game/session');
	curl_setopt_array($ch, array(
		CURLOPT_POST           => true,
		CURLOPT_POSTFIELDS     => '{"client_type":0}',
		CURLOPT_HTTPHEADER     => array('Content-Type: application/json'),
		// Chi chuyen dung cookie phien, khong bung nguyen $_COOKIE sang dich vu khac.
		// Loc `;` va khoang trang: gia tri cookie do trinh duyet gui len, noi thang vao
		// header thi mot dau `;` cho phep gan them cookie tuy y vao request noi bo.
		CURLOPT_COOKIE         => 'haitac_sess=' . preg_replace('/[^A-Za-z0-9._~+\/=-]/', '', $_COOKIE['haitac_sess']),
		CURLOPT_RETURNTRANSFER => true,
		// Hai timeout khac nhau: CONNECTTIMEOUT chan truong hop Adapter chet han (khong
		// ai lang nghe) — khong co no thi moi luot tai trang treo du 5 giay. TIMEOUT la
		// tran cho ca luot goi.
		CURLOPT_CONNECTTIMEOUT => 2,
		CURLOPT_TIMEOUT        => 5,
	));
	$body = curl_exec($ch);
	$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	curl_close($ch);
	$j = $body ? json_decode($body, true) : null;
	if ($code === 200 && is_array($j) && !empty($j['login_data'])) {
		$opAuto = array(
			'username'  => isset($j['game_username']) ? $j['game_username'] : '',
			'srvCode'   => isset($j['srv_code']) ? $j['srv_code'] : '',
			'wsUrl'     => isset($j['ws_url']) ? $j['ws_url'] : '',
			'band'      => isset($j['band']) ? $j['band'] : '',
			'warn'      => !empty($j['warn']),
			'loginData' => $j['login_data'],
		);
	} else {
		// Bi tu choi vi qua tai thi noi ro ly do, dung de nguoi choi doan.
		// 503 (qua tai) tra ve `message`; cac loi khac di qua httpx.Error nen la
		// `error_description`. Doc ca hai, neu khong thi ly do that bi nuot.
		$opAutoErr = '';
		if (is_array($j)) {
			if (isset($j['message'])) {
				$opAutoErr = $j['message'];
			} elseif (isset($j['error_description'])) {
				$opAutoErr = $j['error_description'];
			}
		}
	}
}
?>
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
// Ma bam theo NOI DUNG bundle, de doi PUBLIC_HOST la URL doi theo.
//
// nginx phuc vu /libs/ voi "immutable, 30d" con `?v=` lai la appVersion co dinh. Khi
// web-entrypoint sed host moi vao bundle, URL khong doi nen trinh duyet giu ban cu —
// nguoi choi tiep tuc goi host CU toi 30 ngay. Da dinh that: sau khi doi host, client
// van goi 192.168.1.69:7788 tu bundle trong cache.
var opBundleV = "<?php echo @filemtime(__DIR__ . '/libs/e228b-0b904-ac44c.js') ?: '0'; ?>";

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
    <script type="text/javascript">
        // Phien do Adapter cap (rong neu chua dang nhap qua he thong ID).
        // JSON_HEX_TAG|AMP|APOS|QUOT bien `<`, `>`, `&`, `'`, `"` thanh \uXXXX. Du lieu
        // duoi day nhung thang vao khoi script, ma mot chuoi chua the dong script hay
        // mo comment HTML se cat khoi script som va nuot cac the phia sau.
        //
        // KHONG viet nguyen van cac chuoi do o day — ke ca trong comment. Trinh phan tich
        // HTML khong biet day la comment JavaScript: no van cat. Da dinh dung loi nay.
        window.__opAuto = <?php echo $opAuto
            ? json_encode($opAuto, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)
            : 'null'; ?>;
        window.__opAutoErr = <?php echo json_encode($opAutoErr,
            JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
    </script>
    <script type="text/javascript" src="a3b31-4c087-1dc2f.js?v=<?php
        // Cung ly do nhu opBundleV: file nay cung bi cache (7d) va no la noi quyet dinh
        // URL cua bundle chinh, nen ban cu se tiep tuc nap bundle cu.
        echo @filemtime(__DIR__ . '/a3b31-4c087-1dc2f.js') ?: '0'; ?>"></script>
    <script type="text/javascript" src="op-autologin.js?v=<?php
        // filemtime chu khong phai so co dinh: sua shim ma quen tang so thi trinh duyet
        // giu ban cu trong cache va thay doi khong co tac dung nao.
        echo @filemtime(__DIR__ . '/op-autologin.js') ?: '1'; ?>"></script>
    <script type="text/javascript" src="op-dialog-close.js?v=<?php
        echo @filemtime(__DIR__ . '/op-dialog-close.js') ?: '1'; ?>"></script>
</body>
</html>