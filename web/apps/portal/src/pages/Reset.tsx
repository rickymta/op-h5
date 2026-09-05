import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Button, Field, LinkButton, Msg } from "@op/ui/publisher";
import { api, errText } from "../api";
import { useTitle } from "../lib/title";
import { AuthShell } from "./AuthShell";

export function Reset() {
  useTitle("Đặt lại mật khẩu");
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");

  const reset = useMutation({
    mutationFn: () => api.post<{ message: string }>("/api/password/reset", { token, new_password: pass }),
  });

  const ok = [...pass].length >= 8 && pass === again;

  if (!token) {
    return (
      <AuthShell title="Đặt lại mật khẩu" foot={<a href="/dang-nhap">← Về đăng nhập</a>}>
        <Msg tone="err">Liên kết thiếu mã đặt lại. Mở đúng liên kết trong email, hoặc yêu cầu liên kết mới.</Msg>
        <LinkButton href="/quen-mat-khau" variant="ghost" full>Yêu cầu liên kết mới</LinkButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      sub="Đặt xong, mọi phiên đang mở của tài khoản đều bị đăng xuất."
      foot={<a href="/dang-nhap">← Về đăng nhập</a>}
    >
      {reset.isSuccess ? (
        <>
          <Msg tone="ok">{reset.data.message}</Msg>
          <LinkButton href="/dang-nhap" full size="lg">Đăng nhập</LinkButton>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (ok) reset.mutate(); }}>
          {reset.error && (
            <Msg tone="err">
              {errText(reset.error)} <a href="/quen-mat-khau">Yêu cầu liên kết mới</a>
            </Msg>
          )}
          <Field label="Mật khẩu mới" htmlFor="np" hint="ít nhất 8 ký tự">
            <input id="np" type="password" autoComplete="new-password"
                   value={pass} onChange={(e) => setPass(e.target.value)} required autoFocus />
          </Field>
          <Field label="Nhập lại mật khẩu mới" htmlFor="na" hint={again && pass !== again ? "chưa khớp" : undefined}>
            <input id="na" type="password" autoComplete="new-password"
                   value={again} onChange={(e) => setAgain(e.target.value)} required />
          </Field>
          <Button type="submit" full size="lg" disabled={reset.isPending || !ok}>
            {reset.isPending ? "Đang lưu…" : "Đặt mật khẩu mới"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
