import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Toast, formatInt, useToast, type PillTone } from "@op/ui";
import { api, type Order, type OrdersResponse } from "../api";

const TRANG_THAI = ["", "pending", "granted", "failed", "refunded"] as const;

function tone(s: Order["status"]): PillTone {
  if (s === "granted") return "ok";
  if (s === "pending") return "warn";
  if (s === "failed") return "crit";
  return "unknown";
}

export function Orders() {
  const [game, setGame] = useState("");
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const { toast, show } = useToast();

  const q = useQuery({
    queryKey: ["orders", game, status],
    queryFn: () =>
      api.get<OrdersResponse>(`/api/orders?game=${encodeURIComponent(game)}&status=${encodeURIComponent(status)}`),
    // Đơn 'pending' đổi trạng thái do worker nền, không do thao tác trên trang này.
    refetchInterval: (query) =>
      query.state.data?.orders.some((o) => o.status === "pending") ? 5_000 : false,
  });

  const act = useMutation({
    mutationFn: ({ id, what, reason }: { id: number; what: "retry" | "refund"; reason?: string }) =>
      api.post<{ ok: boolean; refund_txn?: number }>(`/api/orders/${id}/${what}`, { reason }),
    onSuccess: (d, v) => {
      show(v.what === "retry" ? `Đã đưa đơn #${v.id} về hàng đợi` : `Đã hoàn Xu, giao dịch #${d.refund_txn}`);
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => show(e.message, true),
  });

  const data = q.data;
  const games = data?.games ?? [];

  return (
    <main>
      <h2>Đơn mua</h2>
      <p className="sub">
        Mỗi dòng là một lần trừ Xu. <b>pending</b> đang chờ phát · <b>granted</b> đã phát ·{" "}
        <b>failed</b> console từ chối hoặc hết lần thử (Xu hoàn tự động → <b>refunded</b>) ·{" "}
        <b>ingame</b> mua bằng nút trong game, game tự phát.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginBottom: 14 }}>
        <div>
          <label htmlFor="g">Game</label>
          {/* Chua chon thi theo game ma API tra ve (mac dinh dau tien), khong de o trong. */}
          <select id="g" value={game || data?.game || ""} onChange={(e) => setGame(e.target.value)}>
            {games.length === 0 && <option value="">(đang tải)</option>}
            {games.map((x) => (
              <option key={x.code} value={x.code}>
                {x.name} ({x.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, fontFamily: "var(--mono)", fontSize: 12 }}>
        {TRANG_THAI.map((s) => (
          <button
            key={s || "all"}
            className={status === s ? "" : "ghost"}
            onClick={() => setStatus(s)}
            style={{ padding: "3px 9px" }}
          >
            {s || "tất cả"} {s && data?.counts[s] ? data.counts[s] : ""}
          </button>
        ))}
      </div>

      <div className="card">
        {q.isError && <p className="err">{(q.error as Error).message}</p>}
        <div className="bang-cuon">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Lúc</th><th>Người chơi</th><th>Gói</th><th>Máy chủ</th>
                <th>Xu</th><th>Phát</th><th>Trạng thái</th><th>Lỗi</th><th />
              </tr>
            </thead>
            <tbody>
              {(data?.orders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="num">{o.id}</td>
                  <td className="num">{o.created_at}</td>
                  <td className="num">{o.username || `#${o.user_id}`}</td>
                  <td>
                    {o.name}{" "}
                    <span className="muted" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{o.package_id}</span>
                  </td>
                  <td className="num">{o.srv_code}</td>
                  <td className="num">{formatInt(o.amount_xu)}</td>
                  <td><Pill>{o.grant_mode}</Pill></td>
                  <td>
                    <Pill tone={tone(o.status)}>
                      {o.status}
                      {o.status === "pending" || o.status === "failed" ? ` · ${o.attempts}` : ""}
                    </Pill>
                  </td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--signal)", maxWidth: 260, wordBreak: "break-word" }}>
                    {o.last_error}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {o.status === "failed" && (
                      <button className="ghost" disabled={act.isPending} onClick={() => act.mutate({ id: o.id, what: "retry" })}>
                        Phát lại
                      </button>
                    )}{" "}
                    {(o.status === "failed" || o.status === "pending") && (
                      <button
                        disabled={act.isPending}
                        onClick={() => {
                          const reason = window.prompt(`Lý do hoàn Xu cho đơn #${o.id} (vào nhật ký):`);
                          if (reason === null) return;
                          act.mutate({ id: o.id, what: "refund", reason });
                        }}
                      >
                        {o.status === "pending" ? "Huỷ & hoàn" : "Hoàn Xu"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!q.isLoading && (data?.orders.length ?? 0) === 0 && (
                <tr><td colSpan={10} className="muted">Chưa có đơn nào.</td></tr>
              )}
              {q.isLoading && (
                <tr><td colSpan={10} className="muted">Đang tải…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Toast toast={toast} />
    </main>
  );
}
