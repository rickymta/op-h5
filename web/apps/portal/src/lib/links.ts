import { useEffect } from "react";
import { useLocation } from "wouter";

/** Đường do Go phục vụ, không phải route SPA — để trình duyệt tự đi. */
const SERVER_PATHS = ["/api/", "/oauth/", "/cu/", "/internal/", "/.well-known/", "/healthz"];

/**
 * Các thành phần dùng chung (TopBar, Footer, NewsList, GameCard…) chỉ biết `<a href>`.
 * Thay vì bắt chúng học wouter, bắt click ở `document`: liên kết cùng gốc, bắt đầu bằng `/`,
 * không có target/download, không giữ phím bổ trợ → đổi route bằng pushState. Liên kết
 * tuyệt đối (trang game ở host khác, fanpage…) và đường của Go được để nguyên.
 */
export function useInternalLinks() {
  const [, navigate] = useLocation();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      if (SERVER_PATHS.some((p) => href.startsWith(p))) return;
      e.preventDefault();
      navigate(href);
      scrollForHash(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
}

/**
 * Có `#id` thì cuộn tới phần tử đó, không thì lên đầu. Đợi bằng setTimeout (không dùng
 * requestAnimationFrame: tab nền không chạy rAF) và thử lại vài lần vì route mới có thể chưa
 * kịp vẽ phần tử — ví dụ bấm "Game" khi đang ở trang tin.
 */
export function scrollForHash(href: string) {
  const i = href.indexOf("#");
  const id = i >= 0 ? decodeURIComponent(href.slice(i + 1)) : "";
  let tries = 0;
  const go = () => {
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ block: "start" });
    else if (id && tries++ < 10) setTimeout(go, 50);
    else window.scrollTo(0, 0);
  };
  setTimeout(go, 0);
}

/** Khi route đổi (kể cả nút Back), cuộn theo hash hiện tại hoặc lên đầu trang. */
export function useScrollOnRoute() {
  const [loc] = useLocation();
  useEffect(() => {
    scrollForHash(window.location.hash);
  }, [loc]);
}

/** `next` chỉ được là đường tương đối trong SPA; mọi thứ khác về `/tai-khoan`. */
export function safeNext(next: string | null | undefined, fallback = "/tai-khoan"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
