import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Field, Msg } from "@op/ui/publisher";
import { api, ApiError, errText } from "../api";
import { useSite } from "../lib/session";
import { useTitle } from "../lib/title";
import { AuthShell } from "./AuthShell";

export function Forgot() {
  useTitle("Quên mật khẩu");
  const site = useSite();
  const [email, setEmail] = useState("");

  // Server luôn trả cùng một câu dù email có tồn tại hay không — không dò được ai đã đăng ký.
  const send = useMutation({
    mutationFn: () => api.post<{ message: string }>("/api/password/forgot", { email: email.trim() }),
  });

  const notConfigured = send.error instanceof ApiError && send.error.status === 503;
  const support = site.data?.support_url;

  return (
    <AuthShell
      title="Quên mật khẩu"
      sub="Nhập email khôi phục đã gắn với tài khoản. Chúng tôi gửi liên kết đặt lại mật khẩu, hiệu lực trong ít phút."
      foot={<><a href="/dang-nhap">← Về đăng nhập</a></>}
    >
      {send.isSuccess ? (
        <Msg tone="ok">{send.data.message}</Msg>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) send.mutate(); }}>
          {notConfigured ? (
            <Msg tone="warn">
              Chức năng khôi phục mật khẩu qua email chưa được bật. Vui lòng liên hệ hỗ trợ để được
              giúp{support ? <> qua <a href={support} target="_blank" rel="noopener">trang hỗ trợ</a></> : ""}.
            </Msg>
          ) : send.error ? (
            <Msg tone="err">{errText(send.error)}</Msg>
          ) : null}
          <Field label="Email khôi phục" htmlFor="fe">
            <input id="fe" type="email" autoComplete="email" inputMode="email"
                   value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Button type="submit" full size="lg" disabled={send.isPending || !email.trim() || notConfigured}>
            {send.isPending ? "Đang gửi…" : "Gửi liên kết"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
