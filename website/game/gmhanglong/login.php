<?php
// Trang dang nhap GM tool. Thay cho o "mã uỷ quyền" cu.
require_once __DIR__ . '/config/auth.php';
gm_bootstrap();

$loi = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$loi = gm_login(isset($_POST['username']) ? $_POST['username'] : '',
	                isset($_POST['password']) ? $_POST['password'] : '');
	if ($loi === null) {
		$next = isset($_POST['next']) ? $_POST['next'] : '/gmhanglong/gm/';
		// Chi cho phep quay ve duong dan noi bo: tranh bi dan sang site khac.
		if ($next === '' || $next[0] !== '/' || strpos($next, '//') === 0) { $next = '/gmhanglong/gm/'; }
		header('Location: ' . $next, true, 302);
		exit;
	}
}
$next = isset($_GET['next']) ? $_GET['next'] : '/gmhanglong/gm/';
?><!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đăng nhập GM</title>
<style>
  :root { --nen:#0C1D2B; --the:#122636; --vien:#22394D; --chu:#E4EDF3; --mo:#9CB0C0; --nhan:#EE4623; }
  * { box-sizing:border-box }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:var(--nen); color:var(--chu); font:16px/1.6 ui-sans-serif,system-ui,sans-serif; padding:20px }
  form { width:100%; max-width:380px; background:var(--the); border:1px solid var(--vien);
         border-radius:6px; padding:26px }
  h1 { font-size:20px; margin:0 0 4px }
  p.sub { color:var(--mo); font-size:14px; margin:0 0 20px }
  label { display:block; font-size:13.5px; color:var(--mo); margin:14px 0 6px }
  input { width:100%; padding:11px 12px; font-size:16px; border-radius:4px;
          border:1px solid var(--vien); background:#0d1f2e; color:var(--chu) }
  input:focus { outline:2px solid var(--nhan); outline-offset:-1px }
  button { width:100%; margin-top:20px; padding:12px; font-size:16px; font-weight:600; cursor:pointer;
           border:0; border-radius:4px; background:var(--nhan); color:#fff }
  .loi { margin-top:14px; padding:10px 12px; border-radius:4px; font-size:14px;
         background:#3A1E1A; color:#E0685A }
</style>
</head>
<body>
<form method="post" autocomplete="off">
  <h1>Công cụ GM</h1>
  <p class="sub">Đại Hải Trình</p>
  <input type="hidden" name="next" value="<?php echo htmlspecialchars($next, ENT_QUOTES, 'UTF-8'); ?>">
  <label for="u">Tài khoản</label>
  <input id="u" name="username" autocapitalize="off" autocorrect="off" required>
  <label for="p">Mật khẩu</label>
  <input id="p" name="password" type="password" required>
  <button type="submit">Đăng nhập</button>
  <?php if (!empty($loi)) { ?><div class="loi"><?php echo htmlspecialchars($loi, ENT_QUOTES, 'UTF-8'); ?></div><?php } ?>
</form>
</body>
</html>
