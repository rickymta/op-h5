<?php
// Xac thuc cho GM tool.
//
// Thay cho co che cu: mot CHUOI TINH trong config duoc so bang `$sqm != $gm_code`.
// Chuoi do khong khoa duoc tung nguoi, khong doi duoc neu khong trien khai lai, khong
// de lai dau vet ai lam gi — ma cac viec o day deu tao ra gia tri trong game (vat pham,
// tien, CDK).
//
// Cach dung o dau moi trang GM:
//
//     require_once __DIR__ . '/../config/auth.php';
//     gm_require();                        // chua dang nhap -> chuyen sang trang login
//     ... lam viec ...
//     gm_audit('cdk_create', $type, json_encode(['so_luong' => $num]));
//
// Mat khau bam bang password_hash() (bcrypt). Chon bcrypt chu khong phai Argon2id de
// `identity.VerifyPassword` ben Go doc duoc cung mot bang.

if (!defined('GM_AUTH_LOADED')) {
	define('GM_AUTH_LOADED', 1);

	// Khoa tam sau ngan nay lan sai lien tiep, trong ngan nay phut.
	define('GM_MAX_FAILED', 8);
	define('GM_LOCK_MINUTES', 15);

	/**
	 * Ket noi CSDL `platform` (noi dat gm_users/gm_audit).
	 *
	 * Dung bien moi truong chu khong phai $PZ: $PZ tro vao `cdks`, va mat khau o do do
	 * web-entrypoint dien vao CAY NGUON — khong nen nhan them mot cho nua.
	 */
	function gm_db() {
		static $pdo = null;
		if ($pdo !== null) { return $pdo; }

		$host = getenv('ID_DB_HOST') ?: '127.0.0.1';
		$name = getenv('ID_DB_NAME') ?: 'platform';
		$user = getenv('ID_DB_USER') ?: 'root';
		$pass = getenv('ID_DB_PASSWORD');
		if ($pass === false || $pass === '') {
			// Khong doan mat khau: chay tiep se tao ra loi kho hieu o cho khac.
			gm_die('GM tool chua duoc cau hinh (thiếu ID_DB_PASSWORD).');
		}
		$pdo = new PDO(
			"mysql:host={$host};dbname={$name};charset=utf8mb4", $user, $pass,
			array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
			      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			      PDO::ATTR_EMULATE_PREPARES => false)
		);
		return $pdo;
	}

	function gm_ip_bin() {
		$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
		$bin = @inet_pton($ip);
		return $bin === false ? null : $bin;
	}

	function gm_die($msg) {
		header('Content-Type: text/html; charset=utf-8');
		echo '<meta charset="utf-8"><p style="font:16px/1.6 sans-serif;padding:24px">'
		   . htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') . '</p>';
		exit;
	}

	function gm_session_start() {
		if (session_status() === PHP_SESSION_NONE) {
			// Cookie phien khong duoc de JavaScript doc, va khong gui sang site khac.
			session_set_cookie_params(array(
				'lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
				'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
			));
			session_name('gmsess');
			session_start();
		}
	}

	/** Ghi mot dong nhat ky. Khong bao gio nem loi ra ngoai: mat nhat ky khong duoc lam hong thao tac. */
	function gm_audit($action, $target = null, $detail = null) {
		try {
			gm_session_start();
			$id = isset($_SESSION['gm_id']) ? $_SESSION['gm_id'] : null;
			$un = isset($_SESSION['gm_user']) ? $_SESSION['gm_user'] : '?';
			$st = gm_db()->prepare(
				'INSERT INTO gm_audit (gm_user_id, username, action, target, detail, ip)
				 VALUES (?,?,?,?,?,?)');
			$st->execute(array($id, $un, $action, $target, $detail, gm_ip_bin()));
		} catch (Throwable $e) {
			error_log('gm_audit: ' . $e->getMessage());
		}
	}

	/** Ghi nhat ky cho mot lan dang nhap that bai (chua biet la ai). */
	function gm_audit_anon($username, $action, $detail = null) {
		try {
			$st = gm_db()->prepare(
				'INSERT INTO gm_audit (gm_user_id, username, action, detail, ip) VALUES (NULL,?,?,?,?)');
			$st->execute(array((string)$username, $action, $detail, gm_ip_bin()));
		} catch (Throwable $e) {
			error_log('gm_audit_anon: ' . $e->getMessage());
		}
	}

	/**
	 * Kiem tra dang nhap. Tra ve chuoi loi, hoac null neu thanh cong.
	 *
	 * Thong bao co y GIONG NHAU cho moi truong hop sai: khong cho biet tai khoan co ton
	 * tai hay khong.
	 */
	function gm_login($username, $password) {
		$username = strtolower(trim((string)$username));
		$chung = 'Tài khoản hoặc mật khẩu không đúng.';
		if ($username === '' || $password === '') { return $chung; }

		$st = gm_db()->prepare('SELECT * FROM gm_users WHERE username = ? LIMIT 1');
		$st->execute(array($username));
		$u = $st->fetch();

		if (!$u) {
			// Van bam mot lan de thoi gian phan hoi khong tiet lo tai khoan co ton tai khong.
			password_hash((string)$password, PASSWORD_DEFAULT);
			gm_audit_anon($username, 'login_failed');
			return $chung;
		}
		if ($u['status'] !== 'active') {
			gm_audit_anon($username, 'login_failed', 'status=' . $u['status']);
			return 'Tài khoản đang bị khoá.';
		}
		if (!empty($u['locked_until']) && strtotime($u['locked_until']) > time()) {
			gm_audit_anon($username, 'login_failed', 'dang bi khoa tam');
			return 'Sai quá nhiều lần. Vui lòng thử lại sau ít phút.';
		}

		if (!password_verify((string)$password, $u['password_hash'])) {
			$n = (int)$u['failed_count'] + 1;
			if ($n >= GM_MAX_FAILED) {
				gm_db()->prepare(
					'UPDATE gm_users SET failed_count = 0, locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?'
				)->execute(array(GM_LOCK_MINUTES, $u['id']));
			} else {
				gm_db()->prepare('UPDATE gm_users SET failed_count = ? WHERE id = ?')
				       ->execute(array($n, $u['id']));
			}
			gm_audit_anon($username, 'login_failed');
			return $chung;
		}

		// Bam lai neu tham so bcrypt da lac hau.
		if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
			gm_db()->prepare('UPDATE gm_users SET password_hash = ? WHERE id = ?')
			       ->execute(array(password_hash((string)$password, PASSWORD_DEFAULT), $u['id']));
		}
		gm_db()->prepare(
			'UPDATE gm_users SET failed_count = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = ? WHERE id = ?'
		)->execute(array(gm_ip_bin(), $u['id']));

		gm_session_start();
		session_regenerate_id(true);   // chan co dinh phien
		$_SESSION['gm_id']   = (int)$u['id'];
		$_SESSION['gm_user'] = $u['username'];
		$_SESSION['gm_role'] = $u['role'];
		gm_audit('login');
		return null;
	}

	function gm_logout() {
		gm_session_start();
		gm_audit('logout');
		$_SESSION = array();
		session_destroy();
	}

	function gm_user() {
		gm_session_start();
		return isset($_SESSION['gm_id']) ? array(
			'id' => $_SESSION['gm_id'], 'username' => $_SESSION['gm_user'],
			'role' => isset($_SESSION['gm_role']) ? $_SESSION['gm_role'] : 'gm',
		) : null;
	}

	/**
	 * Chan o dau moi trang GM. Chua dang nhap thi chuyen sang trang dang nhap.
	 *
	 * `$json = true` cho cac endpoint tra du lieu: chuyen huong se lam client nhan HTML
	 * thay vi JSON va bao mot loi khong lien quan.
	 */
	function gm_require($json = false) {
		$u = gm_user();
		if ($u) { return $u; }
		if ($json) {
			header('Content-Type: application/json; charset=utf-8', true, 401);
			echo json_encode(array('error' => 'unauthorized', 'message' => 'Chưa đăng nhập.'));
			exit;
		}
		$next = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/gmhanglong/';
		header('Location: /gmhanglong/login.php?next=' . urlencode($next), true, 302);
		exit;
	}

	/**
	 * Tao tai khoan GM dau tien tu bien moi truong, neu bang con rong.
	 *
	 * Chi chay khi CHUA co tai khoan nao: dat lai mat khau cho tai khoan da co phai lam
	 * co y, khong phai vi ai do de sot bien moi truong tren may.
	 */
	function gm_bootstrap() {
		$u = getenv('GM_BOOTSTRAP_USER');
		$p = getenv('GM_BOOTSTRAP_PASSWORD');
		if (!$u || !$p) { return; }
		try {
			$n = (int)gm_db()->query('SELECT COUNT(*) FROM gm_users')->fetchColumn();
			if ($n > 0) { return; }
			gm_db()->prepare(
				'INSERT INTO gm_users (username, password_hash, display_name, role) VALUES (?,?,?,?)'
			)->execute(array(strtolower(trim($u)), password_hash($p, PASSWORD_DEFAULT), $u, 'owner'));
			gm_audit_anon(strtolower(trim($u)), 'bootstrap');
		} catch (Throwable $e) {
			error_log('gm_bootstrap: ' . $e->getMessage());
		}
	}
}
