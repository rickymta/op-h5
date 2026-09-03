# op-h5 — bản snapshot triển khai game H5 `tcg` (Việt hoá)

Đây **không phải mã nguồn** mà là bản snapshot của một môi trường triển khai đang chạy trên Linux (`/h5/server` + `/www/wwwroot/game`), đã được sửa để dễ vận hành hơn. Không có source Java, không có build — chỉ có JAR đóng gói sẵn, cấu hình, bảng Excel, client H5 (LayaAir) và tầng PHP.

| Đọc gì | Ở đâu |
|---|---|
| Kiến trúc, lệnh vận hành, cấu hình hai tầng, API console, những gì đã sửa | [CLAUDE.md](CLAUDE.md) |
| Chạy bằng Docker trên máy 4 CPU / 8 GB / 40 GB | [docker/README.md](docker/README.md) |
| File còn thiếu / cách xử lý | [MISSING-FILES.md](MISSING-FILES.md) |
| Tra cứu 200 file Excel (Anh ↔ Trung ↔ Việt) | [docs/excel-index.md](docs/excel-index.md) |
| Tái tạo file Excel thiếu từ bytecode | [docs/missing-excel-reconstruction.md](docs/missing-excel-reconstruction.md) |
| Secrets đã che — điền lại trước khi chạy | [SECRETS.md](SECRETS.md) |

## Những gì repo này KHÔNG chứa

- **Secrets**: mọi mật khẩu/API key đã thay bằng `__PLACEHOLDER__`. Điền lại: `python tools/mask-secrets.py --fill secrets.env` (xem `SECRETS.md`).
- **`website/game/res/`** (1.5 GB, 10.584 file tài nguyên client), `sound/`, `spine/` — chuyển bằng WinSCP/rsync.
- **Dump MySQL/MongoDB** — dump từ server đang chạy bằng `docker/prepare-dumps.sh`.
- Log, backup, keystore.

## 8 fat JAR qua Git LFS

```bash
git lfs install
git clone https://github.com/rickymta/op-h5.git
```

Các JAR này **đã được vá bytecode** để đọc file Excel tên tiếng Anh (CLAUDE.md mục 14). Thay JAR mới từ nhà phát hành thì phải chạy lại `python tools/patch-excel-names.py --apply`.

## Trước khi đưa lên server

```bash
python tools/set-server-host.py <IP-hoặc-domain> --apply   # thay 192.168.1.69 còn lại
python tools/mask-secrets.py --fill secrets.env             # điền secrets
python tools/mask-secrets.py --check                        # phải "sach"
```
