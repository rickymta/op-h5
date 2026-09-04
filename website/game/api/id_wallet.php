<?php
// Cau noi tu cong thanh toan PHP sang vi cua he thong ID.
//
// Vi sao giu tich hop nha cung cap o day: card.php / bankCallback.php / momoCallback.php
// dang chay voi API key va chu ky that. Viet lai chung bang Go nghia la chuyen ca phan
// rui ro nhat sang ma chua chay ngay nao. Thay vao do, khi nha cung cap DA xac nhan,
// goi ham duoi day de tien vao so cai cua he thong ID thay vi cot web.user.xu.
//
// Cach dung trong mot callback da xac nhan thanh toan:
//
//     require_once __DIR__ . '/id_wallet.php';
//     $r = id_wallet_topup($username, $soXu, 'the-' . $taskId, 'Nap the ' . $mangDiDong);
//     if (!$r['ok']) { error_log('nap vi ID that bai: ' . $r['error']); }
//
// idempotency_key BAT BUOC va phai gan voi ma giao dich cua nha cung cap. Cac cong
// thanh toan deu ban lai callback khi khong nhan duoc 200; khong co khoa nay thi moi
// lan ban lai la mot lan cong tien.

// Cau hinh doc tu bien moi truong, KHONG hardcode: repo nay la public.
// Dat trong php-fpm pool (env[ID_BASE_URL] = ...) hoac trong file .env cua he thong.
function id_wallet_config() {
    return array(
        'base_url' => getenv('ID_BASE_URL') ?: 'http://127.0.0.1:8080',
        'secret'   => getenv('ID_INTERNAL_SECRET') ?: '',
    );
}

/**
 * Cong tien vao vi cua nguoi choi o he thong ID.
 *
 * @param string $username  ten dang nhap ben he thong ID (trung voi web.user.username)
 * @param int    $amount    so Xu, phai > 0
 * @param string $idemKey   khoa chong trung, gan voi ma giao dich cua nha cung cap
 * @param string $memo      ghi chu hien trong lich su cua nguoi choi
 * @param string $reference ma don ben ngoai, de doi soat
 * @return array{ok:bool, error?:string, txn?:int, balance?:int}
 */
function id_wallet_topup($username, $amount, $idemKey, $memo = '', $reference = '') {
    $cfg = id_wallet_config();
    if ($cfg['secret'] === '') {
        return array('ok' => false, 'error' => 'chua dat ID_INTERNAL_SECRET');
    }
    if ((int)$amount <= 0) {
        return array('ok' => false, 'error' => 'so tien phai lon hon 0');
    }
    if ($idemKey === '') {
        return array('ok' => false, 'error' => 'thieu idempotency_key');
    }

    $body = json_encode(array(
        'username'        => $username,
        'amount'          => (int)$amount,
        'idempotency_key' => $idemKey,
        'reference'       => $reference,
        'memo'            => $memo,
    ), JSON_UNESCAPED_UNICODE);

    $ts  = time();
    // Cong thuc phai khop internal/wallet/internalapi.go: hmac(secret, "<ts>." . body)
    $sig = hash_hmac('sha256', $ts . '.' . $body, $cfg['secret']);

    $ch = curl_init($cfg['base_url'] . '/internal/wallet/topup');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'X-Timestamp: ' . $ts,
        'X-Signature: ' . $sig,
    ));
    $out  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);

    if ($out === false) {
        return array('ok' => false, 'error' => 'khong goi duoc he thong ID: ' . $cerr);
    }
    $data = json_decode($out, true);
    if ($code !== 200) {
        $msg = is_array($data) && isset($data['error_description'])
             ? $data['error_description'] : ('HTTP ' . $code);
        return array('ok' => false, 'error' => $msg);
    }
    return array(
        'ok'      => true,
        'txn'     => isset($data['txn']) ? (int)$data['txn'] : 0,
        'balance' => isset($data['balance']) ? (int)$data['balance'] : 0,
    );
}

/**
 * Cong tien cho nguoi choi, chon dung MOT kho tien.
 *
 * Day la cong tac chuyen doi giua he cu va he moi:
 *   - ID_WALLET_ENABLED=1  -> tien vao so cai cua he thong ID
 *   - nguoc lai            -> giu nguyen duong cu, cong vao web.user.xu
 *
 * KHONG BAO GIO cong ca hai. Cong ca hai nghia la nguoi choi co tien o hai noi va
 * tieu duoc hai lan.
 *
 * Neu bat he moi ma goi that bai (he thong ID chet, mang loi), ham nay KHONG am tham
 * quay ve duong cu: no ghi log va tra ve false. Quay ve duong cu luc do se tao ra
 * tien o dung noi ma khong ai doi soat.
 *
 * @return bool true neu da cong duoc tien
 */
function id_wallet_credit($pdo, $username, $amount, $idemKey, $memo = '', $reference = '') {
    if ((int)$amount <= 0 || $username === '') {
        return false;
    }
    if (getenv('ID_WALLET_ENABLED') !== '1') {
        // Duong cu: mot lenh cong don gian, khong co chong trung.
        $pdo->prepare("UPDATE `user` SET `xu` = `xu` + ? WHERE `username` = ?")
            ->execute(array($amount, $username));
        return true;
    }
    $r = id_wallet_topup($username, $amount, $idemKey, $memo, $reference);
    if (!$r['ok']) {
        // Ghi log de doi soat tay. KHONG cong vao web.user.xu thay the.
        error_log(sprintf('id_wallet_credit that bai: user=%s amount=%d key=%s loi=%s',
            $username, $amount, $idemKey, $r['error']));
        return false;
    }
    return true;
}
