import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Toast, formatInt, useToast } from "@op/ui";
import { api, type Player, type PlayerDetail } from "../api";

/** Người chơi: tìm, xem ví và nhân vật, khoá hoặc mở tài khoản. */
export function Players() {
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [openID, setOpenID] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ["players", term],
    queryFn: () => api.get<{ players: Player[] }>(`/api/players?q=${encodeURIComponent(term)}`),
  });
  const players = list.data?.players ?? [];

  return (
    <main>
      <h2>Người chơi</h2>
      <p className="sub">
        Không có nút xem mật khẩu và không có nút đăng nhập hộ. Khoá tài khoản sẽ cắt luôn
        phiên đang mở và phải ghi lý do.
      </p>

      <div className="card">
        <form style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}
              onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setOpenID(null); }}>
          <div style={{ flex: "1 1 240px" }}>
            <label htmlFor="pq">Tìm theo tên đăng nhập, email hoặc số điện thoại</label>
            <input id="pq" style={{ width: "100%" }} value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="để trống để xem người mới nhất" autoComplete="off" />
          </div>
          <button type="submit" disabled={list.isFetching}>{list.isFetching ? "Đang tìm…" : "Tìm"}</button>
        </form>

        {list.isError && <p className="err" style={{ marginTop: 12 }}>{(list.error as Error).message}</p>}
        <div className="bang-cuon" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr><th>#</th><th>Tên đăng nhập</th><th>Email</th><th>Số dư</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th><th /></tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="num">{p.id}</td>
                  <td>{p.username}</td>
                  <td className="num">{p.email || "—"}</td>
                  <td className="num">{formatInt(p.balance)}</td>
                  <td>{p.status === "active" ? <Pill tone="ok">đang dùng</Pill> : <Pill tone="crit">{p.status}</Pill>}</td>
                  <td className="num">{p.last_login_at || "chưa"}</td>
                  <td>
                    <button className={openID === p.id ? "" : "ghost"} onClick={() => setOpenID(openID === p.id ? null : p.id)}>
                      {openID === p.id ? "Đóng" : "Xem"}
                    </button>
                  </td>
                </tr>
              ))}
              {!list.isLoading && players.length === 0 && <tr><td colSpan={7} className="muted">Không có ai khớp.</td></tr>}
              {list.isLoading && <tr><td colSpan={7} className="muted">Đang tải…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openID !== null && <Detail id={openID} show={show} />}
      <Toast toast={toast} />
    </main>
  );
}

function Detail({ id, show }: { id: number; show: (t: string, bad?: boolean) => void }) {
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["player", id], queryFn: () => api.get<PlayerDetail>(`/api/players/${id}`) });

  const setStatus = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason: string }) =>
      api.post<{ ok: boolean }>(`/api/players/${id}`, { status, reason }),
    onSuccess: () => {
      show("Đã lưu");
      void qc.invalidateQueries({ queryKey: ["player", id] });
      void qc.invalidateQueries({ queryKey: ["players"] });
    },
    onError: (e: Error) => show(e.message, true),
  });

  if (d.isLoading) return <div className="card"><p className="muted" style={{ margin: 0 }}>Đang tải…</p></div>;
  if (d.isError) return <div className="card"><p className="err" style={{ margin: 0 }}>{(d.error as Error).message}</p></div>;
  const p = d.data!.player;

  return (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>{p.username}</h2>
      <p className="sub">
        Số dư {formatInt(p.balance)} Xu · tạo {p.created_at}
        {p.phone ? ` · ${p.phone}` : ""}
      </p>
      <div style={{ marginBottom: 18 }}>
        <button
          disabled={setStatus.isPending}
          onClick={() => {
            const next = p.status === "active" ? "locked" : "active";
            const reason = window.prompt(`Lý do ${next === "locked" ? "khoá" : "mở"} tài khoản ${p.username} (vào nhật ký):`);
            if (reason === null || !reason.trim()) return;
            setStatus.mutate({ status: next, reason });
          }}
        >
          {p.status === "active" ? "Khoá tài khoản" : "Mở tài khoản"}
        </button>
      </div>

      <h2 style={{ fontSize: 15 }}>Nhân vật trong game</h2>
      <div className="bang-cuon" style={{ marginBottom: 18 }}>
        <table>
          <thead><tr><th>Game</th><th>Tài khoản game</th><th>accountUid</th><th>Tạo</th></tr></thead>
          <tbody>
            {d.data!.identities.map((x) => (
              <tr key={x.game_code}>
                <td>{x.game_code}</td><td className="num">{x.game_username}</td>
                <td className="num">{x.account_uid || "chưa vào game"}</td><td className="num">{x.created_at}</td>
              </tr>
            ))}
            {d.data!.identities.length === 0 && <tr><td colSpan={4} className="muted">Chưa vào game nào.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 15 }}>Ví gần đây</h2>
      <div className="bang-cuon">
        <table>
          <thead><tr><th>Lúc</th><th>Loại</th><th>Số Xu</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {d.data!.history.map((e, i) => (
              <tr key={`${e.txn_id}-${i}`}>
                <td className="num">{e.at}</td>
                <td><Pill tone={e.amount > 0 ? "ok" : "unknown"}>{e.kind}</Pill></td>
                <td className="num" style={{ color: e.amount > 0 ? "var(--sea)" : undefined }}>
                  {e.amount > 0 ? "+" : ""}{formatInt(e.amount)}
                </td>
                <td className="muted">{e.memo}</td>
              </tr>
            ))}
            {d.data!.history.length === 0 && <tr><td colSpan={4} className="muted">Chưa có giao dịch nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
