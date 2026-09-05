# Giao việc cho phiên trên máy Windows: lấy nốt tài nguyên client còn thiếu

Máy Windows có đủ cây `website/game` gốc từ server cũ. Máy Mac không có, nên phần dưới
đây phải làm ở đó.

## Đọc trước: `template/` KHÔNG thiếu — đừng chép nó

Một kết luận sai đã được ghi vào tài liệu và nay đã sửa. Nêu lại để không ai đi lại đường
cũ:

Client **không** tải `template/perLoadTpls.json` theo đường dẫn đó. Toàn bộ tài nguyên đi
qua bảng ánh xạ `website/game/libs/2af72-f100c-2af72.json` (JSON nén deflate), dạng
*tên logic → file băm trong `res/`*:

```
"template/perLoadTpls.json"  -> "res/3b337-4248f-7ce3e"
"template/dongtaitishi.txt"  -> "res/2d19b-aaed7-3bd8b"
"template/templates.bin"     -> "res/97cec-62c2f-5f56f"
```

Cả ba file băm **đã có** trong `res/`. Đã kiểm chứng bằng cách bỏ hẳn thư mục
`website/game/template/` rồi chạy lại: client vẫn vào tới màn hình chọn máy chủ, và trong
`performance.getEntriesByType('resource')` **không có một lời gọi nào** tới `/template/`.

Điều đó cũng đúng với `common/`, `atlas/`, `grid/`, `herocut/`, `Expedition/`,
`Shouling/` — chúng là **tên logic trong manifest**, không phải thư mục trên đĩa. Đừng đi
tìm chúng.

## KẾT QUẢ KIỂM TRA TRÊN MÁY WINDOWS (2026-09-05, tối)

Chạy đúng đoạn kiểm tra bên dưới trong `website/game`: **32 mục thiếu, giống hệt máy Mac**. Cả bản
`website/game` lẫn bản copy nguyên vẹn `www/wwwroot/game` của server cũ đều có đúng 10.584 file
`res/` và **không có** 22 file được liệt kê (dãy `4b84d-a0519-bp*` trên đĩa chỉ có 18 file, đúng các
số lẻ + bp001/002/032). Server cũ (`192.168.1.69`) lúc kiểm không kết nối được, nhưng bản copy là
đầy đủ nên gần như chắc bản gốc cũng thiếu: manifest trỏ tới file chưa từng tồn tại trong bản triển
khai, các mục đó vốn 404 từ trước. **Không có gì để chuyển, không phát hành lại `assets-v1`.**
Chỉ còn một việc: khi vào lại được mạng server cũ, xác nhận bằng
`ls /www/wwwroot/game/res/09f91-b9ea0-9918f` (mong đợi: không có).

`tools/dump-to-seed.py` đã phát `ROW_FORMAT=DYNAMIC`, seed đã sinh lại; `prepare-dumps.sh` sed dump
thật ngay trên server cũ (xem cuối tài liệu).

## Việc cần làm: 21 file trong `res/` và 1 file trong `sound/`

Đây là các mục **manifest có trỏ tới nhưng không tồn tại trên đĩa**. Chúng sẽ 404 lúc
chạy, ở đúng tính năng nào dùng tới — nên chưa gặp không có nghĩa là không có.

```
res/09f91-b9ea0-9918f
res/0e9cd-b4930-6369d
res/2e0fa-3d76c-a8b7a
res/4b84d-a0519-bp003
res/4b84d-a0519-bp004
res/4b84d-a0519-bp008
res/4b84d-a0519-bp010
res/4b84d-a0519-bp012
res/4b84d-a0519-bp014
res/4b84d-a0519-bp016
res/4b84d-a0519-bp018
res/4b84d-a0519-bp020
res/4b84d-a0519-bp022
res/4b84d-a0519-bp024
res/4b84d-a0519-bp026
res/4b84d-a0519-bp028
res/4b84d-a0519-bp030
res/55b6a-6b219-ae87d
res/595b7-a41f7-24316
res/5ea05-fc1d0-81228
res/72586-f540b-5c132
res/8dad0-04cd6-305e6
sound/501300_vc_morph_s1 2.wav
```

Lưu ý `res/4b84d-a0519-bp003 … bp030` là một **dãy đánh số chỉ có số chẵn** (và bp003).
Nếu trên máy Windows có cả dãy thì chép hết dãy, đừng chỉ chép 14 cái liệt kê ở đây.

Tên file cuối có **dấu cách và hậu tố " 2"** — đó là tên thật, không phải lỗi gõ. Trên
Windows đừng để công cụ tự đổi tên.

### Cách kiểm tra trên máy Windows

Chạy trong `website/game`, in ra những mục manifest không có trên đĩa:

```python
import zlib, json, os
raw = open('libs/2af72-f100c-2af72.json','rb').read()
for f in (lambda b: zlib.decompress(b), lambda b: zlib.decompress(b,-15), lambda b: zlib.decompress(b,47)):
    try:
        t = f(raw).decode('utf-8','replace'); break
    except Exception:
        pass
d = json.loads(t)
thieu = sorted({v for v in d.values() if isinstance(v, str) and not os.path.exists(v)})
print(len(thieu), 'muc thieu')
for v in thieu:
    print(' ', v)
```

Trên máy Mac lệnh này in **32** mục. Trên máy Windows nếu in ra ít hơn thì đúng những mục
chênh lệch là thứ cần chuyển sang.

### 10 mục KHÔNG cần chuyển

Trong 32 mục đó, 10 mục dưới đây là **bản chưa đóng gói dùng khi phát triển**; bản triển
khai dùng bundle đã obfuscate nên không cần:

```
index.js, index-uc.js, unpack.json
libs/laya.core.js, libs/laya.ani.js, libs/laya.html.js, libs/laya.ui.js
ydwxLibs/md5.min.js, ydwxLibs/zlib.min.js
```

(`md5` và `zlib` bản đang dùng là `libs/fe8a3-bb91d-7fb1b.js` và
`libs/0e8e7-bdd92-8bd5a.js`.)

## Chuyển sang bằng cách nào

`res/ sound/ spine/` **không nằm trong git** (1,6 GB, đã gitignore) và cũng không nằm
trong image Docker. Hai đường:

1. Thêm các file thiếu vào bản `client-assets.tar.gz` của GitHub Release `assets-v1` rồi
   phát hành lại — cách này để mọi lần triển khai sau đều có sẵn.
2. Hoặc rsync/WinSCP thẳng vào `ASSETS_DIR` trên server (mặc định `/opt/tcg/assets`).

Nếu chọn cách 1, nhớ cập nhật cả file `.sha256` đi kèm.

## Việc khác cũng chỉ làm được trên máy Windows

`tools/dump-to-seed.py` nên phát `ROW_FORMAT=DYNAMIC` thay vì để nguyên `COMPACT` của
mysqldump 5.6. Hiện `docker/initdb/mysql/zz-init.sh` đổi lúc nạp nên seed chạy được,
nhưng **dump thật sẽ đâm vào đúng lỗi này** (`ERROR 1118: Row size too large (> 8126)`)
vì image mysql nạp dump trực tiếp, `zz-init.sh` không chen vào được. Sinh lại seed cần
dump — chỉ máy Windows có.
