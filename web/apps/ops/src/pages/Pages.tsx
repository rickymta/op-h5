import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Pill, Toast, useToast } from "@op/ui";
import { api, type Game, type Page as PageRow, type PageInput, type PagesResponse } from "../api";
import { fmtDate } from "../time";
import { useForm } from "../useForm";
import { canWrite, useMe } from "../useMe";

/** Các trang thường có, gợi ý khi tạo mới. Không ép: slug nào cũng lưu được. */
const GOI_Y: { slug: string; title: string }[] = [
  { slug: "gioi-thieu", title: "Giới thiệu" },
  { slug: "huong-dan", title: "Hướng dẫn" },
  { slug: "dieu-khoan", title: "Điều khoản sử dụng" },
  { slug: "chinh-sach", title: "Chính sách bảo mật" },
  { slug: "faq", title: "Câu hỏi thường gặp" },
  { slug: "ho-tro", title: "Hỗ trợ" },
];

/** Bỏ dấu tiếng Việt rồi rút về a-z0-9 và gạch nối — cùng quy tắc máy chủ dùng cho tin tức. */
function lamSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

type FormState = PageInput & { id: number };

const RONG: FormState = { id: 0, slug: "", game_code: "", title: "", body: "" };

/** Trang nội dung tĩnh (giới thiệu, điều khoản, FAQ…) cho nền tảng và từng game. */
export function Pages() {
  const { toast, show } = useToast();
  const qc = useQueryClient();
  const me = useMe();
  const ghi = canWrite(me.data);

  // `loc` lọc danh sách; `form` null là đang không sửa gì.
  const { f: ui, set } = useForm<{ loc: string; form: FormState | null }>({ loc: "all", form: null });

  const gamesQ = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = gamesQ.data?.games ?? [];

  const list = useQuery({
    queryKey: ["pages", ui.loc],
    queryFn: () => api.get<PagesResponse>(`/api/pages?game=${encodeURIComponent(ui.loc)}`),
  });
  const pages = list.data?.pages ?? [];

  const lamMoi = () => void qc.invalidateQueries({ queryKey: ["pages"] });

  const luu = useMutation({
    mutationFn: (v: PageInput) => api.post<{ id: number; slug: string }>("/api/pages", v),
    onSuccess: (d) => {
      show(`Đã lưu trang “${d.slug}”`);
      set("form", null);
      lamMoi();
    },
    onError: (e: Error) => show(e.message, true),
  });

  const xoa = useMutation({
    mutationFn: (p: PageRow) => api.post<{ ok: boolean }>(`/api/pages/${p.id}/delete`),
    onSuccess: (_d, p) => {
      show(`Đã xoá trang “${p.slug}”`);
      if (ui.form?.id === p.id) set("form", null);
      lamMoi();
    },
    onError: (e: Error) => show(e.message, true),
  });

  const moMoi = (goi?: { slug: string; title: string }) =>
    set("form", {
      ...RONG,
      // Đang lọc theo một game thì tạo luôn bản riêng của game đó — đỡ một thao tác.
      game_code: ui.loc === "all" || ui.loc === "common" ? "" : ui.loc,
      slug: goi?.slug ?? "",
      title: goi?.title ?? "",
    });

  const moSua = (p: PageRow) =>
    set("form", { id: p.id, slug: p.slug, game_code: p.game_code, title: p.title, body: p.body });

  const f = ui.form;

  return (
    <div className="wrap">
      <Toast toast={toast} />

      <div className="bar">
        <h2>Trang nội dung</h2>
        <select value={ui.loc} onChange={(e) => set("loc", e.target.value)} aria-label="Lọc theo game">
          <option value="all">Tất cả</option>
          <option value="common">Chung của nền tảng</option>
          {games.map((g) => (
            <option key={g.code} value={g.code}>
              {g.name}
            </option>
          ))}
        </select>
        {ghi && (
          <button onClick={() => moMoi()} disabled={!!f}>
            Thêm trang
          </button>
        )}
      </div>

      <p className="muted">
        Trang tĩnh dùng chung cho toàn hệ thống và cho từng game: giới thiệu, hướng dẫn, điều khoản,
        chính sách, FAQ, hỗ trợ. Trang của một game sẽ tra <strong>bản riêng trước</strong>, không có
        thì lui về <strong>bản chung</strong> — nên cùng một đường dẫn tồn tại được ở cả hai mức.
      </p>

      {!!f && (
        <section className="card">
          <h3>{f.id ? `Sửa trang #${f.id}` : "Trang mới"}</h3>

          <div className="grid2">
            <Field label="Thuộc về" htmlFor="pg-game">
              <select
                id="pg-game"
                value={f.game_code}
                onChange={(e) => set("form", { ...f, game_code: e.target.value })}
                disabled={!!f.id}
              >
                <option value="">Chung của nền tảng</option>
                {games.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Đường dẫn"
              htmlFor="pg-slug"
              hint={f.id ? "— khoá, đổi thì tạo trang mới" : "— chữ thường, không dấu"}
            >
              <input
                id="pg-slug"
                value={f.slug}
                maxLength={64}
                disabled={!!f.id}
                onChange={(e) => set("form", { ...f, slug: lamSlug(e.target.value) })}
                placeholder="gioi-thieu"
              />
            </Field>
          </div>

          <Field label="Tiêu đề" htmlFor="pg-title">
            <input
              id="pg-title"
              value={f.title}
              maxLength={160}
              onChange={(e) => {
                const title = e.target.value;
                // Trang mới và người dùng chưa tự gõ đường dẫn thì suy ra từ tiêu đề.
                const slug = !f.id && (f.slug === "" || f.slug === lamSlug(f.title)) ? lamSlug(title) : f.slug;
                set("form", { ...f, title, slug });
              }}
            />
          </Field>

          <Field label="Nội dung" htmlFor="pg-body" hint={`— ${[...f.body].length.toLocaleString("vi")} ký tự`}>
            <textarea
              id="pg-body"
              value={f.body}
              rows={16}
              onChange={(e) => set("form", { ...f, body: e.target.value })}
              placeholder={"Văn bản thuần. Đoạn cách nhau bằng một dòng trống."}
            />
          </Field>

          <div className="row">
            <button
              onClick={() => luu.mutate({ slug: f.slug, game_code: f.game_code, title: f.title, body: f.body })}
              disabled={!ghi || luu.isPending || !f.slug.trim() || !f.title.trim()}
            >
              {luu.isPending ? "Đang lưu…" : "Lưu"}
            </button>
            <button className="ghost" onClick={() => set("form", null)}>
              Huỷ
            </button>
          </div>
        </section>
      )}

      {list.isPending && <p className="muted">Đang tải…</p>}
      {list.isError && <p className="err">{(list.error as Error).message}</p>}

      {!list.isPending && pages.length === 0 && (
        <section className="card">
          <p className="muted">Chưa có trang nào.</p>
          {ghi && (
            <>
              <p className="muted">Tạo nhanh một trang thường dùng:</p>
              <div className="row">
                {GOI_Y.map((g) => (
                  <button key={g.slug} className="ghost" onClick={() => moMoi(g)} disabled={!!f}>
                    {g.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {pages.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Đường dẫn</th>
              <th>Tiêu đề</th>
              <th>Thuộc về</th>
              <th>Dài</th>
              <th>Sửa lần cuối</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.slug}</code>
                </td>
                <td>{p.title}</td>
                <td>
                  {p.game_code ? (
                    <Pill tone="ok">{p.game_name || p.game_code}</Pill>
                  ) : (
                    <Pill tone="unknown">chung</Pill>
                  )}
                </td>
                <td>{[...p.body].length.toLocaleString("vi")}</td>
                <td className="muted">
                  {fmtDate(p.updated_at)}
                  {p.updated_by_name ? ` · ${p.updated_by_name}` : ""}
                </td>
                <td className="row">
                  <button className="ghost" onClick={() => moSua(p)} disabled={!!f}>
                    Sửa
                  </button>
                  {ghi && (
                    <button
                      className="ghost"
                      onClick={() => {
                        if (confirm(`Xoá trang “${p.slug}”${p.game_code ? ` của ${p.game_name}` : " (bản chung)"}?`))
                          xoa.mutate(p);
                      }}
                      disabled={xoa.isPending}
                    >
                      Xoá
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
