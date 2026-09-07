// Nut "Cai dat" tron noi tren game + hop thoai cai dat. Thay cho nut "Trang chinh" cu o goc
// trai-tren cua play.php (nut do chi lam mot viec: roi game; nay la mot muc trong hop thoai).
//
// NUT
// ---
// - Duong kinh 38px (~130% chieu cao nut "Trang chinh" cu: 7+13+7 padding/chu + 2 vien = 29px),
//   icon la ban sao cua assets/images/icon_caidat.svg (doi stroke sang currentColor de to mau).
// - Keo tha duoc, nhung tha ra la tu hut ve mep TRAI hoac PHAI gan nhat (kieu AssistiveTouch)
//   de khong nam giua man choi. Vi tri nho trong localStorage theo TY LE chieu cao, nen xoay
//   may hay doi cua so van dung; safe-area (tai tho iPhone) do bang mot phan tu tham do.
// - Bam (khong keo qua NGUONG px) thi mo hop thoai. Khong co PointerEvent (WebView rat cu)
//   thi chi con bam, khong keo.
//
// HOP THOAI
// ---------
// - Am thanh dieu khien o tang ENGINE (Laya.SoundManager.musicMuted / soundMuted + volume),
//   doc lap voi bang cai dat trong game. Chi ap dat khi nguoi choi DA chinh o day (co khoa
//   opAmThanh) — chua chinh thi de nguyen cua game, va slider hien gia tri engine dang dung.
//   Mot nhip 1,5 giay ap lai neu game tu doi, de "tat" o day la tat han.
// - "Tu danh ai tiep" / "Tu sang ai" chi ghi localStorage (opTuDanh / opTuDiAi); op-tu-danh.js
//   va op-tu-di-ai.js doc lai khoa o MOI lan quyet dinh nen bat/tat co tac dung ngay.
// - Trang chu: nap Xu (openNapTien cua play.php, mo iframe /cua-hang trong game), tai khoan
//   va cac lien ket lay tu /api/game/meta (Adapter, cung origin), tai lai game, roi game
//   (opRoiGame cua play.php hoi lai truoc).
// - Tin tuc: /api/game/news (Adapter). Thong bao game: /meta/announce/one (meta server, tra
//   EcResult {errorcode, data:{title, content, title2, content2, title3, content3}}).
//   Hong o dau thi an muc do, khong bao loi — day la lop DOM ben tren canvas, khong duoc
//   lam hong game. Moi chuoi tu mang ve deu ghi bang textContent, khong innerHTML.
(function () {
	'use strict';

	var KICH = 38;       // duong kinh nut
	var MEP = 8;         // cach mep cua so
	var NGUONG = 6;      // di qua bao nhieu px thi la keo, khong phai bam
	var K_VITRI = 'opCaiDatViTri';
	var K_AM = 'opAmThanh';
	var K_TUDANH = 'opTuDanh';
	var K_TUDIAI = 'opTuDiAi';
	var GAME_ID = (window.ydwxConfig && window.ydwxConfig.gameId) || 10091;

	// Ban sao assets/images/icon_caidat.svg, stroke doi sang currentColor.
	var SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
		'<path d="M20.8 12C20.8 11.116 20.084 10.4 19.2 10.4H18.1904C18.0392 9.81435 17.8088 9.26235 17.5088 8.75355L18.2224 8.03995C18.8472 7.41515 18.8472 6.40235 18.2224 5.77755C17.5976 5.15275 16.5848 5.15275 15.96 5.77755L15.2464 6.49115C14.7376 6.19115 14.1856 5.96075 13.6 5.80955V4.79995C13.6 3.91675 12.884 3.19995 12 3.19995C11.116 3.19995 10.4 3.91595 10.4 4.79995V5.80955C9.81435 5.96075 9.26235 6.19115 8.75355 6.49115L8.03995 5.77755C7.41515 5.15275 6.40235 5.15275 5.77755 5.77755C5.15275 6.40235 5.15275 7.41515 5.77755 8.03995L6.49115 8.75355C6.19115 9.26235 5.96075 9.81435 5.80955 10.4H4.79995C3.91675 10.4 3.19995 11.116 3.19995 12C3.19995 12.884 3.91595 13.6 4.79995 13.6H5.80955C5.96075 14.1856 6.19115 14.7376 6.49115 15.2464L5.77755 15.96C5.15275 16.5848 5.15275 17.5976 5.77755 18.2224C6.40235 18.8472 7.41515 18.8472 8.03995 18.2224L8.75355 17.5088C9.26155 17.8088 9.81435 18.0392 10.4 18.1904V19.2C10.4 20.0832 11.116 20.8 12 20.8C12.884 20.8 13.6 20.084 13.6 19.2V18.1904C14.1856 18.0392 14.7376 17.8088 15.2464 17.5088L15.96 18.2224C16.5848 18.8472 17.5976 18.8472 18.2224 18.2224C18.8472 17.5976 18.8472 16.5848 18.2224 15.96L17.5088 15.2464C17.8088 14.7384 18.0392 14.1856 18.1904 13.6H19.2C20.0832 13.6 20.8 12.884 20.8 12Z" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>' +
		'<path d="M12 14.4C13.3255 14.4 14.4 13.3255 14.4 12C14.4 10.6745 13.3255 9.59998 12 9.59998C10.6745 9.59998 9.59998 10.6745 9.59998 12C9.59998 13.3255 10.6745 14.4 12 14.4Z" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/></svg>';

	var CSS =
		'#opCaiDat{position:fixed;z-index:99999998;left:8px;top:8px;width:' + KICH + 'px;height:' + KICH + 'px;padding:0;margin:0;' +
		'border-radius:50%;background:rgba(6,18,28,.72);color:#DCE7EF;border:1px solid rgba(255,255,255,.22);' +
		'box-shadow:0 1px 6px rgba(0,0,0,.45);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;' +
		'-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;opacity:.92;' +
		'transition:opacity .15s,transform .1s}' +
		'#opCaiDat svg{width:22px;height:22px;display:block;pointer-events:none}' +
		'#opCaiDat.muot{transition:left .22s cubic-bezier(.2,.8,.2,1),top .22s cubic-bezier(.2,.8,.2,1),opacity .15s}' +
		'#opCaiDat.keo{transition:none;cursor:grabbing;opacity:1;transform:scale(1.08)}' +
		'#opCaiDat:hover,#opCaiDat:focus{opacity:1;outline:none}' +
		'#opCaiDatHop{display:none;position:fixed;left:0;top:0;right:0;bottom:0;z-index:100000000;color:#E4EDF3;' +
		'font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
		'#opCaiDatHop.mo{display:block}' +
		'#opCaiDatHop *{font-family:inherit;box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
		'.opcd-nen{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.55)}' +
		'.opcd-khung{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:calc(100% - 24px);max-width:440px;' +
		'max-height:calc(100% - 24px);display:flex;flex-direction:column;background:#122636;border:1px solid #22394D;' +
		'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden}' +
		'.opcd-dau{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 14px;border-bottom:1px solid #22394D}' +
		'.opcd-tieude{font-size:17px;font-weight:700;margin:0}' +
		'.opcd-tk{flex:1;min-width:0;font-size:12px;color:#9CB0C0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}' +
		'.opcd-dong{flex:none;width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#E4EDF3;' +
		'font-size:22px;line-height:1;cursor:pointer;padding:0}' +
		'.opcd-tab{display:flex;border-bottom:1px solid #22394D}' +
		'.opcd-tab button{flex:1;padding:9px;border:0;background:none;color:#9CB0C0;font-weight:600;font-size:14px;cursor:pointer;' +
		'border-bottom:2px solid transparent}' +
		'.opcd-tab button.chon{color:#fff;border-bottom-color:#EE4623}' +
		'.opcd-than{overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:4px 14px 14px}' +
		'.opcd-than h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#9CB0C0;margin:14px 0 4px;' +
		'display:flex;justify-content:space-between;align-items:center;font-weight:700}' +
		'.opcd-than h3 a{font-size:12px;text-transform:none;letter-spacing:0;color:#F2A57B;text-decoration:none;font-weight:600}' +
		'.opcd-hang{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(34,57,77,.6)}' +
		'.opcd-hang:last-child{border-bottom:0}' +
		'.opcd-nhan{flex:1;min-width:0}' +
		'.opcd-nhan small{display:block;color:#9CB0C0;font-size:12px;line-height:1.35}' +
		'.opcd-cong{position:relative;flex:none;width:44px;height:26px;border-radius:13px;border:0;background:#33485A;' +
		'cursor:pointer;padding:0;transition:background .15s}' +
		'.opcd-cong span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s}' +
		'.opcd-cong[aria-checked=true]{background:#EE4623}' +
		'.opcd-cong[aria-checked=true] span{transform:translateX(18px)}' +
		'.opcd-thanh{flex:none;width:120px;margin:0;accent-color:#EE4623}' +
		'.opcd-luoi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}' +
		'.opcd-nutlon{display:block;padding:10px 12px;border-radius:8px;border:1px solid #22394D;background:#0C1D2B;color:#E4EDF3;' +
		'text-decoration:none;font-weight:600;text-align:center;cursor:pointer;font-size:14px;line-height:1.3}' +
		'.opcd-nutlon.chinh{background:#EE4623;border-color:#EE4623;color:#fff}' +
		'.opcd-nutlon.nguy{color:#F2A57B}' +
		'.opcd-tin{list-style:none;margin:0;padding:0}' +
		'.opcd-tin li{border-bottom:1px solid rgba(34,57,77,.6)}' +
		'.opcd-tin li:last-child{border-bottom:0}' +
		'.opcd-tin a{display:block;padding:8px 0;color:#E4EDF3;text-decoration:none}' +
		'.opcd-tin .td{font-weight:600;line-height:1.35}' +
		'.opcd-tin .phu{font-size:12px;color:#9CB0C0;margin-top:2px}' +
		'.opcd-loai{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(238,70,35,.18);' +
		'color:#F2A57B;margin-right:6px;vertical-align:1px;font-weight:600}' +
		'.opcd-thongbao{background:#0C1D2B;border:1px solid #22394D;border-radius:8px;padding:10px 12px;white-space:pre-wrap;' +
		'word-break:break-word;font-size:13px;color:#C9D6E0;max-height:200px;overflow:auto}' +
		'.opcd-thongbao b{display:block;color:#fff;margin-bottom:3px}' +
		'.opcd-thongbao b+b{margin-top:10px}' +
		'.opcd-mo{color:#9CB0C0;font-size:13px;padding:6px 0}';

	// ---------- tien ich ----------
	function doc(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
	function ghi(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
	function docJSON(k) {
		try { var v = JSON.parse(doc(k) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; }
	}
	function kep(v, a, b) { return Math.max(a, Math.min(b, v)); }
	function E(tag, cls, text) {
		var e = document.createElement(tag);
		if (cls) { e.className = cls; }
		if (text != null) { e.textContent = text; }
		return e;
	}
	function layJSON(url) {
		if (!window.fetch) { return Promise.resolve(null); }
		return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
			.then(function (r) { return r.ok ? r.json() : null; })
			.catch(function () { return null; });
	}
	function baoLau(iso) {
		var t = Date.parse(iso || '');
		if (isNaN(t)) { return ''; }
		var s = (Date.now() - t) / 1000;
		if (s < 60) { return 'vừa xong'; }
		if (s < 3600) { return Math.floor(s / 60) + ' phút trước'; }
		if (s < 86400) { return Math.floor(s / 3600) + ' giờ trước'; }
		if (s < 7 * 86400) { return Math.floor(s / 86400) + ' ngày trước'; }
		var d = new Date(t);
		return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
	}
	// Noi dung thong bao co the mang the kieu LayaAir (<br/>, <font>): giu xuong dong, bo the.
	function boThe(s) {
		return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
	}

	// ---------- am thanh ----------
	function soHopLe(v) { v = Number(v); return isFinite(v) ? kep(Math.round(v), 0, 100) : 100; }
	var am = docJSON(K_AM);
	var daChinhAm = !!am;
	am = am || {};
	am = { nhac: am.nhac !== false, hieuUng: am.hieuUng !== false, nhacAm: soHopLe(am.nhacAm), hieuUngAm: soHopLe(am.hieuUngAm) };

	function SM() { return (window.Laya && window.Laya.SoundManager) || null; }
	function apDungAm() {
		var sm = SM();
		if (!sm || !daChinhAm) { return; }
		try {
			if (sm.musicMuted !== !am.nhac) { sm.musicMuted = !am.nhac; }
			if (sm.soundMuted !== !am.hieuUng) { sm.soundMuted = !am.hieuUng; }
			var vn = am.nhacAm / 100, vh = am.hieuUngAm / 100;
			if (Math.abs(Number(sm.musicVolume) - vn) > 0.005) {
				if (typeof sm.setMusicVolume === 'function') { sm.setMusicVolume(vn); } else { sm.musicVolume = vn; }
			}
			if (Math.abs(Number(sm.soundVolume) - vh) > 0.005) {
				if (typeof sm.setSoundVolume === 'function') { sm.setSoundVolume(vh); } else { sm.soundVolume = vh; }
			}
		} catch (e) { /* engine chua san sang */ }
	}
	// Chua chinh gi o day thi hien dung cai engine dang dung, khong hien mac dinh 100% sai.
	function docAmTuEngine() {
		var sm = SM();
		if (!sm || daChinhAm) { return; }
		try {
			am.nhac = !sm.musicMuted;
			am.hieuUng = !sm.soundMuted;
			if (isFinite(Number(sm.musicVolume))) { am.nhacAm = soHopLe(Number(sm.musicVolume) * 100); }
			if (isFinite(Number(sm.soundVolume))) { am.hieuUngAm = soHopLe(Number(sm.soundVolume) * 100); }
		} catch (e) { /* bo qua */ }
	}
	function luuAm() { daChinhAm = true; ghi(K_AM, JSON.stringify(am)); apDungAm(); }
	setInterval(apDungAm, 1500);

	// ---------- co choi tu dong (op-tu-danh.js / op-tu-di-ai.js doc lai moi lan) ----------
	function laBat(k, macDinh) { var v = doc(k); return v === null ? macDinh : v === '1'; }

	// ---------- nut tron ----------
	var nut, viTri, doInset, boQuaClick = false;

	function taoDoInset() {
		var p = document.createElement('div');
		p.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none;' +
			'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
		document.body.appendChild(p);
		return function () {
			var s = getComputedStyle(p);
			return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0,
				b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
		};
	}
	function khungY() {
		var i = doInset();
		var yMin = MEP + i.t;
		var yMax = Math.max(yMin, window.innerHeight - KICH - MEP - i.b);
		return { min: yMin, max: yMax, i: i };
	}
	function datViTri(vt, muot) {
		var k = khungY();
		var x = vt.ben === 'phai' ? window.innerWidth - KICH - MEP - k.i.r : MEP + k.i.l;
		var y = kep(Math.round(k.min + (Number(vt.ty) || 0) * (k.max - k.min)), k.min, k.max);
		nut.classList.toggle('muot', !!muot);
		nut.style.left = x + 'px';
		nut.style.top = y + 'px';
	}
	function taoNut() {
		var css = document.createElement('style');
		css.textContent = CSS;
		document.head.appendChild(css);
		doInset = taoDoInset();

		nut = E('button', null);
		nut.id = 'opCaiDat';
		nut.type = 'button';
		nut.title = 'Cài đặt';
		nut.setAttribute('aria-label', 'Cài đặt');
		nut.setAttribute('aria-haspopup', 'dialog');
		nut.innerHTML = SVG;
		document.body.appendChild(nut);

		viTri = docJSON(K_VITRI) || { ben: 'trai', ty: 0 };
		if (viTri.ben !== 'phai') { viTri.ben = 'trai'; }
		viTri.ty = kep(Number(viTri.ty) || 0, 0, 1);
		datViTri(viTri, false);
		window.addEventListener('resize', function () { datViTri(viTri, false); });
		window.addEventListener('orientationchange', function () { setTimeout(function () { datViTri(viTri, false); }, 150); });

		// Ban phim (Enter/Space) chi phat click; bam bang tay thi pointerup da mo roi.
		nut.addEventListener('click', function () {
			if (boQuaClick) { boQuaClick = false; return; }
			mo();
		});
		if (!window.PointerEvent) { return; }

		var goc = null, dangKeo = false;
		nut.addEventListener('pointerdown', function (e) {
			if (e.button !== undefined && e.button !== 0) { return; }
			var r = nut.getBoundingClientRect();
			goc = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, id: e.pointerId };
			dangKeo = false;
			try { nut.setPointerCapture(e.pointerId); } catch (err) { /* bo qua */ }
		});
		nut.addEventListener('pointermove', function (e) {
			if (!goc || e.pointerId !== goc.id) { return; }
			var dx = e.clientX - goc.x, dy = e.clientY - goc.y;
			if (!dangKeo && Math.abs(dx) < NGUONG && Math.abs(dy) < NGUONG) { return; }
			dangKeo = true;
			nut.classList.remove('muot');
			nut.classList.add('keo');
			nut.style.left = kep(goc.l + dx, 0, window.innerWidth - KICH) + 'px';
			nut.style.top = kep(goc.t + dy, 0, window.innerHeight - KICH) + 'px';
			e.preventDefault();
		});
		function tha(e) {
			if (!goc || e.pointerId !== goc.id) { return; }
			var keo = dangKeo, huy = e.type === 'pointercancel';
			goc = null;
			dangKeo = false;
			nut.classList.remove('keo');
			if (!keo) {
				// Bam (khong keo). pointercancel — trinh duyet lay lai con tro — thi khong mo.
				if (huy) { return; }
				boQuaClick = true;      // click se den ngay sau, da xu ly o day
				setTimeout(function () { boQuaClick = false; }, 300);
				mo();
				return;
			}
			var r = nut.getBoundingClientRect(), k = khungY();
			viTri = {
				ben: (r.left + KICH / 2) < window.innerWidth / 2 ? 'trai' : 'phai',
				ty: k.max > k.min ? kep((r.top - k.min) / (k.max - k.min), 0, 1) : 0
			};
			ghi(K_VITRI, JSON.stringify(viTri));
			datViTri(viTri, true);
			boQuaClick = true;          // click sau mot cu keo khong duoc mo hop thoai
			setTimeout(function () { boQuaClick = false; }, 300);
		}
		nut.addEventListener('pointerup', tha);
		nut.addEventListener('pointercancel', tha);
	}

	// ---------- hop thoai ----------
	var hop, than, tk, tabNut = {}, tabPhan = {}, phanCaiDat, phanTin;
	var cong = {}, thanh = {};
	var metaCache = null, lanTinCuoi = 0;

	function hangCong(nhan, phu, batDau, onDoi) {
		var row = E('div', 'opcd-hang');
		var lb = E('div', 'opcd-nhan');
		lb.appendChild(E('span', null, nhan));
		if (phu) { lb.appendChild(E('small', null, phu)); }
		row.appendChild(lb);
		var sw = E('button', 'opcd-cong');
		sw.type = 'button';
		sw.setAttribute('role', 'switch');
		sw.setAttribute('aria-checked', batDau ? 'true' : 'false');
		sw.setAttribute('aria-label', nhan);
		sw.appendChild(E('span'));
		sw.addEventListener('click', function () {
			var b = sw.getAttribute('aria-checked') !== 'true';
			sw.setAttribute('aria-checked', b ? 'true' : 'false');
			onDoi(b);
		});
		row.appendChild(sw);
		row._cong = sw;
		return row;
	}
	function datCong(row, b) { row._cong.setAttribute('aria-checked', b ? 'true' : 'false'); }

	function hangThanh(nhan, giaTri, onDoi) {
		var row = E('div', 'opcd-hang');
		var lb = E('div', 'opcd-nhan');
		var t = E('span', null, nhan + ' · ' + giaTri + '%');
		lb.appendChild(t);
		row.appendChild(lb);
		var inp = E('input', 'opcd-thanh');
		inp.type = 'range';
		inp.min = '0';
		inp.max = '100';
		inp.value = String(giaTri);
		inp.setAttribute('aria-label', nhan);
		inp.addEventListener('input', function () {
			t.textContent = nhan + ' · ' + inp.value + '%';
			onDoi(Number(inp.value));
		});
		row.appendChild(inp);
		row._thanh = inp;
		row._nhan = nhan;
		row._chu = t;
		return row;
	}
	function datThanh(row, v) { row._thanh.value = String(v); row._chu.textContent = row._nhan + ' · ' + v + '%'; }

	function nutLon(chu, cls, onBam) {
		var b = E('button', 'opcd-nutlon' + (cls ? ' ' + cls : ''), chu);
		b.type = 'button';
		b.addEventListener('click', onBam);
		return b;
	}
	function lienKet(chu, href) {
		var a = E('a', 'opcd-nutlon', chu);
		a.href = href;
		a.target = '_blank';
		a.rel = 'noopener';
		return a;
	}

	function taoHop() {
		hop = E('div');
		hop.id = 'opCaiDatHop';
		var nen = E('div', 'opcd-nen');
		nen.addEventListener('click', dong);
		hop.appendChild(nen);

		var khung = E('div', 'opcd-khung');
		khung.setAttribute('role', 'dialog');
		khung.setAttribute('aria-modal', 'true');
		khung.setAttribute('aria-labelledby', 'opcdTieuDe');
		hop.appendChild(khung);

		var dau = E('div', 'opcd-dau');
		var h = E('h2', 'opcd-tieude', 'Cài đặt');
		h.id = 'opcdTieuDe';
		dau.appendChild(h);
		tk = E('div', 'opcd-tk');
		dau.appendChild(tk);
		var x = E('button', 'opcd-dong', '×');
		x.type = 'button';
		x.setAttribute('aria-label', 'Đóng');
		x.addEventListener('click', dong);
		dau.appendChild(x);
		khung.appendChild(dau);

		var tab = E('div', 'opcd-tab');
		[['caidat', 'Cài đặt'], ['tintuc', 'Tin tức & thông báo']].forEach(function (t) {
			var b = E('button', null, t[1]);
			b.type = 'button';
			b.addEventListener('click', function () { chonTab(t[0]); });
			tab.appendChild(b);
			tabNut[t[0]] = b;
		});
		khung.appendChild(tab);

		than = E('div', 'opcd-than');
		khung.appendChild(than);
		phanCaiDat = E('div');
		phanTin = E('div');
		tabPhan.caidat = phanCaiDat;
		tabPhan.tintuc = phanTin;
		than.appendChild(phanCaiDat);
		than.appendChild(phanTin);

		veCaiDat(phanCaiDat);
		veTin(phanTin);
		chonTab('caidat');
		document.body.appendChild(hop);

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && hop.classList.contains('mo')) { dong(); }
		});
	}

	function chonTab(ten) {
		Object.keys(tabNut).forEach(function (k) {
			tabNut[k].classList.toggle('chon', k === ten);
			tabPhan[k].style.display = k === ten ? '' : 'none';
		});
		than.scrollTop = 0;
	}

	function veCaiDat(p) {
		p.appendChild(E('h3', null, 'Âm thanh'));
		cong.nhac = hangCong('Nhạc nền', null, am.nhac, function (b) { am.nhac = b; luuAm(); });
		p.appendChild(cong.nhac);
		thanh.nhac = hangThanh('Âm lượng nhạc', am.nhacAm, function (v) { am.nhacAm = v; luuAm(); });
		p.appendChild(thanh.nhac);
		cong.hieuUng = hangCong('Hiệu ứng âm thanh', 'Tiếng kỹ năng, bấm nút, lời thoại', am.hieuUng, function (b) { am.hieuUng = b; luuAm(); });
		p.appendChild(cong.hieuUng);
		thanh.hieuUng = hangThanh('Âm lượng hiệu ứng', am.hieuUngAm, function (v) { am.hieuUngAm = v; luuAm(); });
		p.appendChild(thanh.hieuUng);

		p.appendChild(E('h3', null, 'Chơi tự động'));
		cong.tuDanh = hangCong('Tự đánh ải tiếp', 'Thắng ải xong tự bấm "Khiêu chiến tầng tiếp" cho tới khi thua hoặc hết lượt',
			laBat(K_TUDANH, false), function (b) { ghi(K_TUDANH, b ? '1' : '0'); });
		p.appendChild(cong.tuDanh);
		cong.tuDiAi = hangCong('Tự sang ải sau khi thắng', 'Bấm "Xác định" ở màn thắng trận thay vì chờ đếm ngược',
			laBat(K_TUDIAI, true), function (b) { ghi(K_TUDIAI, b ? '1' : '0'); });
		p.appendChild(cong.tuDiAi);

		p.appendChild(E('h3', null, 'Trang chủ & tài khoản'));
		var luoi = E('div', 'opcd-luoi');
		luoi.appendChild(nutLon('Nạp Xu · Cửa hàng', 'chinh', function () {
			dong();
			if (typeof window.openNapTien === 'function') { window.openNapTien(); } else { window.open('/cua-hang', '_blank', 'noopener'); }
		}));
		var lkTaiKhoan = lienKet('Tài khoản', '#');
		var lkTrangChu = lienKet('Trang chủ game', '#');
		var lkHoTro = lienKet('Hỗ trợ', '#');
		var lkFanpage = lienKet('Fanpage', '#');
		var lkNhom = lienKet('Nhóm cộng đồng', '#');
		[lkTaiKhoan, lkTrangChu, lkHoTro, lkFanpage, lkNhom].forEach(function (a) { a.style.display = 'none'; luoi.appendChild(a); });
		luoi.appendChild(nutLon('Tải lại game', '', function () {
			if (confirm('Tải lại game? Trận đang đánh sẽ mất.')) { location.reload(); }
		}));
		luoi.appendChild(nutLon('Về trang chính', 'nguy', function () {
			if (typeof window.opRoiGame !== 'function' || window.opRoiGame()) { location.href = '/'; }
		}));
		p.appendChild(luoi);

		// Lien ket lay tu Adapter; thieu cai nao thi giau cai do.
		layMeta().then(function (m) {
			if (!m) { return; }
			var l = m.links || {};
			function hien(a, href) { if (href) { a.href = href; a.style.display = ''; } }
			hien(lkTaiKhoan, m.id_base ? m.id_base + '/tai-khoan' : '');
			hien(lkTrangChu, m.site_url || '');
			hien(lkHoTro, l.support_url);
			hien(lkFanpage, l.fanpage_url);
			hien(lkNhom, l.group_url);
		});
	}
	function layMeta() {
		if (metaCache) { return Promise.resolve(metaCache); }
		return layJSON('/api/game/meta').then(function (m) { if (m && typeof m === 'object') { metaCache = m; } return metaCache; });
	}

	var oThongBao, oTin, hThongBao;
	function veTin(p) {
		hThongBao = E('h3', null, 'Thông báo');
		p.appendChild(hThongBao);
		oThongBao = E('div', 'opcd-thongbao', 'Đang tải…');
		p.appendChild(oThongBao);

		var h = E('h3', null, 'Tin tức');
		var a = E('a', null, 'Tất cả tin →');
		a.href = '/tin-tuc';
		a.target = '_blank';
		a.rel = 'noopener';
		h.appendChild(a);
		p.appendChild(h);
		oTin = E('ul', 'opcd-tin');
		var li = E('li');
		li.appendChild(E('div', 'opcd-mo', 'Đang tải…'));
		oTin.appendChild(li);
		p.appendChild(oTin);
	}
	function taiTin() {
		if (Date.now() - lanTinCuoi < 60000) { return; }
		lanTinCuoi = Date.now();

		layJSON('/meta/announce/one?gameId=' + encodeURIComponent(GAME_ID)).then(function (j) {
			var d = j && (j.data && typeof j.data === 'object' ? j.data : j);
			if (!d || (!d.title && !d.content)) { hThongBao.style.display = 'none'; oThongBao.style.display = 'none'; return; }
			hThongBao.style.display = '';
			oThongBao.style.display = '';
			oThongBao.textContent = '';
			[['title', 'content'], ['title2', 'content2'], ['title3', 'content3']].forEach(function (c) {
				var t = boThe(d[c[0]]), n = boThe(d[c[1]]);
				if (!t && !n) { return; }
				if (t) { oThongBao.appendChild(E('b', null, t)); }
				if (n) { oThongBao.appendChild(document.createTextNode(n)); }
			});
		});

		layJSON('/api/game/news?limit=8').then(function (j) {
			var ds = j && Array.isArray(j.news) ? j.news : null;
			oTin.textContent = '';
			if (!ds) {
				var l0 = E('li'); l0.appendChild(E('div', 'opcd-mo', 'Không tải được tin tức.')); oTin.appendChild(l0); return;
			}
			if (!ds.length) {
				var l1 = E('li'); l1.appendChild(E('div', 'opcd-mo', 'Chưa có tin nào.')); oTin.appendChild(l1); return;
			}
			var LOAI = { event: 'Sự kiện', notice: 'Thông báo' };
			ds.forEach(function (n) {
				var li = E('li');
				var a = E('a');
				a.href = '/tin-tuc/' + encodeURIComponent(n.slug || n.id);
				a.target = '_blank';
				a.rel = 'noopener';
				var td = E('div', 'td');
				if (LOAI[n.kind]) { td.appendChild(E('span', 'opcd-loai', LOAI[n.kind])); }
				td.appendChild(document.createTextNode(n.title || ''));
				a.appendChild(td);
				var phu = [];
				if (n.summary) { phu.push(String(n.summary)); }
				var khi = baoLau(n.published_at);
				if (khi) { phu.push(khi); }
				if (phu.length) { a.appendChild(E('div', 'phu', phu.join(' · '))); }
				li.appendChild(a);
				oTin.appendChild(li);
			});
		});
	}

	function capNhatTaiKhoan() {
		var a = window.__opAuto || {}, phan = [];
		if (a.username) { phan.push(a.username); }
		if (a.srvCode) { phan.push('Máy chủ ' + a.srvCode); }
		tk.textContent = phan.join(' · ');
		layJSON('/api/game/me').then(function (j) {
			var sd = j && j.logged_in ? Number(j.balance) : NaN;
			if (isFinite(sd)) { tk.textContent = phan.concat([sd.toLocaleString('vi-VN') + ' Xu']).join(' · '); }
		});
	}

	function mo() {
		if (!hop) { taoHop(); }
		docAmTuEngine();
		datCong(cong.nhac, am.nhac);
		datCong(cong.hieuUng, am.hieuUng);
		datThanh(thanh.nhac, am.nhacAm);
		datThanh(thanh.hieuUng, am.hieuUngAm);
		datCong(cong.tuDanh, laBat(K_TUDANH, false));
		datCong(cong.tuDiAi, laBat(K_TUDIAI, true));
		capNhatTaiKhoan();
		taiTin();
		hop.classList.add('mo');
	}
	function dong() { if (hop) { hop.classList.remove('mo'); } }

	window.opCaiDat = { mo: mo, dong: dong };

	if (document.body) { taoNut(); } else { document.addEventListener('DOMContentLoaded', taoNut); }
})();
