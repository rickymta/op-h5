#!/usr/bin/env python3
"""Sinh website/game/op-console-en.js tu tools/cn-en.json.

    python3 tools/gen-console-en.py

Nhung tu dien THANG vao file JS thay vi de client tai cn-en.json luc chay: them mot
luot tai mang o trang game chi de dich console la khong dang, va neu tai that bai thi
console lai im lang tro ve tieng Trung.

Chay lai moi khi sua tools/cn-en.json.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GOC = os.path.join(HERE, 'cn-en.json')
RA = os.path.join(HERE, '..', 'website', 'game', 'op-console-en.js')

DAU = '''// Dich console cua client sang tieng Anh. SINH TU DONG — dung sua tay.
//   nguon    : tools/cn-en.json
//   sinh lai : python3 tools/gen-console-en.py
//
// Client (LayaAir da obfuscate) ghi console bang tieng Trung, vi du:
//   表[文本库]条目超时警告
//   Biểu phân tích loại thiếu thốn:上古之战怪物
// Cac chuoi do nam trong BANG CHUOI da obfuscate cua bundle. Nhieu bo obfuscate xoay
// vong mang nay luc khoi dong kem mot phep kiem tra tren chinh noi dung mang, nen sua
// thang vao bundle co the lam hong ca client theo kieu rat kho lan. Boc console thi
// khong dung toi bundle va go ra cung de.
//
// Chi doi thu HIEN RA MAN HINH. Khong doi du lieu, khong doi lenh gui len server.
(function () {
	'use strict';
	var TU_DIEN = '''

CUOI = ''';

	// Thay CUM DAI TRUOC: '国战5分钟奖励结算begin' phai duoc thay tron ven, neu de
	// '国战' thay truoc thi phan con lai thanh cau nua Trung nua Anh khong doc noi.
	TU_DIEN.sort(function (a, b) { return b[0].length - a[0].length; });

	var CO_TRUNG = /[\\u4e00-\\u9fff]/;

	function dich(s) {
		if (typeof s !== 'string' || !CO_TRUNG.test(s)) { return s; }
		for (var i = 0; i < TU_DIEN.length; i++) {
			var tr = TU_DIEN[i][0], en = TU_DIEN[i][1];
			if (s.indexOf(tr) < 0) { continue; }
			// Tu them dau cach khi hai ben la chu/so: tieng Trung khong co dau cach nen
			// ghep thang se ra "querytook10ms" thay vi "query took 10ms".
			var ra = '', j = 0, k;
			while ((k = s.indexOf(tr, j)) >= 0) {
				var truoc = k > 0 ? s.charAt(k - 1) : '';
				var sau = s.charAt(k + tr.length);
				var d = (/[0-9A-Za-z]/.test(truoc) && /^[0-9A-Za-z]/.test(en)) ? ' ' : '';
				var c = (/[0-9A-Za-z]/.test(sau) && /[0-9A-Za-z]$/.test(en)) ? ' ' : '';
				ra += s.slice(j, k) + d + en + c;
				j = k + tr.length;
			}
			s = ra + s.slice(j);
		}
		return s;
	}

	['log', 'info', 'warn', 'error', 'debug'].forEach(function (ten) {
		var goc = console[ten];
		if (typeof goc !== 'function') { return; }
		console[ten] = function () {
			var args = new Array(arguments.length);
			for (var i = 0; i < arguments.length; i++) { args[i] = dich(arguments[i]); }
			return goc.apply(console, args);
		};
	});

	console.info('[op-console-en] console da duoc dich sang tieng Anh (' + TU_DIEN.length + ' muc)');
})();
'''

with open(GOC, encoding='utf-8') as f:
    cum = json.load(f)['cum']

cap = sorted(cum.items(), key=lambda kv: -len(kv[0]))
than = json.dumps([[k, v] for k, v in cap], ensure_ascii=False, indent=1)

with open(RA, 'w', encoding='utf-8') as f:
    f.write(DAU + than + CUOI)
print('  da sinh %s (%d muc)' % (os.path.relpath(RA, os.path.join(HERE, '..')), len(cap)))
