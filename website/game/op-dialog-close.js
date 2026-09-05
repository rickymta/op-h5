// Cho phep dong cac hop thoai thong tin cua client bang cach bam ra ngoai, hoac bang Esc.
//
// VAN DE
// ------
// Hop thoai "Thong bao" va "Dieu khoan nguoi dung" deu CO nut dong, nhung nut do la mot
// the trang tri ma vang o goc tren phai — nhin khong ra la nut. Nguoi choi chi con nut
// "Xac dinh" o duoi, va neu hop thoai dai hon man hinh thi nut do cung khuat. Bam ra
// ngoai — phan xa quen thuoc voi moi hop thoai — thi khong co tac dung gi.
//
// CACH LAM
// --------
// Cac hop thoai nay la mot Box phu kin san khau, ben trong dat mot khung nho hon. Bam vao
// vung trong cua lop phu se bao ve target chinh la cai Box do (da do tren client that),
// nen chi can: target === box  =>  dong. Dung dung khuon modal tieu chuan, khong phai
// tinh toan hinh hoc.
//
// DANH SACH TRANG: chi nhung hop thoai THUAN THONG TIN.
//   - boxYisi (dong y quyen rieng tu): KHONG. Dong bang cach bam ra ngoai la bo qua mot
//     buoc dong y — nguoi choi chua chon gi ma coi nhu da chon.
//   - boxStart / boxServer / boxEnter: KHONG. Day la cac man hinh, khong phai hop thoai;
//     "dong" chung se de nguoi choi o man hinh trang.
//   - boxDev / boxZizhi: KHONG. Chua ro dung de lam gi, khong dong vao.
//
// Hong o bat ky buoc nao cung chi dan den: khong lam gi ca, hop thoai giu nguyen hanh vi
// cu (van dong duoc bang nut X va "Xac dinh").
(function () {
	'use strict';

	var DIALOGS = ['boxNotice', 'boxPcol'];
	var DEADLINE = 90000;
	var STEP = 400;
	var started = Date.now();
	var wired = false;

	// Tim doi tuong dieu khien man hinh dang nhap — nhan dang bang hanh vi, giong
	// op-autologin.js: ten lop bi obfuscate va doi moi lan build lai, con ten cac phuong
	// thuc duoc goi qua chuoi thi khong.
	function findScreen(node, depth) {
		if (!node || depth > 16) { return null; }
		var events = node._events;
		if (events) {
			for (var key in events) {
				if (!Object.prototype.hasOwnProperty.call(events, key)) { continue; }
				var handlers = events[key];
				if (!Array.isArray(handlers)) { handlers = [handlers]; }
				for (var i = 0; i < handlers.length; i++) {
					var owner = handlers[i] && handlers[i].caller;
					if (owner && typeof owner.onAccLoginComplete === 'function' && owner._ui) {
						return owner;
					}
				}
			}
		}
		var kids = node._children || [];
		for (var k = 0; k < kids.length; k++) {
			var hit = findScreen(kids[k], depth + 1);
			if (hit) { return hit; }
		}
		return null;
	}

	function hide(box) {
		try {
			box.visible = false;
		} catch (err) {
			console.warn('[op-dialog-close] khong dong duoc hop thoai', err);
		}
	}

	function wire(screen) {
		var ui = screen._ui;
		var done = [];
		for (var i = 0; i < DIALOGS.length; i++) {
			var name = DIALOGS[i];
			var box = ui[name];
			if (!box || typeof box.on !== 'function') { continue; }
			(function (box) {
				box.on(Laya.Event.CLICK, box, function (e) {
					// Chi khi bam trung CHINH lop phu. Bam vao khung ben trong thi target la
					// mot node con, va hop thoai phai giu nguyen.
					if (e && e.target === box) { hide(box); }
				});
			})(box);
			done.push(name);
		}

		// Esc: dong hop thoai dang mo tren cung. Client chay trong iframe/trang rieng nen
		// khong tranh phim voi giao dien nao khac.
		document.addEventListener('keydown', function (e) {
			if (e.key !== 'Escape' && e.keyCode !== 27) { return; }
			for (var j = DIALOGS.length - 1; j >= 0; j--) {
				var b = ui[DIALOGS[j]];
				if (b && b.visible) { hide(b); return; }
			}
		});

		console.info('[op-dialog-close] da gan dong-bang-bam-ra-ngoai cho', done);
	}

	function attempt() {
		if (wired) { return; }
		if (Date.now() - started > DEADLINE) { return; }
		if (!window.Laya || !Laya.stage) { return setTimeout(attempt, STEP); }
		var screen = findScreen(Laya.stage, 0);
		if (!screen) { return setTimeout(attempt, STEP); }
		wired = true;
		try {
			wire(screen);
		} catch (err) {
			console.warn('[op-dialog-close] khong gan duoc; giu hanh vi cu', err);
		}
	}

	setTimeout(attempt, STEP);
})();
