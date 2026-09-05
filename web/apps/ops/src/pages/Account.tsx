import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Toast, useToast } from "@op/ui";
import { api, type Me } from "../api";

/** Tài khoản của chính người đang đăng nhập: xem thông tin và đổi mật khẩu. */
export function Account() {
  const { toast, show } = useToast();
  const qc = useQueryClient();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");

  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/me") });

  const change = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/api/me/password", { current: cur, new: next }),
    onSuccess: () => {
      show("Đã đổi mật khẩu. Các phiên khác của bạn đã bị cắt.");
      setCur(""); setNext(""); setAgain("");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => show(e.message, true),
  });

  const khop = next.length >= 10 && next === again;

  return (
    <main>
      <h2>Tài khoản</h2>
      <p className="sub">
        {me.data ? `${me.data.username}${me.data.email ? " · " + me.data.email : ""} · vai trò ${me.data.role}` : "Đang tải…"}
      </p>

      {me.data?.must_change_password && (
        <p className="err">
          Tài khoản này vẫn dùng mật khẩu mặc định. Mật khẩu đó nằm trong mã nguồn của một
          kho công khai, nghĩa là ai cũng biết. Hãy đổi ngay bên dưới.
        </p>
      )}

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: 16 }}>Đổi mật khẩu</h2>
        <p className="sub">Tối thiểu 10 ký tự. Đổi xong, mọi phiên khác của bạn bị cắt, phiên này giữ nguyên.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (khop) change.mutate(); }}>
          <Field label="Mật khẩu hiện tại" htmlFor="pc">
            <input id="pc" type="password" autoComplete="current-password" style={{ width: "100%" }}
                   value={cur} onChange={(e) => setCur(e.target.value)} required />
          </Field>
          <Field label="Mật khẩu mới" htmlFor="pn" hint={next && next.length < 10 ? "— cần ít nhất 10 ký tự" : undefined}>
            <input id="pn" type="password" autoComplete="new-password" style={{ width: "100%" }}
                   value={next} onChange={(e) => setNext(e.target.value)} required />
          </Field>
          <Field label="Nhập lại mật khẩu mới" htmlFor="pa" hint={again && next !== again ? "— chưa khớp" : undefined}>
            <input id="pa" type="password" autoComplete="new-password" style={{ width: "100%" }}
                   value={again} onChange={(e) => setAgain(e.target.value)} required />
          </Field>
          <button type="submit" disabled={change.isPending || !khop || !cur}>
            {change.isPending ? "Đang đổi…" : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
      <Toast toast={toast} />
    </main>
  );
}
