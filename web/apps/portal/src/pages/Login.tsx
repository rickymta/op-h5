import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button, Field, Msg } from "@op/ui/publisher";
import { api, ApiError, errText } from "../api";
import { safeNext } from "../lib/links";
import { useAfterLogin, useMe } from "../lib/session";
import { useTitle } from "../lib/title";
import { AuthShell } from "./AuthShell";

export function Login() {
  useTitle("Đăng nhập");
  const [, navigate] = useLocation();
  const search = useSearch();
  const next = safeNext(new URLSearchParams(search).get("next"));
  const me = useMe();
  const afterLogin = useAfterLogin();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  // Đã đăng nhập rồi mà vẫn mở trang này (bấm Back chẳng hạn) thì đi thẳng.
  useEffect(() => {
    if (me.data) navigate(next, { replace: true });
  }, [me.data, next, navigate]);

  const login = useMutation({
    mutationFn: () => api.post<{ status: string }>("/api/login", { username: user.trim(), password: pass }),
    onSuccess: async () => {
      await afterLogin();
      navigate(next);
    },
  });

  const err = login.error
    ? login.error instanceof ApiError && login.error.status === 401
      ? "Sai tài khoản hoặc mật khẩu."
      : login.error instanceof ApiError && login.error.status === 429
        // 429 có hai nghĩa ở server (thử sai quá nhiều, tài khoản bị khoá): ưu tiên lời server.
        ? login.error.message || "Bạn thử sai quá nhiều lần. Thử lại sau ít phút."
        : errText(login.error)
    : null;

  return (
    <AuthShell
      title="Đăng nhập"
      sub="Một tài khoản cho mọi game của chúng tôi."
      foot={
        <>
          Chưa có tài khoản? <a href={`/dang-ky${next !== "/tai-khoan" ? `?next=${encodeURIComponent(next)}` : ""}`}>Đăng ký</a>
          <span className="pt-sep">·</span>
          <a href="/quen-mat-khau">Quên mật khẩu</a>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); if (user.trim() && pass) login.mutate(); }}>
        {err && <Msg tone="err">{err}</Msg>}
        <Field label="Tên đăng nhập" htmlFor="lu">
          <input id="lu" autoComplete="username" autoCapitalize="none" spellCheck={false}
                 value={user} onChange={(e) => setUser(e.target.value)} required autoFocus />
        </Field>
        <Field label="Mật khẩu" htmlFor="lp">
          <input id="lp" type="password" autoComplete="current-password"
                 value={pass} onChange={(e) => setPass(e.target.value)} required />
        </Field>
        <Button type="submit" full size="lg" disabled={login.isPending || !user.trim() || !pass}>
          {login.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
    </AuthShell>
  );
}
