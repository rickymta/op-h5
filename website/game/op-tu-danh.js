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
// - Trang thai bat/tat nho trong localStorage; nut DOM co dinh duoi nut "Trang chinh".
(function () {
	'use strict';

	var KHOA = 'opTuDanh';
	var TRE_MS = 1800;
	var bat = false;
	try { bat = localStorage.getItem(KHOA) === '1'; } catch (e) { /* private mode */ }

	var nut = null;
	function ve() {
		if (nut) { return; }
		var css = document.createElement('style');
		css.textContent =
			'#opTuDanh{position:fixed;z-index:99999998;left:calc(8px + env(safe-area-inset-left,0px));' +
			'top:calc(46px + env(safe-area-inset-top,0px));padding:7px 12px;border-radius:999px;' +
			'background:rgba(6,18,28,.55);color:#DCE7EF;font:600 13px/1 ui-sans-serif,system-ui,sans-serif;' +
			'border:1px solid rgba(255,255,255,.16);opacity:.92;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
			'box-shadow:0 1px 6px rgba(0,0,0,.45);transition:opacity .15s,transform .1s}' +
			'#opTuDanh:active{transform:scale(.96)}' +
			'#opTuDanh.bat{background:rgba(196,92,20,.85);border-color:rgba(255,200,120,.6);color:#fff}';
		document.head.appendChild(css);
		nut = document.createElement('button');
		nut.id = 'opTuDanh';
		nut.type = 'button';
		nut.title = 'Thắng ải xong tự bấm "Khiêu chiến tầng tiếp"';
		nut.addEventListener('click', function () {
			bat = !bat;
			try { localStorage.setItem(KHOA, bat ? '1' : '0'); } catch (e) { /* bo qua */ }
			capNhat();
		});
		document.body.appendChild(nut);
		capNhat();
	}
	function capNhat() {
		if (!nut) { return; }
		nut.textContent = bat ? '↻ Tự đánh: BẬT' : '↻ Tự đánh: TẮT';
		nut.className = bat ? 'bat' : '';
	}

	// Goi tu bundle ngay khi man thang tran mo. Luc nay nhan nut CHUA duoc dat (show() dat
	// sau openUI), nen moi thu doc o thoi diem bam, sau TRE_MS.
	window.opKetQuaTran = function (inst, nhanTiep) {
		if (!bat || !inst) { return; }
		setTimeout(function () {
			try {
				if (!bat) { return; }
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

	if (document.body) { ve(); } else { document.addEventListener('DOMContentLoaded', ve); }
})();
