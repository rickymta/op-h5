import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Pill, Toast, useToast } from "@op/ui";
import { api, type Game } from "../api";

/** Quản lý game trong hệ thống. Thay phần seed cứng trong docker/platform-seed.sh. */
export function Games() {
  const { toast, show } = useToast();
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = q.data?.games ?? [];

  const update = useMutation({
    mutationFn: ({ code, body }: { code: string; body: Record<string, unknown> }) =>
      api.post<{ ok: boolean }>(`/api/games/${encodeURIComponent(code)}`, body),
    onSuccess: () => { show("Đã lưu"); void qc.invalidateQueries({ queryKey: ["games"] }); },
    onError: (e: Error) => show(e.message, true),
  });

  return (
    <main>
      <h2>Game</h2>
      <p className="sub">
        Mỗi game cần bốn thứ: dòng trong <code>games</code>, client đăng nhập OIDC, thiết bị
        và ít nhất một máy chủ. Trang này ghi cả bốn; tiến trình Adapter thì vẫn phải chạy riêng.
      </p>

      <div className="card">
        <div className="bang-cuon">
          <table>
            <thead>
              <tr><th>Mã</th><th>Tên</th><th>Adapter</th><th>Trang game</th><th>Máy chủ</th><th>Gói</th><th>Đăng nhập</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {games.map((g) => <GameRow key={g.code} game={g} onSave={(body) => update.mutate({ code: g.code, body })} saving={update.isPending} />)}
              {!q.isLoading && games.length === 0 && <tr><td colSpan={9} className="muted">Chưa có game nào.</td></tr>}
              {q.isLoading && <tr><td colSpan={9} className="muted">Đang tải…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {adding ? (
        <AddGame onDone={(msg) => { setAdding(false); show(msg); void qc.invalidateQueries({ queryKey: ["games"] }); }}
                 onCancel={() => setAdding(false)} onError={(m) => show(m, true)} />
      ) : (
        <button onClick={() => setAdding(true)}>Thêm game</button>
      )}
      <Toast toast={toast} />
    </main>
  );
}

function GameRow({ game, onSave, saving }: { game: Game; onSave: (b: Record<string, unknown>) => void; saving: boolean }) {
  const [name, setName] = useState(game.name);
  const [adapter, setAdapter] = useState(game.adapter_url);
  const [site, setSite] = useState(game.site_url);
  const [status, setStatus] = useState(game.status);
  const dirty = name !== game.name || adapter !== game.adapter_url || site !== game.site_url || status !== game.status;

  return (
    <tr>
      <td className="num">{game.code}</td>
      <td><input value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 140 }} /></td>
      <td><input value={adapter} onChange={(e) => setAdapter(e.target.value)} style={{ minWidth: 180 }} /></td>
      <td><input value={site} onChange={(e) => setSite(e.target.value)} style={{ minWidth: 180 }} /></td>
      <td className="num">{game.servers}</td>
      <td className="num">{game.packages}</td>
      <td>{game.has_client ? <Pill tone="ok">có</Pill> : <Pill tone="crit">thiếu</Pill>}</td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value as Game["status"])}>
          <option value="active">đang mở</option>
          <option value="hidden">ẩn</option>
        </select>
      </td>
      <td>
        <button disabled={!dirty || saving} onClick={() => onSave({ name, adapter_url: adapter, site_url: site, status })}>Lưu</button>
      </td>
    </tr>
  );
}

function AddGame({ onDone, onCancel, onError }: { onDone: (msg: string) => void; onCancel: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({
    code: "", name: "", adapter_url: "http://127.0.0.1:8090", site_url: "",
    device_code: "", srv_code: "s1", ws_port: "8001",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

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
      <p className="sub">Địa chỉ trang game quyết định đường quay về sau khi đăng nhập, nên phải đúng ngay từ đầu.</p>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <Field label="Mã game" hint="— chữ thường, dùng làm client_id" htmlFor="gc">
          <input id="gc" value={f.code} onChange={set("code")} placeholder="haitac" style={{ width: "100%" }} required />
        </Field>
        <Field label="Tên hiển thị" htmlFor="gn">
          <input id="gn" value={f.name} onChange={set("name")} placeholder="Đại Hải Trình" style={{ width: "100%" }} required />
        </Field>
        <Field label="Địa chỉ Adapter" hint="— nơi tiến trình Adapter của game nghe" htmlFor="ga">
          <input id="ga" value={f.adapter_url} onChange={set("adapter_url")} style={{ width: "100%" }} required />
        </Field>
        <Field label="Địa chỉ trang game" hint="— người chơi mở URL này" htmlFor="gs">
          <input id="gs" value={f.site_url} onChange={set("site_url")} placeholder="https://haitac.example.com" style={{ width: "100%" }} required />
        </Field>
        <p className="sub" style={{ marginTop: 18 }}>Máy chủ đầu tiên (bỏ trống nếu thêm sau)</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div><label htmlFor="gd">Mã thiết bị</label><input id="gd" value={f.device_code} onChange={set("device_code")} placeholder="d1" style={{ width: 110 }} /></div>
          <div><label htmlFor="gsv">Mã máy chủ</label><input id="gsv" value={f.srv_code} onChange={set("srv_code")} style={{ width: 110 }} /></div>
          <div><label htmlFor="gp">Cổng WebSocket</label><input id="gp" inputMode="numeric" value={f.ws_port} onChange={set("ws_port")} style={{ width: 130 }} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="submit" disabled={create.isPending}>{create.isPending ? "Đang tạo…" : "Tạo game"}</button>
          <button type="button" className="ghost" onClick={onCancel}>Huỷ</button>
        </div>
      </form>
    </div>
  );
}
