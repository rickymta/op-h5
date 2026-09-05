import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button, Field, Msg } from "@op/ui/publisher";
import { api, errText } from "../api";
import { safeNext } from "../lib/links";
import { useAfterLogin, useMe } from "../lib/session";
import { useTitle } from "../lib/title";
import { AuthShell } from "./AuthShell";

// Cùng quy tắc với identity.ValidateUsername / ValidatePassword ở Go — kiểm sớm ở đây để
// người dùng thấy lỗi ngay khi gõ; server vẫn kiểm lại.
const USER_RE = /^[a-z0-9_]{6,15}$/;

export function Register() {
  useTitle("Đăng ký");
  const [, navigate] = useLocation();
  const next = safeNext(new URLSearchParams(useSearch()).get("next"));
  const me = useMe();
  const afterLogin = useAfterLogin();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (me.data) navigate(next, { replace: true });
  }, [me.data, next, navigate]);

  const reg = useMutation({
    mutationFn: () =>
      api.post<{ id: number; username: string }>("/api/register", {
        username: user.trim(),
        password: pass,
        email: email.trim(),
      }),
    onSuccess: async () => {
      await afterLogin();
      navigate(next);
    },
  });

  const userOk = USER_RE.test(user);
  const passOk = [...pass].length >= 8;
  const ok = userOk && passOk && pass === again;

  return (
    <AuthShell
      title="Tạo tài khoản"
      sub="Một lần đăng ký, dùng cho mọi game."
      foot={<>Đã có tài khoản? <a href="/dang-nhap">Đăng nhập</a></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); if (ok) reg.mutate(); }}>
        {reg.error && <Msg tone="err">{errText(reg.error)}</Msg>}
        <Field label="Tên đăng nhập" htmlFor="ru"
               hint={user && !userOk ? "6–15 ký tự: chữ thường, số, gạch dưới" : "6–15 ký tự"}>
          <input id="ru" autoComplete="username" autoCapitalize="none" spellCheck={false}
                 value={user} onChange={(e) => setUser(e.target.value.toLowerCase())} required autoFocus
                 pattern="[a-z0-9_]{6,15}" />
        </Field>
        <Field label="Mật khẩu" htmlFor="rp" hint={pass && !passOk ? "cần ít nhất 8 ký tự" : "ít nhất 8 ký tự"}>
          <input id="rp" type="password" autoComplete="new-password"
                 value={pass} onChange={(e) => setPass(e.target.value)} required />
        </Field>
        <Field label="Nhập lại mật khẩu" htmlFor="ra" hint={again && pass !== again ? "chưa khớp" : undefined}>
          <input id="ra" type="password" autoComplete="new-password"
                 value={again} onChange={(e) => setAgain(e.target.value)} required />
        </Field>
        <Field label="Email khôi phục" htmlFor="re" hint="tuỳ chọn — dùng khi quên mật khẩu">
          <input id="re" type="email" autoComplete="email" inputMode="email"
                 value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" full size="lg" disabled={reg.isPending || !ok}>
          {reg.isPending ? "Đang tạo…" : "Tạo tài khoản"}
        </Button>
        <p className="pb-sub" style={{ marginTop: 12 }}>
          Bấm Tạo tài khoản là bạn đồng ý với <a href="/dieu-khoan">Điều khoản</a> và <a href="/chinh-sach">Chính sách</a>.
        </p>
      </form>
    </AuthShell>
  );
}
