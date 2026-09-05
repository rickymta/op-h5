// Vá nội dung hỗn hợp (mixed content) khi trang chạy HTTPS.
//
// Bản client này được xây cho một triển khai HTTP gọi thẳng theo cổng. Khi đưa lên HTTPS,
// trình duyệt chặn mọi lời gọi http:// và ws:// — chặn TRƯỚC khi gửi gói tin nào, nên phía
// server không thấy gì và người chơi không nhận được thông báo nào.
//
// 1) WebSocket — đây là thứ làm hỏng việc vào game
// ------------------------------------------------
// Engine LayaAir gọi `Socket.connect(host, port)` rồi tự ghép chuỗi "ws://". Kiểm chứng
// được: trong libs/b025d-4e5e6-14e03.js có ĐÚNG MỘT lần chuỗi "ws://" và KHÔNG lần nào
// "wss://" — bản client này không có đường nào tự sinh ra địa chỉ wss.
//
//   Mixed Content: ... attempted to connect to the insecure WebSocket endpoint
//   'ws://haitac.<domain>:443/'. This request has been blocked.
//
// Client tải xong 100% rồi đứng im, không báo lỗi cho người chơi. Đó chính là triệu chứng
// "chạy đến 100% rồi dừng, không vào được màn hình tạo nhân vật".
//
// `Socket.connect` KHÔNG bao giờ thêm path, nên địa chỉ luôn ở path gốc ("/") dù login
// server trả `path: "game"`. Vì vậy nginx phải bắt WebSocket theo header Upgrade ở
// `location /` chứ không theo đường dẫn — xem docker/nginx/game_site.conf.
//
// 2) XMLHttpRequest theo cổng trực tiếp
// -------------------------------------
// Vài chỗ trong bundle vẫn ghép `http://<host>:7788/...` (nhật ký lỗi client) và các cổng
// khác. nginx đã có sẵn tiền tố đường dẫn cho đúng những dịch vụ đó, nên đổi sang tiền tố
// là đi qua 443 được ngay.
//
// VÌ SAO KHÔNG SỬA THẲNG TRONG BUNDLE
// -----------------------------------
// Các chuỗi đó nằm trong BẢNG CHUỖI đã obfuscate của engine. Nhiều bộ obfuscate xoay vòng
// mảng này lúc khởi động kèm một phép kiểm tra trên chính nội dung mảng; đổi một phần tử
// có thể làm hỏng cả bundle theo kiểu rất khó lần. Bọc ở đây không đụng tới bundle và gỡ
// ra cũng dễ.
(function () {
	'use strict';

	if (location.protocol !== 'https:') { return; }   // chạy HTTP thì giữ nguyên

	// Cổng trực tiếp -> tiền tố đường dẫn mà nginx đang phục vụ (game_site.conf).
	var CONG = { '7788': '/stat/', '12345': '/meta/', '9000': '/' };

	// http://<host>:<cổng>/<đuôi>  ->  https://<host><tiền tố><đuôi>
	function doiCong(url) {
		if (typeof url !== 'string' || url.indexOf('http://') !== 0) { return url; }
		var a;
		try { a = new URL(url); } catch (e) { return url; }
		if (a.hostname !== location.hostname) { return url; }   // chỉ đổi host của chính mình
		var tien = CONG[a.port];
		if (!tien) { return url; }
		var duoi = a.pathname.replace(/^\//, '') + a.search + a.hash;
		var moi = location.origin + tien + duoi;
		console.info('[op-https] đổi cổng trực tiếp:', url, '->', moi);
		return moi;
	}

	// ---- WebSocket ----
	var WSGoc = window.WebSocket;
	if (typeof WSGoc === 'function') {
		var nang = function (url) {
			if (typeof url !== 'string' || url.indexOf('ws://') !== 0) { return url; }
			var moi = 'wss://' + url.slice(5);
			console.info('[op-https] nâng ws -> wss:', url, '->', moi);
			return moi;
		};
		var Boc = function (url, protocols) {
			return arguments.length > 1 ? new WSGoc(nang(url), protocols) : new WSGoc(nang(url));
		};
		// Giữ nguyên bề mặt: mã khác đọc CONNECTING/OPEN/... trên cả constructor lẫn thể
		// hiện, và có thể kiểm `instanceof`.
		Boc.prototype = WSGoc.prototype;
		['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { Boc[k] = WSGoc[k]; });
		try { Object.defineProperty(Boc, 'name', { value: 'WebSocket' }); } catch (e) {}
		window.WebSocket = Boc;
	}

	// ---- XMLHttpRequest ----
	var moGoc = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function (method, url) {
		var sua = doiCong(url);
		var args = Array.prototype.slice.call(arguments);
		args[1] = sua;
		return moGoc.apply(this, args);
	};

	// ---- fetch (nếu bundle dùng tới) ----
	if (typeof window.fetch === 'function') {
		var fetchGoc = window.fetch;
		window.fetch = function (input, init) {
			if (typeof input === 'string') { input = doiCong(input); }
			return fetchGoc.call(this, input, init);
		};
	}

	console.info('[op-https] đã bọc WebSocket + XHR (trang đang chạy HTTPS)');
})();
