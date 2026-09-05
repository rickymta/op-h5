// Dua phien game do Adapter cap thang vao client, de nguoi choi da dang nhap o he
// thong ID khong phai dang nhap lan thu hai o man hinh cua client.
//
// Cach lam va ly do chon cach nay:
//
// Client (LayaAir, da obfuscate, khong co ma nguon) dang nhap bang cach POST
// username+password len login server roi dua ket qua cho `onAccLoginComplete`.
// Neu muon tu dong hoa bang cach dien san hai o text thi phai gui khoa game cua
// nguoi choi xuong trinh duyet — dung dieu ma Adapter sinh ra de tranh. Nen o day
// bo qua han buoc POST: Adapter da dang nhap ho o phia server roi, ta chi trao lai
// dung cai phan hoi ma client dang cho.
//
// `login_data` la NGUYEN VAN truong `data` cua login server, khong dien giai lai.
// Ten cac truong ben trong nam trong bytecode da obfuscate; chep nguyen ban thi
// khong the sot truong, con doan lai thi mot truong thieu se lam client vao game
// voi trang thai hong ma khong bao gi.
//
// Hong o bat ky buoc nao cung chi dan den mot ket qua: khong lam gi ca, client hien
// man hinh dang nhap cu nhu truoc. Khong bao gio de nguoi choi ket o man hinh trang.
(function () {
	'use strict';

	var auto = window.__opAuto;
	if (!auto || !auto.loginData) {
		if (window.__opAutoErr) {
			console.warn('[op-autologin] Adapter tu choi cap phien:', window.__opAutoErr);
		}
		return;
	}

	var DEADLINE = 90000; // client tai ~9.4 MB truoc khi dung man hinh dang nhap
	var STEP = 400;
	var started = Date.now();
	var done = false;

	// Tim doi tuong dieu khien man hinh dang nhap.
	//
	// Nhan dang bang HANH VI chu khong bang ten lop: ten lop bi obfuscate va doi moi
	// lan nha phat hanh build lai, con `onAccLoginComplete`/`accountLogin` thi khong
	// (chung la thuoc tinh duoc goi qua chuoi nen bo obfuscate giu nguyen).
	function findLoginScreen(node, depth) {
		if (!node || depth > 16) { return null; }
		var events = node._events;
		if (events) {
			for (var key in events) {
				if (!Object.prototype.hasOwnProperty.call(events, key)) { continue; }
				var handlers = events[key];
				if (!Array.isArray(handlers)) { handlers = [handlers]; }
				for (var i = 0; i < handlers.length; i++) {
					var owner = handlers[i] && handlers[i].caller;
					if (owner &&
						typeof owner.onAccLoginComplete === 'function' &&
						typeof owner.accountLogin === 'function') {
						return owner;
					}
				}
			}
		}
		var kids = node._children || [];
		for (var k = 0; k < kids.length; k++) {
			var hit = findLoginScreen(kids[k], depth + 1);
			if (hit) { return hit; }
		}
		return null;
	}

	// O nhap tai khoan. `onAccLoginComplete` doc lai o nay de dat ydwxConfig.openId va
	// ghi vao LocalStorage, nen phai co gia tri truoc khi goi.
	function accountField(ui) {
		if (ui.dAcc) { return ui.dAcc; }
		// Du phong khi ban client khac dat ten khac: lay TextInput dau tien.
		for (var key in ui) {
			var v = ui[key];
			var name = v && v.constructor && v.constructor.name;
			if (name && name.indexOf('TextInput') >= 0) { return v; }
		}
		return null;
	}

	// Chon dung may chu ma cong chan tai da cap.
	//
	// Khong lam thi client tu chon mac dinh (may chu dau danh sach), va cong chan tai
	// tro thanh vo nghia: Adapter tu choi s2 vi day, client van dan nguoi choi vao s2.
	//
	// CHI ep khi nguoi choi chua co nhan vat nao. Ai da co nhan vat thi client tu chon
	// dung may chu cua nhan vat do — ep sang may khac se lam ho tuong minh mat nhan vat.
	// Adapter cung phan biet hai truong hop nay (AdmitReturning vs AdmitNew).
	function pickServer(screen, tries) {
		if (!auto.srvCode || tries > 40) { return; }
		var list = screen._srvList;
		if (!list || !list.length) {
			return setTimeout(function () { pickServer(screen, tries + 1); }, 250);
		}
		var masters = screen._masterList;
		if (masters && masters.length) {
			console.info('[op-autologin] tai khoan da co nhan vat; de client tu chon may chu');
			return;
		}
		for (var i = 0; i < list.length; i++) {
			if (list[i] && list[i].code === auto.srvCode) {
				try {
					// Khong truyen co ep buoc: neu client cho rang may chu day thi nghe client.
					screen.selectServer(list[i]);
					console.info('[op-autologin] da chon may chu', auto.srvCode);
				} catch (err) {
					console.warn('[op-autologin] khong chon duoc may chu; de nguoi choi tu chon', err);
				}
				return;
			}
		}
		console.warn('[op-autologin] danh sach client khong co', auto.srvCode);
	}

	function attempt() {
		if (done) { return; }
		if (Date.now() - started > DEADLINE) {
			console.warn('[op-autologin] het thoi gian cho man hinh dang nhap; giu luong cu');
			return;
		}
		if (!window.Laya || !Laya.stage) { return setTimeout(attempt, STEP); }

		var screen = findLoginScreen(Laya.stage, 0);
		if (!screen || !screen._ui) { return setTimeout(attempt, STEP); }

		var field = accountField(screen._ui);
		if (!field) {
			console.warn('[op-autologin] khong tim thay o tai khoan; giu luong cu');
			return;
		}

		done = true;
		try {
			field.text = auto.username || '';
			// Dung khuon EcResult ma client cho doi: errorcode 0 = thanh cong.
			screen.onAccLoginComplete({
				errorcode: 0,
				errormsg: 'success',
				data: auto.loginData
			});
			console.info('[op-autologin] da vao bang phien cua Adapter',
				{ srvCode: auto.srvCode, band: auto.band });
			if (auto.warn) {
				console.warn('[op-autologin] may chu dang dong:', auto.srvCode);
			}
			pickServer(screen, 0);
		} catch (err) {
			// Da bam `done` nen khong thu lai: goi lan hai co the lam client vao trang
			// thai nua voi. De nguyen man hinh dang nhap cho nguoi choi tu lam.
			done = false;
			console.error('[op-autologin] trao phien that bai; giu luong cu', err);
		}
	}

	setTimeout(attempt, STEP);
})();
