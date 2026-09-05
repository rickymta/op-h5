// Các truy vấn dùng chung giữa nhiều trang. Cùng `queryKey` thì TanStack gộp làm một —
// TopBar, trang chủ và cửa hàng cùng đọc `["me"]` mà chỉ gọi API một lần.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ApiError,
  api,
  type Me,
  type Meta,
  type NewsItem,
  type PackagesResponse,
  type PageDoc,
  type PkgDetail,
  type ServersResponse,
  type StoreStats,
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

/**
 * Danh sách nhóm gói (để đổ vào ô chọn và lấy "Gói nổi bật").
 *
 * Đây là lượt gọi **duy nhất** kéo cả bảng giá về; mọi lượt lọc/lật trang sau đó đi qua
 * `usePkgList` với khối `list` nhỏ. Trước đợt 3 thì mỗi lần đổi tab cũng phải giữ nguyên
 * 1.900 gói trong bộ nhớ và vẽ hết ra.
 */
export const useCategories = () =>
  useQuery({
    queryKey: ["cats"],
    queryFn: () => api.get<PackagesResponse>("/api/game/packages"),
    staleTime: 5 * 60_000,
  });

/** Bộ lọc của bảng gói. Giá trị rỗng nghĩa là "mọi nhóm" / "sắp xếp mặc định". */
export interface StoreQuery {
  q: string;
  cat: string;
  sort: string;
  page: number;
  pageSize: number;
}

/**
 * Một trang của bảng gói.
 *
 * Tham số `category` (khuôn cũ, số ít) được gửi kèm **có chủ ý**: nó quyết định khối
 * `categories` mà server đính vào phản hồi. Không gửi thì mỗi lần lật trang server lại
 * đính cả 1.900 gói (489 KB) mà trang không dùng tới — nhóm gói đã có từ `useCategories`.
 * Khối `categories` của phản hồi này vì thế bị bỏ qua.
 */
export const usePkgList = (sq: StoreQuery) =>
  useQuery({
    queryKey: ["pkgs", sq],
    queryFn: () => {
      const p = new URLSearchParams({
        q: sq.q,
        cat: sq.cat,
        sort: sq.sort,
        page: String(sq.page),
        page_size: String(sq.pageSize),
        category: sq.cat || "diamond",
      });
      return api.get<PackagesResponse>(`/api/game/packages?${p}`);
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev, // lật trang không nhấp nháy về khung rỗng
  });

/**
 * Tên và mô tả của **một** nhóm gói, cho trang chi tiết.
 *
 * Không dùng `useCategories` ở đó: người mở thẳng liên kết `/cua-hang/<id>` sẽ phải tải cả
 * bảng giá chỉ để biết chữ "Nguyên Bảo". Gửi `category` + `page_size=1` thì server chỉ đính
 * đúng một tab và một gói — vài trăm byte.
 */
export const useCategoryInfo = (key: string) =>
  useQuery({
    queryKey: ["cat", key],
    queryFn: () => {
      const k = encodeURIComponent(key);
      return api.get<PackagesResponse>(`/api/game/packages?category=${k}&cat=${k}&page_size=1`);
    },
    enabled: key !== "",
    staleTime: 5 * 60_000,
    select: (d: PackagesResponse) => d.categories?.[0] ?? null,
  });

export const usePackage = (id: string) =>
  useQuery({
    queryKey: ["pkg", id],
    queryFn: () => api.get<PkgDetail>(`/api/game/packages/${encodeURIComponent(id)}`),
    enabled: id !== "",
    staleTime: 60_000,
  });

export const useStoreStats = () =>
  useQuery({
    queryKey: ["store-stats"],
    queryFn: () => api.get<StoreStats>("/api/game/store/stats"),
    staleTime: 5 * 60_000,
  });

/**
 * Trang nội dung sửa được ở trang quản trị. Chưa có bản ghi (404) thì trả `null` chứ không
 * phải lỗi — trang tự dùng bản mặc định viết sẵn trong mã.
 */
export const usePage = (slug: string) =>
  useQuery({
    queryKey: ["page", slug],
    queryFn: () =>
      api.get<PageDoc>(`/api/game/pages/${slug}`).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
    staleTime: 5 * 60_000,
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
