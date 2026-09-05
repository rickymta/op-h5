import type { ReactNode } from "react";

/** Ô trống có lời: "Chưa có tin.", "Chưa mua gì." — thay cho khoảng trắng im lặng. */
export function Empty({ children }: { children: ReactNode }) {
  return <div className="pb-empty">{children}</div>;
}
