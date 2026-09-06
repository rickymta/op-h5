import { useEffect } from "react";
import { useLocation } from "wouter";
import { navigate } from "wouter/use-browser-location";

/**
 * App này được Go phục vụ dưới tiền tố `/cho` (`id` :8080, hợp đồng mục 2), và `vite.config.ts`
 * đặt `base: "/cho/"`. Có hai hệ toạ độ:
 *
 * - **Route** (`<Router base={BASE}>`, `<Route path="/tin/:id">`) — không mang tiền tố.
 * - **`href` trong HTML** — phải mang tiền tố, vì thẻ `<a>` là đường thật của trình duyệt
 *   (mở tab mới, chuột giữa, bot đọc trang). Dùng `to()` để dựng, đừng gõ tay "/cho/…".
 */
export const BASE = "/cho";

/** `/tin/M-2481` → `/cho/tin/M-2481`. Nhận đường route, trả đường trình duyệt. */
export function to(path: string): string {
  return path === "/" ? BASE + "/" : BASE + path;
}

/** Nhãn dùng chung cho mọi nút thao tác tiền đang bị khoá. */
export const NOT_OPEN = "Chợ đang chuẩn bị, chưa mở giao dịch";

/**
 * Thành phần dùng chung (TopBar, Footer, Breadcrumb…) chỉ biết `<a href>`, một cú bấm là tải
 * lại cả bundle. Bắt click ở `document` rồi chuyển route bằng pushState: liên kết cùng gốc,
 * bắt đầu bằng tiền tố của app, không target/download, không giữ phím bổ trợ.
 *
 * Dùng `navigate` của `use-browser-location` (không qua base) vì `href` đã là đường đầy đủ;
 * `navigate` lấy từ `useLocation()` trong `<Router base>` sẽ ghép thêm `/cho` lần thứ hai.
 */
export function useInternalLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (href !== BASE && !href.startsWith(BASE + "/")) return;
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}

/** Đổi route (kể cả nút Back) thì lên đầu trang — nếu không, trang mới mở ở giữa chừng. */
export function useScrollOnRoute() {
  const [loc] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc]);
}

/** `document.title` = "<trang> · Chợ Xu"; trang chính chỉ có "Chợ Xu". */
export function useTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · Chợ Xu` : "Chợ Xu";
  }, [page]);
}
