import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const BASE =
  "items-center justify-center gap-2 min-h-touch px-5 rounded-md border border-transparent " +
  "cursor-pointer whitespace-nowrap font-sans font-semibold text-[15px] leading-tight " +
  "tracking-[0.01em] no-underline hover:no-underline transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 " +
  "aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 hover:text-white",
  ghost: "bg-transparent text-gold-400 border-line hover:bg-ink-800 hover:border-gold-400",
  danger: "bg-danger-bg text-danger-400 border-danger-500 hover:bg-danger-500 hover:text-white",
};

// Cỡ lớn thu bớt ở điện thoại (48 px / 16 px) rồi mới nở ra ở máy tính bàn — nút hero
// cỡ 52 px chiếm gần hết bề ngang 375 px.
const SIZE: Record<ButtonSize, string> = {
  md: "",
  lg: "min-h-12 px-6 text-base tb:min-h-[52px] tb:px-8 tb:text-[17px]",
};

/**
 * Tên class cho nút — dùng chung với `LinkButton` để hai thứ trông giống hệt nhau.
 *
 * `full` phát `flex w-full` thay vì `inline-flex`: hai lớp display cùng tồn tại thì thứ tự
 * trong CSS sinh ra (không phải thứ tự trong chuỗi) quyết định, và `inline-flex` luôn thắng.
 */
export function btnClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", full = false, extra?: string): string {
  return cx(full ? "flex w-full" : "inline-flex", BASE, VARIANT[variant], SIZE[size], extra);
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

/** Liên kết trông như nút — cho "Chơi ngay" (/choi-game), "Nạp Xu"… vốn là liên kết thường. */
export function LinkButton({
  variant = "primary",
  size = "md",
  full = false,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "primary" | "ghost"; size?: ButtonSize; full?: boolean }) {
  return <a className={btnClass(variant, size, full, className)} {...rest} />;
}
