// Các truy vấn dùng chung giữa nhiều trang. Cùng `queryKey` thì TanStack gộp làm một —
// TopBar, trang chủ và cửa hàng cùng đọc `["me"]` mà chỉ gọi API một lần.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  api,
  type Me,
  type Meta,
  type NewsItem,
  type PackagesResponse,
  type ServersResponse,
} from "./api";

export const useMeta = () =>
  useQuery({ queryKey: ["meta"], queryFn: () => api.get<Meta>("/api/game/meta"), staleTime: 5 * 60_000 });

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/game/me"), staleTime: 60_000 });

/** Danh sách máy chủ tự làm mới 30 s khi đang có trang hiển thị nó. */
export const useServers = () =>
  useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get<ServersResponse>("/api/game/servers"),
    refetchInterval: 30_000,
  });

export const usePackages = () =>
  useQuery({
    queryKey: ["packages"],
    queryFn: () => api.get<PackagesResponse>("/api/game/packages"),
    staleTime: 60_000,
  });

export const useNews = (limit: number) =>
  useQuery({
    queryKey: ["news", limit],
    queryFn: () => api.get<{ news: NewsItem[] }>(`/api/game/news?limit=${limit}`),
    staleTime: 60_000,
  });

/** Mỗi route đặt tiêu đề tab; chưa có tên game thì giữ tiêu đề cũ thay vì in " · ". */
export function useTitle(title?: string) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}

/**
 * Ảnh thương hiệu (`/assets/images/...`) có thể thiếu — trên dev không có, trên host thật thì
 * nginx phục vụ từ thư mục client. Trả URL cho tới khi biết chắc ảnh hỏng, rồi trả `undefined`
 * để Hero/TopBar lui về bố cục không ảnh thay vì hiện biểu tượng ảnh vỡ.
 */
export function useImg(url?: string): string | undefined {
  const [bad, setBad] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const im = new Image();
    im.onerror = () => {
      if (alive) setBad(url);
    };
    im.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return url && bad !== url ? url : undefined;
}
