import type { ReactNode } from "react";
import { Card } from "@op/site-ui";

/** Khung chung cho đăng nhập / đăng ký / quên mật khẩu: một cột, giữa màn hình, nền tối. */
export function AuthShell({
  title,
  sub,
  children,
  foot,
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <main className="grid place-items-center px-0 pb-10 pt-5 tb:min-h-[calc(100dvh-280px)] tb:px-4 tb:pb-14 tb:pt-10">
      <div className="w-full max-w-[420px]">
        <Card pad="lg">
          <h1 className="mb-1.5 text-[26px]">{title}</h1>
          {sub && <p className="mb-5 text-sm text-fg-muted">{sub}</p>}
          {children}
          {foot && (
            <div className="mt-[18px] border-t border-line pt-4 text-sm text-fg-muted [&_a]:inline-flex [&_a]:min-h-[44px] [&_a]:items-center">
              {foot}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
