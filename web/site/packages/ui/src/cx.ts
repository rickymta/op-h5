/** Ghép tên class, bỏ giá trị rỗng/false. Đủ dùng, không cần thư viện. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
