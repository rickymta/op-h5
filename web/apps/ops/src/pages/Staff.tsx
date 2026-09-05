import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, Toast, useToast } from "@op/ui";
import { api, type Staff as StaffRow } from "../api";

const MO_TA_VAI_TRO: Record<string, string> = {
  viewer: "chỉ xem",
  gm: "thao tác trên nhân vật trong game",
  operator: "sửa cấu hình nền tảng",
  owner: "toàn quyền, kể cả quản lý nhân viên",
};

/** Quản lý nhân viên. Chỉ owner vào được; API cũng chặn lần nữa ở phía Go. */
export function Staff() {
  const { toast, show } = useToast();
  const qc = useQueryClient();
  const [newUser, setNewUser] = useState("");
  const [newRole, setNewRole] = useState("gm");
  // Mật khẩu chỉ hiện MỘT lần sau khi tạo hoặc đặt lại; không có chỗ nào đọc lại được.
  const [oneTime, setOneTime] = useState<{ user: string; pass: string } | null>(null);

  const q = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ staff: StaffRow[]; roles: string[] }>("/api/staff"),
  });
  const staff = q.data?.staff ?? [];
  const roles = q.data?.roles ?? ["viewer", "gm", "operator", "owner"];

  const done = (msg: string) => { show(msg); void qc.invalidateQueries({ queryKey: ["staff"] }); };

  const create = useMutation({
    mutationFn: () => api.post<{ password: string }>("/api/staff", { username: newUser.trim(), role: newRole }),
    onSuccess: (d) => { setOneTime({ user: newUser.trim(), pass: d.password }); setNewUser(""); done("Đã tạo tài khoản"); },
    onError: (e: Error) => show(e.message, true),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.post<{ ok: boolean }>(`/api/staff/${id}`, body),
    onSuccess: () => done("Đã lưu"),
    onError: (e: Error) => show(e.message, true),
  });

  const reset = useMutation({
    mutationFn: (u: StaffRow) => api.post<{ password: string }>(`/api/staff/${u.id}/password`, {}),
    onSuccess: (d, u) => { setOneTime({ user: u.username, pass: d.password }); done("Đã đặt lại mật khẩu"); },
    onError: (e: Error) => show(e.message, true),
  });

  return (
    <main>
      <h2>Nhân viên</h2>
      <p className="sub">
        Mọi thay đổi ở đây vào nhật ký. Khoá tài khoản hoặc đổi mật khẩu sẽ cắt luôn phiên
        đang mở của người đó.
      </p>

      {oneTime && (
        <div className="okbox">
          Mật khẩu của <b>{oneTime.user}</b>: <code style={{ fontFamily: "var(--mono)", fontSize: 15 }}>{oneTime.pass}</code>
          <div style={{ marginTop: 6 }}>
            Chỉ hiện một lần. Gửi cho người đó qua kênh riêng rồi bấm{" "}
            <button className="ghost" style={{ padding: "2px 8px" }} onClick={() => setOneTime(null)}>đã chép</button>.
          </div>
        </div>
      )}
      {q.isError && <p className="err">{(q.error as Error).message}</p>}

      <div className="card">
        <div className="bang-cuon">
          <table>
            <thead>
              <tr><th>#</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th><th>Tạo</th><th /></tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="num">{u.id}</td>
                  <td>{u.username}</td>
                  <td>
                    <select value={u.role} disabled={update.isPending}
                            onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } })}>
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.status === "active"
                      ? <Pill tone="ok">đang dùng</Pill>
                      : <Pill tone="crit">đã khoá</Pill>}
                  </td>
                  <td className="num">{u.last_login_at || "chưa"}</td>
                  <td className="num">{u.created_at}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="ghost" disabled={reset.isPending}
                            onClick={() => { if (window.confirm(`Đặt lại mật khẩu cho ${u.username}? Phiên đang mở của họ sẽ bị cắt.`)) reset.mutate(u); }}>
                      Đặt lại mật khẩu
                    </button>{" "}
                    <button disabled={update.isPending}
                            onClick={() => update.mutate({ id: u.id, body: { status: u.status === "active" ? "disabled" : "active" } })}>
                      {u.status === "active" ? "Khoá" : "Mở"}
                    </button>
                  </td>
                </tr>
              ))}
              {!q.isLoading && staff.length === 0 && <tr><td colSpan={7} className="muted">Chưa có tài khoản nào.</td></tr>}
              {q.isLoading && <tr><td colSpan={7} className="muted">Đang tải…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 16 }}>Thêm nhân viên</h2>
        <p className="sub">Mật khẩu do hệ thống sinh và hiện một lần. Người tạo không đặt mật khẩu hộ.</p>
        <form style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}
              onSubmit={(e) => { e.preventDefault(); if (newUser.trim()) create.mutate(); }}>
          <div style={{ flex: "1 1 180px" }}>
            <label htmlFor="nu">Tên đăng nhập</label>
            <input id="nu" style={{ width: "100%" }} value={newUser} onChange={(e) => setNewUser(e.target.value)}
                   autoComplete="off" placeholder="vd: an.nguyen" />
          </div>
          <div>
            <label htmlFor="nr">Vai trò</label>
            <select id="nr" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={create.isPending || !newUser.trim()}>
            {create.isPending ? "Đang tạo…" : "Tạo"}
          </button>
        </form>
        <div style={{ marginTop: 14, fontSize: 13 }} className="muted">
          {roles.map((r) => <div key={r}><code>{r}</code> — {MO_TA_VAI_TRO[r] ?? ""}</div>)}
        </div>
      </div>
      <Toast toast={toast} />
    </main>
  );
}
