// Tu di ai tiep theo sau khi thang, thay vi doi dem nguoc roi dong.
//
// Man hinh thang tran co hai nut — `btnSure` ("Xac dinh") va `btnReturn` ("Tro ve") — cung
// mot nhan dem nguoc `labCD` ("10 Giay sau quan be"). De yen thi het gio no tu dong, nguoi
// choi phai bam lai de danh ai ke tiep. Lop nay bam `btnSure` ho.
//
// VI SAO NHAN DIEN BANG HANH VI, KHONG BANG TEN LOP
//
// Ten lop trong bundle da obfuscate va doi moi lan nha phat hanh build lai; ten thanh phan
// giao dien (`btnSure`, `labCD`...) thi khong, vi chung den tu `ui.bin` va duoc gan len
// doi tuong theo dung ten do. Cach nay giong `op-autologin.js` da dung.
//
// Bo bon thuoc tinh duoi day CHI co o mot man hinh duy nhat trong ca 865 man hinh cua
// `ui.bin` — da doi chieu: `btnSure` + `labCD` + `btnStatis` co o bon man
// (BattleVictory, DestinyVictory, FB9, ToTemGKVictory), them `labTip` thi chi con
// BattleVictory. Nho vay khong bam nham vao cua so khac, nhat la cua so tra tien.
//
// AN TOAN
//
//   * Chi bam DUNG nut `btnSure` cua dung man hinh do. Khong bam bat cu thu gi khac.
//   * Moi cua so chi bam mot lan (danh dau tren chinh doi tuong).
//   * Cho `CHO_MS` truoc khi bam de nguoi choi kip nhin phan thuong.
//   * Hong o bat ky buoc nao cung chi dan den: khong lam gi ca, dem nguoc chay nhu cu.
//
// TAT DI: cong tac "Tu sang ai sau khi thang" trong hop thoai Cai dat (op-cai-dat.js), ghi
// localStorage khoa opTuDiAi = '0'. Mac dinh (khong co khoa, hoac '1') la BAT. Khoa duoc doc
// lai o moi nhip quet, khong doc mot lan luc nap, de bat/tat co tac dung ngay khong can tai
// lai trang.
(function () {
	'use strict';

	function daTat() {
		try { return window.localStorage && localStorage.getItem('opTuDiAi') === '0'; }
		catch (e) { return false; } // trinh duyet chan localStorage thi cu chay
	}

	var CHO_MS = 1200;      // de nguoi choi kip nhin phan thuong roi moi chuyen ai
	var NHIP = 400;         // nhip quet cay hien thi
	var HAN = 30 * 60000;   // quet toi da 30 phut sau khi vao game, roi thoi

	var batDau = Date.now();
	var DAU = '__opDaBam';

	function laManThang(o) {
		return !!(o && o.btnSure && o.labCD && o.btnStatis && o.labTip);
	}

	function duyet(node, sau) {
		if (!node || sau > 12) { return null; }
		if (laManThang(node)) { return node; }
		var con = node._childs || node._children;
		if (!con || !con.length) { return null; }
		for (var i = 0; i < con.length; i++) {
			var r = duyet(con[i], sau + 1);
			if (r) { return r; }
		}
		return null;
	}

	function bam(man) {
		try {
			var nut = man.btnSure;
			// `visible` false nghia la cua so dang an -> chua den luc.
			if (!nut || nut.visible === false || man.visible === false) { return; }
			man[DAU] = true;
			setTimeout(function () {
				try {
					if (!man.btnSure || man.destroyed) { return; }
					man.btnSure.event(Laya.Event.CLICK);
					console.log('[op-tu-di-ai] da bam "Xac dinh" de sang ai tiep theo');
				} catch (e) {
					console.warn('[op-tu-di-ai] bam khong duoc:', e);
				}
			}, CHO_MS);
		} catch (e) { /* khong lam hong luong choi */ }
	}

	var hen = setInterval(function () {
		if (Date.now() - batDau > HAN) { clearInterval(hen); return; }
		if (daTat()) { return; }
		try {
			if (typeof Laya === 'undefined' || !Laya.stage) { return; }
			var man = duyet(Laya.stage, 0);
			if (man && !man[DAU]) { bam(man); }
		} catch (e) { /* quet hong thi bo qua nhip nay */ }
	}, NHIP);
})();
