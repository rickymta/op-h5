// Tu danh ai tiep theo: thang mot ai xong thi tu bam "Khieu chien tang tiep" thay vi doi
// nguoi choi bam, cho toi khi thua, het luot, hay nguoi choi tat.
//
// Cach lam:
// - Bundle (tools/va-tu-danh-ai.py) chi them MOT dong o afterOpen() cua man thang tran:
//   goi window.opKetQuaTran(instance, [nhan "Khieu chien tang tiep", nhan thap Ma]). Moi
//   quyet dinh nam o day, sua khong phai va lai bundle.
// - Nut "Khieu chien tang tiep" trong game chi dat isReturn=true roi dong man; afterClose
//   goi callback cua pho ban voi isReturn -> game tu mo tran ke (cung duong voi bam tay).
//   Shim bam dung nut do qua onClick({target: btnReturn}) — khong goi thang vao mo-dun pho
//   ban, nen khong bo qua kiem tra the luc/luot danh cua game.
// - Chi bam khi nut dang mang nhan "ai tiep" (o tang cao nhat game doi nhan thanh "Tro ve";
//   pho ban ngay/vien chinh cung "Tro ve") va man ket qua van con mo (nguoi choi chua tu
//   bam gi). Cho 1,8 giay de nguoi choi kip thay thuong roi.
// - Bat/tat o hop thoai "Cai dat" (op-cai-dat.js), ghi localStorage khoa opTuDanh ('1' = bat).
//   Doc lai khoa o MOI lan quyet dinh — khong giu ban sao — de bat/tat co tac dung ngay.
//   (Truoc 2026-09-07 file nay tu ve mot nut DOM rieng duoi nut "Trang chinh".)
(function () {
	'use strict';

	var KHOA = 'opTuDanh';
	var TRE_MS = 1800;
	function bat() {
		try { return localStorage.getItem(KHOA) === '1'; } catch (e) { return false; } // private mode
	}

	// Goi tu bundle ngay khi man thang tran mo. Luc nay nhan nut CHUA duoc dat (show() dat
	// sau openUI), nen moi thu doc o thoi diem bam, sau TRE_MS.
	window.opKetQuaTran = function (inst, nhanTiep) {
		if (!bat() || !inst) { return; }
		setTimeout(function () {
			try {
				if (!bat()) { return; }
				var ui = inst._ui;
				if (!ui || !ui.btnReturn || !ui.btnReturn.visible) { return; }
				if (ui.displayedInStage === false) { return; } // nguoi choi da tu dong man
				var nhan = ui.btnReturn.label;
				if (!nhanTiep || nhanTiep.indexOf(nhan) < 0) { return; } // "Tro ve", khong phai ai tiep
				inst.onClick({ target: ui.btnReturn });
			} catch (e) {
				console.warn('[op-tu-danh] khong bam duoc ai tiep:', e);
			}
		}, TRE_MS);
	};
})();
