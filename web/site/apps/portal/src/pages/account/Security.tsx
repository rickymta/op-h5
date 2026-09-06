import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge, Button, Card, DataTable, Field, Modal, Msg, Section, Toast, formatDate, useToast, type Column } from "@op/site-ui";
import { api, ApiError, errText, type Session } from "../../api";
import { useAfterLogout, useMe } from "../../lib/session";
import { AccountHead, Actions, Loading } from "../../lib/shell";
import { shortUA } from "../../lib/ua";

/** Bảo mật: đổi mật khẩu, email khôi phục, phiên đang mở + đăng xuất mọi nơi khác, đăng xuất. */
export function Security() {
  const { toast, show } = useToast();
  return (
    <>
      <AccountHead
        title="Bảo mật"
        sub="Đổi mật khẩu khi nghi bị lộ; kiểm tra thiết bị đang đăng nhập; đăng xuất mọi nơi khác."
      />
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
      setCur("");
      setNext("");
      setAgain("");
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
  const ok = [...next].length >= 8 && next === again && !!cur;
  const err = m.error
    ? m.error instanceof ApiError && m.error.status === 403
      ? "Mật khẩu hiện tại không đúng."
      : errText(m.error)
    : null;

  return (
    <Card>
      <h3>Đổi mật khẩu</h3>
      <p className="mb-3.5 text-sm text-fg-muted">
        Ít nhất 8 ký tự. Đổi xong, mọi phiên khác bị đăng xuất; phiên này giữ nguyên.
      </p>
      <form
        className="max-w-[480px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) m.mutate();
        }}
      >
        {err && <Msg tone="err">{err}</Msg>}
        <Field label="Mật khẩu hiện tại" htmlFor="pc">
          <input
            id="pc"
            type="password"
            autoComplete="current-password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            required
          />
        </Field>
        <Field label="Mật khẩu mới" htmlFor="pn" hint={next && [...next].length < 8 ? "cần ít nhất 8 ký tự" : undefined}>
          <input
            id="pn"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </Field>
        <Field label="Nhập lại mật khẩu mới" htmlFor="pa" hint={again && next !== again ? "chưa khớp" : undefined}>
          <input
            id="pa"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="mt-1" disabled={m.isPending || !ok}>
          {m.isPending ? "Đang đổi…" : "Đổi mật khẩu"}
        </Button>
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
      <p className="mb-3.5 text-sm text-fg-muted">
        Dùng để nhận liên kết đặt lại mật khẩu. Không dùng để gửi quảng cáo.
        {me.data?.email && !me.data.email_verified ? " Email hiện tại chưa được xác nhận." : ""}
      </p>
      <form
        className="max-w-[480px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) m.mutate();
        }}
      >
        {m.error && <Msg tone="err">{errText(m.error)}</Msg>}
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex-1 basis-[220px] [&>*]:mb-0">
            <Field label="Email" htmlFor="em">
              <input
                id="em"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={value}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
              />
            </Field>
          </div>
          <Button type="submit" variant="ghost" disabled={m.isPending || !changed}>
            {m.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
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
    onError: (e) => {
      setConfirm(false);
      show(errText(e), true);
    },
  });
  const others = (q.data?.sessions ?? []).filter((s) => !s.current).length;

  // Bảng phiên đi qua `DataTable` như bảng lịch sử và bảng đơn: dưới 720 px mỗi dòng thành một
  // thẻ có nhãn cột, nên bốn cột này không đẩy trang rộng hơn màn hình ở 375 px.
  const cols: Column<Session>[] = [
    {
      key: "dev",
      title: "Thiết bị",
      render: (s) => (
        <span title={s.user_agent} className="font-semibold">
          {shortUA(s.user_agent)}
          {s.current && (
            <span className="ml-1.5 inline-block align-middle">
              <Badge tone="gold">phiên này</Badge>
            </span>
          )}
        </span>
      ),
    },
    {
      key: "ip",
      title: "IP",
      width: "22%",
      render: (s) => <span className="whitespace-nowrap font-mono nums text-fg-muted">{s.ip || "—"}</span>,
    },
    {
      key: "created",
      title: "Đăng nhập",
      width: "22%",
      render: (s) => <span className="whitespace-nowrap font-mono nums text-fg-muted">{formatDate(s.created_at)}</span>,
    },
    {
      key: "expires",
      title: "Hết hạn",
      width: "22%",
      render: (s) => <span className="whitespace-nowrap font-mono nums text-fg-muted">{formatDate(s.expires_at)}</span>,
    },
  ];

  return (
    <Section
      title="Phiên đang mở"
      sub="Thiết bị nào đang đăng nhập tài khoản này. Thấy lạ thì đăng xuất mọi nơi khác rồi đổi mật khẩu."
    >
      <Card>
        {q.isPending && <Loading />}
        {q.isError && <Msg tone="err">{errText(q.error)}</Msg>}
        {q.isSuccess && (
          <DataTable columns={cols} rows={q.data.sessions} rowKey={(s) => s.id_tail} empty="Không có phiên nào." />
        )}
        <Actions>
          <Button variant="ghost" onClick={() => setConfirm(true)} disabled={!q.isSuccess || others === 0}>
            Đăng xuất mọi nơi khác{others > 0 ? ` (${others})` : ""}
          </Button>
        </Actions>
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
        <p className="text-sm text-fg-muted">Nếu nghi bị chiếm tài khoản, đổi mật khẩu ngay sau bước này.</p>
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
      <p className="mb-3.5 text-sm text-fg-muted">Chỉ thoát trên thiết bị này.</p>
      <Button variant="danger" onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? "Đang thoát…" : "Đăng xuất"}
      </Button>
    </Card>
  );
}
