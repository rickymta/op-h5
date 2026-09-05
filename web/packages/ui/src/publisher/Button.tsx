import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

/** Tên class cho nút — dùng chung với LinkButton để hai thứ trông giống hệt nhau. */
export function btnClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  full = false,
  extra?: string,
): string {
  return cx("pb-btn", `pb-btn--${variant}`, size === "lg" && "pb-btn--lg", full && "pb-btn--full", extra);
}

/**
 * Nút. Không đặt `type` mặc định: trong `<form>` nó là nút gửi như thẻ `<button>` thường —
 * nút phụ trong form (ví dụ "Huỷ") tự ghi `type="button"`.
 */
export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; full?: boolean }) {
  return <button className={btnClass(variant, size, full, className)} {...rest} />;
}
