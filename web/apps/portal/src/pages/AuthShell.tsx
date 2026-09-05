import type { ReactNode } from "react";
import { Card } from "@op/ui/publisher";

/** Khung chung cho đăng nhập / đăng ký / quên mật khẩu: một cột, giữa màn hình, nền tối. */
export function AuthShell({ title, sub, children, foot }: { title: string; sub?: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <main className="pt-auth">
      <div className="pt-auth__box">
        <Card pad="lg">
          <h1>{title}</h1>
          {sub && <p className="pb-sub">{sub}</p>}
          {children}
          {foot && <div className="pt-auth__foot">{foot}</div>}
        </Card>
      </div>
    </main>
  );
}
