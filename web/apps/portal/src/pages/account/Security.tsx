import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button, Card, Field, Modal, Msg, Section, Toast, formatDate, useToast } from "@op/ui/publisher";
import { api, ApiError, errText, type Session } from "../../api";
import { useAfterLogout, useMe } from "../../lib/session";
import { shortUA } from "../../lib/ua";

/** Bảo mật: đổi mật khẩu, email khôi phục, phiên đang mở + đăng xuất mọi nơi khác, đăng xuất. */
export function Security() {
  const { toast, show } = useToast();
  return (
    <>
      <div className="pt-account__head">
        <h1>Bảo mật</h1>
        <p className="pb-sub">Đổi mật khẩu khi nghi bị lộ; kiểm tra thiết bị đang đăng nhập; đăng xuất mọi nơi khác.</p>
      </div>
      <ChangePassword show={show} />
      <RecoveryEmail show={show} />
      <Sessions show={show} />
      <LogoutCard />
      <Toast toast={toast} />
    </>
  );
}

type Show = (t: string, err?: boolean) => void;

function ChangePassword({ show }: { show: Show }) {
  const qc = useQueryClient();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const m = useMutation({
    mutationFn: () => api.post<{ status: string }>("/api/password", { old_password: cur, new_password: next }),
    onSuccess: () => {
      show("Đã đổi mật khẩu. Các phiên khác đã đăng xuất.");
      setCur(""); setNext(""); setAgain("");
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
  const ok = [...next].length >= 8 && next === again && !!cur;
  const err = m.error
    ? m.error instanceof ApiError && m.error.status === 403 ? "Mật khẩu hiện tại không đúng." : errText(m.error)
    : null;

  return (
    <Card>
      <h3>Đổi mật khẩu</h3>
      <p className="pb-sub" style={{ marginBottom: 14 }}>Ít nhất 8 ký tự. Đổi xong, mọi phiên khác bị đăng xuất; phiên này giữ nguyên.</p>
      <form className="pt-form" onSubmit={(e) => { e.preventDefault(); if (ok) m.mutate(); }}>
        {err && <Msg tone="err">{err}</Msg>}
        <Field label="Mật khẩu hiện tại" htmlFor="pc">
          <input id="pc" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        </Field>
        <Field label="Mật khẩu mới" htmlFor="pn" hint={next && [...next].length < 8 ? "cần ít nhất 8 ký tự" : undefined}>
          <input id="pn" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <Field label="Nhập lại mật khẩu mới" htmlFor="pa" hint={again && next !== again ? "chưa khớp" : undefined}>
          <input id="pa" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={m.isPending || !ok}>{m.isPending ? "Đang đổi…" : "Đổi mật khẩu"}</Button>
      </form>
    </Card>
  );
}

function RecoveryEmail({ show }: { show: Show }) {
  const qc = useQueryClient();
  const me = useMe();
  const [email, setEmail] = useState<string | null>(null);
  const value = email ?? me.data?.email ?? "";
  const m = useMutation({
    mutationFn: () => api.post<{ status: string }>("/api/me/email", { email: value.trim() }),
    onSuccess: () => {
      show("Đã lưu email khôi phục.");
      setEmail(null);
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const changed = value.trim() !== (me.data?.email ?? "");

  return (
    <Card>
      <h3>Email khôi phục</h3>
      <p className="pb-sub" style={{ marginBottom: 14 }}>
        Dùng để nhận liên kết đặt lại mật khẩu. Không dùng để gửi quảng cáo.
        {me.data?.email && !me.data.email_verified ? " Email hiện tại chưa được xác nhận." : ""}
      </p>
      <form className="pt-form" onSubmit={(e) => { e.preventDefault(); if (changed) m.mutate(); }}>
        {m.error && <Msg tone="err">{errText(m.error)}</Msg>}
        <div className="pt-form-row">
          <Field label="Email" htmlFor="em">
            <input id="em" type="email" autoComplete="email" inputMode="email" value={value}
                   onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />
          </Field>
          <Button type="submit" variant="ghost" disabled={m.isPending || !changed}>{m.isPending ? "Đang lưu…" : "Lưu"}</Button>
        </div>
      </form>
    </Card>
  );
}

function Sessions({ show }: { show: Show }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const q = useQuery({ queryKey: ["sessions"], queryFn: () => api.get<{ sessions: Session[] }>("/api/me/sessions") });
  const revoke = useMutation({
    mutationFn: () => api.post<{ revoked: number }>("/api/me/sessions/revoke-others"),
    onSuccess: (r) => {
      setConfirm(false);
      show(r.revoked > 0 ? `Đã đăng xuất ${r.revoked} phiên khác.` : "Không có phiên nào khác.");
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e) => { setConfirm(false); show(errText(e), true); },
  });
  const others = (q.data?.sessions ?? []).filter((s) => !s.current).length;

  return (
    <Section title="Phiên đang mở" sub="Thiết bị nào đang đăng nhập tài khoản này. Thấy lạ thì đăng xuất mọi nơi khác rồi đổi mật khẩu.">
      <Card>
        {q.isPending && <p className="pt-loading">Đang tải…</p>}
        {q.isError && <Msg tone="err">{errText(q.error)}</Msg>}
        {q.isSuccess && (
          <div className="pt-scroll">
            <table className="pt-table pt-sess">
              <thead><tr><th>Thiết bị</th><th>IP</th><th>Đăng nhập</th><th>Hết hạn</th></tr></thead>
              <tbody>
                {q.data.sessions.map((s) => (
                  <tr key={s.id_tail}>
                    <td className="dev" title={s.user_agent}>
                      {shortUA(s.user_agent)}
                      {s.current && <span className="pt-tag pt-tag--me">phiên này</span>}
                    </td>
                    <td className="num ip">{s.ip || "—"}</td>
                    <td className="num created">{formatDate(s.created_at)}</td>
                    <td className="num expires">{formatDate(s.expires_at)}</td>
                  </tr>
                ))}
                {q.data.sessions.length === 0 && <tr><td colSpan={4} className="pb-muted">Không có phiên nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="pt-actions">
          <Button variant="ghost" onClick={() => setConfirm(true)} disabled={!q.isSuccess || others === 0}>
            Đăng xuất mọi nơi khác{others > 0 ? ` (${others})` : ""}
          </Button>
        </div>
      </Card>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Đăng xuất mọi nơi khác?"
        actions={
          <>
            <Button variant="ghost" type="button" onClick={() => setConfirm(false)}>Huỷ</Button>
            <Button variant="danger" type="button" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
              {revoke.isPending ? "Đang đăng xuất…" : "Đăng xuất các phiên khác"}
            </Button>
          </>
        }
      >
        <p>{others} phiên ở thiết bị khác sẽ bị đăng xuất ngay. Phiên bạn đang dùng giữ nguyên.</p>
        <p className="pb-sub">Nếu nghi bị chiếm tài khoản, đổi mật khẩu ngay sau bước này.</p>
      </Modal>
    </Section>
  );
}

function LogoutCard() {
  const [, navigate] = useLocation();
  const afterLogout = useAfterLogout();
  const m = useMutation({
    mutationFn: () => api.post<{ status: string }>("/api/logout"),
    onSettled: () => {
      // Server lỗi thì cookie có thể còn, nhưng phía trình duyệt vẫn coi như đã thoát.
      afterLogout();
      navigate("/");
    },
  });
  return (
    <Card>
      <h3>Đăng xuất</h3>
      <p className="pb-sub" style={{ marginBottom: 14 }}>Chỉ thoát trên thiết bị này.</p>
      <Button variant="danger" onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Đang thoát…" : "Đăng xuất"}</Button>
    </Card>
  );
}
