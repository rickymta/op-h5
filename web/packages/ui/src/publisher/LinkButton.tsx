import type { AnchorHTMLAttributes } from "react";
import { btnClass } from "./Button";

/** Liên kết trông như nút — cho "Chơi ngay" (/choi-game), "Nạp Xu"… là liên kết thường. */
export function LinkButton({
  variant = "primary",
  size = "md",
  full = false,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "primary" | "ghost"; size?: "md" | "lg"; full?: boolean }) {
  return <a className={btnClass(variant, size, full, className)} {...rest} />;
}
