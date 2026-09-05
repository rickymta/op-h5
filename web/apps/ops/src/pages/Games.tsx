import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Pill, Toast, useToast } from "@op/ui";
import { api, type Badge, type Game, type GameInput } from "../api";
import { OAnh } from "../Anh";
import { useForm } from "../useForm";
import { canWrite, useMe } from "../useMe";

const NHAN: Record<Badge, string> = { "": "—", new: "Mới", hot: "Hot", soon: "Sắp ra" };
const MAU_MAC_DINH = "#EE4623";
const HEX = /^#[0-9A-Fa-f]{6}$/;
const LA_URL = (v: string) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v);

type ShowFn = (text: string, bad?: boolean) => void;

/** Quản lý game trong hệ thống. Thay phần seed cứng trong docker/platform-seed.sh. */
export function Games() {
  const { toast, show } = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const ghi = canWrite(me.data);
  const { f: ui, set } = useForm({ adding: false, editing: "" });

  const q = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = q.data?.games ?? [];
  const dangSua = games.find((g) => g.code === ui.editing);

  return (
    <main>
      <h2>Game</h2>
      <p className="sub">
        Mỗi game cần bốn thứ: dòng trong <code>games</code>, client đăng nhập OIDC, thiết bị
        và ít nhất một máy chủ. Trang này ghi cả bốn; tiến trình Adapter thì vẫn phải chạy riêng.
        Phần giới thiệu (ảnh, tagline, nhãn) hiện ở trang chính và trang của game.
      </p>
      {me.data && !ghi && (
        <p className="sub">Vai trò <b>{me.data.role}</b> chỉ xem. Sửa cần operator trở lên.</p>
      )}

      <div className="card">
        {q.isError && <p className="err">{(q.error as Error).message}</p>}
        <div className="bang-cuon">
          {/* Rộng hơn 640px mặc định: 9 cột chia đều làm cột Tên nát chữ ở điện thoại; bảng cuộn trong khung. */}
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr><th>Mã</th><th>Tên</th><th>Thể loại</th><th>Nhãn</th><th>Máy chủ</th><th>Gói</th><th>Đăng nhập</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const mo = ui.editing === g.code;
                return (
                  <tr key={g.code} style={mo ? { background: "var(--surface2)" } : undefined}>
                    <td className="num">{g.code}</td>
                    <td style={{ minWidth: 200 }}>
                      {g.name} {g.featured && <Pill tone="warn">nổi bật</Pill>}
                      {g.tagline && <div className="muted" style={{ fontSize: 12 }}>{g.tagline}</div>}
                    </td>
                    <td>{g.genre || "—"}</td>
                    <td>{g.badge ? <Pill tone="ok">{NHAN[g.badge]}</Pill> : "—"}</td>
                    <td className="num">{g.servers}</td>
                    <td className="num">{g.packages}</td>
                    <td>{g.has_client ? <Pill tone="ok">có</Pill> : <Pill tone="crit">thiếu</Pill>}</td>
                    <td>{g.status === "active" ? <Pill tone="ok">đang mở</Pill> : <Pill>ẩn</Pill>}</td>
                    <td>
                      <button className={mo ? "" : "ghost"} onClick={() => set("editing", mo ? "" : g.code)}>
                        {mo ? "Đóng" : "Sửa"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!q.isLoading && games.length === 0 && <tr><td colSpan={9} className="muted">Chưa có game nào.</td></tr>}
              {q.isLoading && <tr><td colSpan={9} className="muted">Đang tải…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {dangSua && (
        <GameEditor key={dangSua.code} game={dangSua} ghi={ghi} show={show}
                    onSaved={() => void qc.invalidateQueries({ queryKey: ["games"] })}
                    onClose={() => set("editing", "")} />
      )}

      {ui.adding ? (
        <AddGame onDone={(msg) => { set("adding", false); show(msg); void qc.invalidateQueries({ queryKey: ["games"] }); }}
                 onCancel={() => set("adding", false)} onError={(m) => show(m, true)} />
      ) : (
        <button disabled={!ghi} onClick={() => set("adding", true)}>Thêm game</button>
      )}
      <Toast toast={toast} />
    </main>
  );
}

// ---------------------------------------------------------------- thẻ chỉnh sửa

function tuGame(g: Game): GameInput {
  return {
    name: g.name, adapter_url: g.adapter_url, site_url: g.site_url, status: g.status,
    tagline: g.tagline ?? "", genre: g.genre ?? "", description: g.description ?? "",
    cover_url: g.cover_url ?? "", banner_url: g.banner_url ?? "", logo_url: g.logo_url ?? "",
    accent: g.accent ?? "", badge: g.badge ?? "", featured: !!g.featured,
    fanpage_url: g.fanpage_url ?? "", group_url: g.group_url ?? "", support_url: g.support_url ?? "",
  };
}

/** Kiểm trước ở trình duyệt cho câu báo lỗi gần ô nhập; phía Go kiểm lại lần nữa. */
function loiGame(f: GameInput): string {
  if (!f.name.trim()) return "Tên game không được trống.";
  if (f.tagline.length > 120) return "Tagline tối đa 120 ký tự.";
  if (f.genre.length > 48) return "Thể loại tối đa 48 ký tự.";
  if (f.accent && !HEX.test(f.accent)) return "Màu nhấn phải dạng #RRGGBB, ví dụ #EE4623.";
  for (const [k, nhan] of [
    ["cover_url", "Ảnh bìa"], ["banner_url", "Key visual"], ["logo_url", "Logo"],
    ["fanpage_url", "Fanpage"], ["group_url", "Nhóm"], ["support_url", "Hỗ trợ"],
  ] as const) {
    if (!LA_URL(f[k].trim())) return `${nhan}: để trống, hoặc bắt đầu bằng / hoặc http(s)://.`;
  }
  return "";
}

function GameEditor({ game, ghi, show, onSaved, onClose }: {
  game: Game; ghi: boolean; show: ShowFn; onSaved: () => void; onClose: () => void;
}) {
  const { f, set, text, reset } = useForm(() => tuGame(game));
  const goc = tuGame(game);
  const dirty = JSON.stringify(f) !== JSON.stringify(goc);
  const mauHopLe = HEX.test(f.accent);

  const save = useMutation({
    // Gửi ĐỦ trường: phía Go đối chiếu `featured` để tắt ở game khác, nên không gửi lẻ.
    mutationFn: () => api.post<{ ok: boolean }>(`/api/games/${encodeURIComponent(game.code)}`, {
      ...f, name: f.name.trim(), tagline: f.tagline.trim(), genre: f.genre.trim(),
      accent: f.accent.trim().toUpperCase(),
    }),
    onSuccess: () => { show("Đã lưu"); onSaved(); },
    onError: (e: Error) => show(e.message, true),
  });

  return (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>
        Sửa {game.name} <span className="muted" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{game.code}</span>
      </h2>
      <p className="sub">
        URL ảnh có thể ghi tương đối so với trang game (vd <code>/assets/images/logo.png</code>);
        trang chính tự ghép thành tuyệt đối.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); const l = loiGame(f); if (l) show(l, true); else save.mutate(); }}>
        <fieldset className="tran" disabled={!ghi}>
          <div className="form-luoi">
            <Field label="Tên hiển thị" htmlFor="g-name">
              <input id="g-name" value={f.name} onChange={text("name")} style={{ width: "100%" }} required maxLength={64} />
            </Field>
            <Field label="Thể loại" hint="— vd Đấu tướng · Idle" htmlFor="g-genre">
              <input id="g-genre" value={f.genre} onChange={text("genre")} style={{ width: "100%" }} maxLength={48} />
            </Field>
            <div className="rong">
              <Field label="Tagline" hint="— một câu dưới tên game, tối đa 120 ký tự" htmlFor="g-tag">
                <input id="g-tag" value={f.tagline} onChange={text("tagline")} style={{ width: "100%" }} maxLength={120} />
              </Field>
            </div>
            <div className="rong">
              <Field label="Mô tả" hint="— văn bản thuần, hiện ở trang game" htmlFor="g-desc">
                <textarea id="g-desc" value={f.description} onChange={text("description")} rows={5} style={{ width: "100%" }} />
              </Field>
            </div>

            <OAnh id="g-cover" label="Ảnh bìa" hint="— dọc 3:4, thẻ game ở trang chính" value={f.cover_url}
                  site={f.site_url} onChange={(v) => set("cover_url", v)} placeholder="/assets/images/cover.png" />
            <OAnh id="g-banner" label="Key visual" hint="— ngang, nền hero" value={f.banner_url}
                  site={f.site_url} onChange={(v) => set("banner_url", v)} placeholder="/assets/images/bg_pc.jpg" />
            <OAnh id="g-logo" label="Logo" hint="— nền trong suốt" value={f.logo_url}
                  site={f.site_url} onChange={(v) => set("logo_url", v)} placeholder="/assets/images/logo.png" />

            <Field label="Màu nhấn" hint="— #RRGGBB, để trống dùng màu mặc định" htmlFor="g-accent">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input id="g-accent" value={f.accent} onChange={text("accent")} placeholder={MAU_MAC_DINH}
                       maxLength={7} autoComplete="off" style={{ flex: 1, minWidth: 0, fontFamily: "var(--mono)" }} />
                <input type="color" className="o-mau" aria-label="Chọn màu nhấn"
                       value={mauHopLe ? f.accent : MAU_MAC_DINH}
                       onChange={(e) => set("accent", e.target.value.toUpperCase())} />
                <div className="mau-hien" title={mauHopLe ? f.accent : `mặc định ${MAU_MAC_DINH}`}
                     style={{ background: mauHopLe ? f.accent : MAU_MAC_DINH, opacity: f.accent && !mauHopLe ? 0.3 : 1 }} />
              </div>
            </Field>
            <Field label="Nhãn" hint="— góc thẻ game" htmlFor="g-badge">
              <select id="g-badge" value={f.badge} onChange={text("badge")} style={{ width: "100%" }}>
                {(Object.keys(NHAN) as Badge[]).map((b) => <option key={b} value={b}>{NHAN[b]}</option>)}
              </select>
            </Field>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="g-featured">Nổi bật</label>
              <label htmlFor="g-featured" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--text)", minHeight: 36 }}>
                <input id="g-featured" type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} />
                Hiện ở hero trang chính
              </label>
              <div className="muted" style={{ fontSize: 12 }}>Chỉ một game nổi bật; bật ở đây sẽ tắt ở game khác.</div>
            </div>

            <Field label="Fanpage" htmlFor="g-fan">
              <input id="g-fan" value={f.fanpage_url} onChange={text("fanpage_url")} style={{ width: "100%" }} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Nhóm" htmlFor="g-group">
              <input id="g-group" value={f.group_url} onChange={text("group_url")} style={{ width: "100%" }} placeholder="https://facebook.com/groups/…" />
            </Field>
            <Field label="Hỗ trợ" htmlFor="g-support">
              <input id="g-support" value={f.support_url} onChange={text("support_url")} style={{ width: "100%" }} placeholder="https://m.me/…" />
            </Field>

            <Field label="Địa chỉ Adapter" hint="— nơi tiến trình Adapter của game nghe" htmlFor="g-adapter">
              <input id="g-adapter" value={f.adapter_url} onChange={text("adapter_url")} style={{ width: "100%" }} required />
            </Field>
            <Field label="Địa chỉ trang game" hint="— đổi thì redirect OIDC đổi theo" htmlFor="g-site">
              <input id="g-site" value={f.site_url} onChange={text("site_url")} style={{ width: "100%" }} required />
            </Field>
            <Field label="Trạng thái" htmlFor="g-status">
              <select id="g-status" value={f.status} onChange={text("status")} style={{ width: "100%" }}>
                <option value="active">đang mở</option>
                <option value="hidden">ẩn</option>
              </select>
            </Field>
          </div>
        </fieldset>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, alignItems: "center" }}>
          <button type="submit" disabled={!ghi || !dirty || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu"}</button>
          <button type="button" className="ghost" disabled={!dirty} onClick={() => reset(goc)}>Hoàn tác</button>
          <button type="button" className="ghost" onClick={onClose}>Đóng</button>
          {dirty && <span className="muted" style={{ fontSize: 12 }}>Có thay đổi chưa lưu.</span>}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- thêm game

function AddGame({ onDone, onCancel, onError }: { onDone: (msg: string) => void; onCancel: () => void; onError: (m: string) => void }) {
  const { f, text } = useForm({
    code: "", name: "", tagline: "", genre: "", adapter_url: "http://127.0.0.1:8090", site_url: "",
    device_code: "", srv_code: "s1", ws_port: "8001",
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>("/api/games", {
        ...f, ws_port: Number(f.ws_port) || 0,
        // Để trống mã thiết bị thì chỉ tạo game, thêm máy chủ sau ở trang Đội máy chủ.
        device_code: f.device_code.trim(), srv_code: f.device_code.trim() ? f.srv_code : "",
      }),
    onSuccess: (d) => onDone(d.message),
    onError: (e: Error) => onError(e.message),
  });

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h2 style={{ fontSize: 16 }}>Thêm game</h2>
      <p className="sub">Địa chỉ trang game quyết định đường quay về sau khi đăng nhập, nên phải đúng ngay từ đầu. Ảnh và nhãn sửa sau bằng nút Sửa.</p>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <Field label="Mã game" hint="— chữ thường, dùng làm client_id" htmlFor="gc">
          <input id="gc" value={f.code} onChange={text("code")} placeholder="haitac" style={{ width: "100%" }} required />
        </Field>
        <Field label="Tên hiển thị" htmlFor="gn">
          <input id="gn" value={f.name} onChange={text("name")} placeholder="Đại Hải Trình" style={{ width: "100%" }} required />
        </Field>
        <Field label="Tagline" hint="— tuỳ chọn, một câu dưới tên" htmlFor="gt">
          <input id="gt" value={f.tagline} onChange={text("tagline")} placeholder="Ra khơi cùng băng hải tặc của riêng bạn" style={{ width: "100%" }} maxLength={120} />
        </Field>
        <Field label="Thể loại" hint="— tuỳ chọn" htmlFor="gg">
          <input id="gg" value={f.genre} onChange={text("genre")} placeholder="Đấu tướng · Idle" style={{ width: "100%" }} maxLength={48} />
        </Field>
        <Field label="Địa chỉ Adapter" hint="— nơi tiến trình Adapter của game nghe" htmlFor="ga">
          <input id="ga" value={f.adapter_url} onChange={text("adapter_url")} style={{ width: "100%" }} required />
        </Field>
        <Field label="Địa chỉ trang game" hint="— người chơi mở URL này" htmlFor="gs">
          <input id="gs" value={f.site_url} onChange={text("site_url")} placeholder="https://haitac.example.com" style={{ width: "100%" }} required />
        </Field>
        <p className="sub" style={{ marginTop: 18 }}>Máy chủ đầu tiên (bỏ trống nếu thêm sau)</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div><label htmlFor="gd">Mã thiết bị</label><input id="gd" value={f.device_code} onChange={text("device_code")} placeholder="d1" style={{ width: 110 }} /></div>
          <div><label htmlFor="gsv">Mã máy chủ</label><input id="gsv" value={f.srv_code} onChange={text("srv_code")} style={{ width: 110 }} /></div>
          <div><label htmlFor="gp">Cổng WebSocket</label><input id="gp" inputMode="numeric" value={f.ws_port} onChange={text("ws_port")} style={{ width: 130 }} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="submit" disabled={create.isPending}>{create.isPending ? "Đang tạo…" : "Tạo game"}</button>
          <button type="button" className="ghost" onClick={onCancel}>Huỷ</button>
        </div>
      </form>
    </div>
  );
}
