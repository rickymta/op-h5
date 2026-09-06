// Nội dung tĩnh: bản người vận hành sửa trong DB (`GET /api/pages/{slug}`) đè lên bản mặc định
// trong mã (`content/pages.ts`). Cả hai dùng chung một khuôn văn bản thuần (hợp đồng đợt 3,
// mục 3.3) nên `RichText` của @op/site-ui dựng được cả hai — kể cả việc tô vàng những đoạn
// trong ngoặc vuông, tức chỗ người vận hành còn phải điền.
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type PageDoc } from "../api";
import { DEFAULT_PAGES, type PageContent } from "../content/pages";

/**
 * Nội dung một trang tĩnh. Ưu tiên bản trong DB; không có bản ghi (404) hoặc API hỏng thì lùi
 * về bản mặc định trong mã — trang nội dung không đáng để hiện lỗi đỏ khi ta luôn có sẵn chữ
 * để đọc. `null` nghĩa là slug không có cả trong DB lẫn trong mã → trang 404 mềm.
 */
export function usePageContent(slug: string, brand: string) {
  const q = useQuery({
    queryKey: ["page", slug],
    queryFn: async (): Promise<PageDoc | null> => {
      try {
        return await api.get<PageDoc>(`/api/pages/${encodeURIComponent(slug)}`);
      } catch (e) {
        if (e instanceof ApiError) return null; // 404 hoặc lỗi máy chủ — dùng bản mặc định
        throw e;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  const fallback: PageContent | undefined = DEFAULT_PAGES[slug];
  const doc = q.data ?? null;
  const content: (PageContent & { updated_at?: string; source: "db" | "code" }) | null =
    doc && doc.body.trim()
      ? {
          title: doc.title || fallback?.title || slug,
          body: doc.body.replaceAll("{brand}", brand),
          updated_at: doc.updated_at,
          source: "db",
        }
      : fallback
        ? { ...fallback, body: fallback.body.replaceAll("{brand}", brand), source: "code" }
        : null;

  return { content, pending: q.isPending };
}
