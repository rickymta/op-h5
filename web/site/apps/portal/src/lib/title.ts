import { useEffect } from "react";
import { useSite } from "./session";

/** Đặt `document.title`: "<trang> · <brand>"; trang chính chỉ có brand. */
export function useTitle(page?: string) {
  const site = useSite();
  const brand = site.data?.brand ?? "Cổng game";
  useEffect(() => {
    document.title = page ? `${page} · ${brand}` : brand;
  }, [page, brand]);
}
