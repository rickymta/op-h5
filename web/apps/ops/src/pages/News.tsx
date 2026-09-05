import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Pill, Toast, useToast } from "@op/ui";
import { api, type Game, type News as NewsRow, type NewsInput, type NewsKind, type NewsResponse } from "../api";
import { OAnh } from "../Anh";
import { fmtDate, localToRFC3339, rfc3339ToLocal } from "../time";
import { useForm } from "../useForm";
import { canWrite, useMe } from "../useMe";

const LOAI: Record<NewsKind, string> = { news: "Tin", event: "Sự kiện", notice: "Thông báo" };
const TRANG_THAI = [["all", "tất cả"], ["draft", "nháp"], ["published", "đã đăng"]] as const;
type TrangThai = (typeof TRANG_THAI)[number][0];
type ShowFn = (text: string, bad?: boolean) => void;

/** Tin tức, sự kiện, thông báo — hiện ở trang chính và trang của từng game. */
export function News() {
  const { toast, show } = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const ghi = canWrite(me.data);
  // form: null đóng · "new" thêm · một dòng tin đang sửa.
  const { f: ui, set } = useForm<{ game: string; status: TrangThai; form: "new" | NewsRow | null }>({
    game: "all", status: "all", form: null,
  });

  const gamesQ = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = gamesQ.data?.games ?? [];

  const list = useInfiniteQuery({
    queryKey: ["news", ui.game, ui.status],
    queryFn: ({ pageParam }) =>
      api.get<NewsResponse>(`/api/news?game=${encodeURIComponent(ui.game)}&status=${ui.status}&page=${pageParam}&page_size=20`),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.has_more ? pages.length + 1 : undefined),
  });
  // Phân trang theo offset: thêm tin giữa hai lần tải làm một dòng lặp lại, nên lọc theo id.
  const daThay = new Set<number>();
  const items = (list.data?.pages ?? []).flatMap((p) => p.news).filter((n) => !daThay.has(n.id) && daThay.add(n.id));

  const lamMoi = () => void qc.invalidateQueries({ queryKey: ["news"] });

  const del = useMutation({
    mutationFn: (n: NewsRow) => api.post<{ ok: boolean }>(`/api/news/${n.id}/delete`),
    onSuccess: (_d, n) => {
      show(`Đã xoá tin #${n.id}`);
      if (ui.form && ui.form !== "new" && ui.form.id === n.id) set("form", null);
      lamMoi();
    },
    onError: (e: Error) => show(e.message, true),
  });

  const dangSua = ui.form && ui.form !== "new" ? ui.form.id : null;

  return (
    <main>
      <h2>Tin tức</h2>
      <p className="sub">
        Tin <b>Chung</b> hiện ở trang chính và mọi trang game; tin của một game chỉ hiện ở game đó.
        Thông báo được ghim mới nhất thành dải báo trên đầu trang chính. Chỉ tin <b>đã đăng</b> mới lộ ra ngoài.
      </p>
      {me.data && !ghi && (
        <p className="sub">Vai trò <b>{me.data.role}</b> chỉ xem. Thêm, sửa, xoá cần operator trở lên.</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginBottom: 14 }}>
        <div>
          <label htmlFor="ng">Game</label>
          <select id="ng" value={ui.game} onChange={(e) => set("game", e.target.value)}>
            <option value="all">Tất cả</option>
            {games.map((g) => <option key={g.code} value={g.code}>{g.name} ({g.code})</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontFamily: "var(--mono)", fontSize: 12 }}>
          {TRANG_THAI.map(([s, nhan]) => (
            <button key={s} className={ui.status === s ? "" : "ghost"} onClick={() => set("status", s)} style={{ padding: "3px 9px" }}>
              {nhan}
            </button>
          ))}
        </div>
        <button disabled={!ghi || ui.form === "new"} onClick={() => set("form", "new")} style={{ marginLeft: "auto" }}>Thêm tin</button>
      </div>

      {ui.form && (
        <NewsForm key={ui.form === "new" ? "new" : ui.form.id} initial={ui.form === "new" ? undefined : ui.form}
                  games={games} ghi={ghi} show={show}
                  onDone={(msg) => { show(msg); set("form", null); lamMoi(); }}
                  onCancel={() => set("form", null)} />
      )}

      <div className="card">
        {list.isError && <p className="err">{(list.error as Error).message}</p>}
        <div className="bang-cuon">
          {/* Rộng hơn 640px mặc định để cột Tiêu đề không nát chữ ở điện thoại; bảng cuộn trong khung. */}
          <table style={{ minWidth: 960 }}>
            <thead>
              <tr><th>Tiêu đề</th><th>Loại</th><th>Game</th><th>Ghim</th><th>Trạng thái</th><th>Đăng lúc</th><th>Người tạo</th><th /></tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} style={dangSua === n.id ? { background: "var(--surface2)" } : undefined}>
                  <td style={{ minWidth: 260 }}>
                    {n.title}
                    {n.summary && <div className="muted" style={{ fontSize: 12, maxWidth: 420 }}>{n.summary}</div>}
                  </td>
                  <td><Pill tone={n.kind === "notice" ? "warn" : n.kind === "event" ? "ok" : "unknown"}>{LOAI[n.kind]}</Pill></td>
                  <td className="num">{n.game_code ? (n.game_name || n.game_code) : "Chung"}</td>
                  <td>{n.pinned ? <Pill tone="warn">ghim</Pill> : <span className="muted">—</span>}</td>
                  <td>{n.status === "published" ? <Pill tone="ok">đã đăng</Pill> : <Pill>nháp</Pill>}</td>
                  <td className="num">{fmtDate(n.published_at)}</td>
                  <td className="num">{n.created_by_name || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className={dangSua === n.id ? "" : "ghost"} onClick={() => set("form", dangSua === n.id ? null : n)}>
                      {dangSua === n.id ? "Đóng" : "Sửa"}
                    </button>{" "}
                    <button className="ghost" disabled={!ghi || del.isPending} style={{ color: "var(--signal)" }}
                            onClick={() => { if (window.confirm(`Xoá tin #${n.id} "${n.title}"? Không khôi phục được.`)) del.mutate(n); }}>
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
              {!list.isLoading && items.length === 0 && <tr><td colSpan={8} className="muted">Chưa có tin nào.</td></tr>}
              {list.isLoading && <tr><td colSpan={8} className="muted">Đang tải…</td></tr>}
            </tbody>
          </table>
        </div>
        {list.hasNextPage && (
          <div style={{ marginTop: 14 }}>
            <button className="ghost" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
              {list.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
            </button>
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </main>
  );
}

// ---------------------------------------------------------------- form thêm / sửa

function NewsForm({ initial, games, ghi, show, onDone, onCancel }: {
  initial?: NewsRow; games: Game[]; ghi: boolean; show: ShowFn; onDone: (msg: string) => void; onCancel: () => void;
}) {
  const { f, set, text } = useForm({
    game_code: initial?.game_code ?? "",
    kind: initial?.kind ?? ("news" as NewsKind),
    title: initial?.title ?? "",
    summary: initial?.summary ?? "",
    body: initial?.body ?? "",
    image_url: initial?.image_url ?? "",
    link_url: initial?.link_url ?? "",
    pinned: initial?.pinned ?? false,
    status: initial?.status ?? ("draft" as NewsRow["status"]),
    published_at: rfc3339ToLocal(initial?.published_at),
  });
  const site = games.find((g) => g.code === f.game_code)?.site_url ?? "";

  const save = useMutation({
    mutationFn: () => {
      const body: NewsInput = {
        game_code: f.game_code || null, kind: f.kind, title: f.title.trim(), summary: f.summary.trim(),
        body: f.body, image_url: f.image_url.trim(), link_url: f.link_url.trim(), pinned: f.pinned, status: f.status,
      };
      // Bỏ trống thì không gửi: đăng mà chưa có giờ, phía Go lấy lúc lưu.
      const luc = localToRFC3339(f.published_at);
      if (luc) body.published_at = luc;
      // Tạo trả { id }, sửa trả { ok }; ở đây chỉ cần id khi tạo.
      return api.post<{ id?: number }>(initial ? `/api/news/${initial.id}` : "/api/news", body);
    },
    onSuccess: (d) => onDone(initial ? `Đã lưu tin #${initial.id}` : `Đã tạo tin #${d.id ?? "?"}`),
    onError: (e: Error) => show(e.message, true),
  });

  const loi = !f.title.trim() ? "Tiêu đề không được trống."
    : f.title.length > 160 ? "Tiêu đề tối đa 160 ký tự."
    : f.summary.length > 300 ? "Tóm tắt tối đa 300 ký tự."
    : f.published_at && !localToRFC3339(f.published_at) ? "Giờ đăng không hợp lệ."
    : "";

  return (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>
        {initial ? <>Sửa tin <span className="muted" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>#{initial.id}</span></> : "Thêm tin"}
      </h2>
      <p className="sub">
        {initial ? `Tạo ${fmtDate(initial.created_at)}${initial.created_by_name ? " bởi " + initial.created_by_name : ""} · sửa ${fmtDate(initial.updated_at)}` : "Lưu dạng nháp trước, đọc lại rồi mới chuyển sang đã đăng."}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); if (loi) show(loi, true); else save.mutate(); }}>
        <fieldset className="tran" disabled={!ghi}>
          <div className="form-luoi">
            <div className="rong">
              <Field label="Tiêu đề" hint="— tối đa 160 ký tự" htmlFor="n-title">
                <input id="n-title" value={f.title} onChange={text("title")} style={{ width: "100%" }} required maxLength={160} />
              </Field>
            </div>
            <div className="rong">
              <Field label="Tóm tắt" hint="— một hai câu hiện ở danh sách, tối đa 300 ký tự" htmlFor="n-sum">
                <input id="n-sum" value={f.summary} onChange={text("summary")} style={{ width: "100%" }} maxLength={300} />
              </Field>
            </div>
            <div className="rong">
              <Field label="Nội dung" hint="— văn bản thuần, đoạn cách nhau bằng dòng trống" htmlFor="n-body">
                <textarea id="n-body" value={f.body} onChange={text("body")} rows={12} style={{ width: "100%", fontFamily: "var(--sans)" }} />
              </Field>
            </div>

            <Field label="Loại" htmlFor="n-kind">
              <select id="n-kind" value={f.kind} onChange={text("kind")} style={{ width: "100%" }}>
                {(Object.keys(LOAI) as NewsKind[]).map((k) => <option key={k} value={k}>{LOAI[k]}</option>)}
              </select>
            </Field>
            <Field label="Game" hint="— Chung = hiện ở mọi nơi" htmlFor="n-game">
              <select id="n-game" value={f.game_code} onChange={text("game_code")} style={{ width: "100%" }}>
                <option value="">— Chung —</option>
                {games.map((g) => <option key={g.code} value={g.code}>{g.name} ({g.code})</option>)}
              </select>
            </Field>

            <OAnh id="n-img" label="Ảnh" hint="— ngang, hiện cạnh tin" value={f.image_url} site={site}
                  onChange={(v) => set("image_url", v)} placeholder="https://… hoặc /brand/…" />
            <Field label="Liên kết" hint="— bấm vào tin thì mở đường này thay vì trang tin" htmlFor="n-link">
              <input id="n-link" value={f.link_url} onChange={text("link_url")} style={{ width: "100%" }} placeholder="https://…" />
            </Field>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="n-pin">Ghim</label>
              <label htmlFor="n-pin" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--text)", minHeight: 36 }}>
                <input id="n-pin" type="checkbox" checked={f.pinned} onChange={(e) => set("pinned", e.target.checked)} />
                Luôn lên đầu danh sách
              </label>
              <div className="muted" style={{ fontSize: 12 }}>Thông báo ghim mới nhất thành dải báo ở trang chính.</div>
            </div>
            <Field label="Trạng thái" htmlFor="n-status">
              <select id="n-status" value={f.status} onChange={text("status")} style={{ width: "100%" }}>
                <option value="draft">nháp</option>
                <option value="published">đã đăng</option>
              </select>
            </Field>
            <Field label="Đăng lúc" hint="— để trống: lấy lúc lưu khi đã đăng" htmlFor="n-at">
              <input id="n-at" type="datetime-local" value={f.published_at} onChange={text("published_at")} style={{ width: "100%" }} />
            </Field>
          </div>
        </fieldset>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
          <button type="submit" disabled={!ghi || save.isPending}>{save.isPending ? "Đang lưu…" : initial ? "Lưu" : "Tạo tin"}</button>
          <button type="button" className="ghost" onClick={onCancel}>{initial ? "Đóng" : "Huỷ"}</button>
        </div>
      </form>
    </div>
  );
}
