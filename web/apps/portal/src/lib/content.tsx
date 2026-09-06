// Dựng nội dung tĩnh: một khuôn văn bản thuần dùng chung cho bản mặc định trong mã
// (content/pages.ts) và bản người vận hành sửa trong DB (`GET /api/pages/{slug}`).
//
// Khuôn (hợp đồng đợt 3, mục 3.3): đoạn cách nhau bằng dòng trống, dòng mở đầu bằng `## ` là
// tiêu đề phụ, dòng mở đầu bằng `- ` là gạch đầu dòng.
//
// Cố ý KHÔNG dùng `dangerouslySetInnerHTML`: nội dung này do người vận hành nhập qua trang
// quản trị, nên nếu dựng bằng innerHTML thì một tài khoản quản trị bị chiếm sẽ chèn được mã
// vào trang công khai. Dựng bằng JSX thì React tự thoát mọi ký tự.
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, type PageDoc } from "../api";
import { DEFAULT_PAGES, type PageContent } from "../content/pages";

type Block = { t: "h"; text: string } | { t: "p"; text: string } | { t: "ul"; items: string[] };

/** Cắt thân văn bản thành khối. Dòng trắng đóng khối đang mở; dòng lạ coi như văn xuôi. */
export function parseBlocks(body: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push({ t: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push({ t: "ul", items: list });
      list = [];
    }
  };
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      out.push({ t: "h", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return out;
}

/**
 * Tô vàng những đoạn trong ngoặc vuông — chỗ người vận hành còn phải điền (pháp nhân, giấy
 * phép, giờ hỗ trợ). Nhìn một cái là biết trang đã hoàn chỉnh hay chưa, thay vì phải đọc kỹ.
 */
function withFills(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\[[^\]]*\])/g).filter(Boolean).map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span className="pt-fill" key={`${keyBase}-${i}`}>
        {part}
      </span>
    ) : (
      <span key={`${keyBase}-${i}`}>{part}</span>
    ),
  );
}

/** Dựng thân văn bản thuần thành đoạn, tiêu đề phụ và danh sách. */
export function RichText({ body }: { body: string }) {
  const blocks = parseBlocks(body);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "h") return <h2 key={i}>{b.text}</h2>;
        if (b.t === "ul")
          return (
            <ul className="pt-bullets" key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{withFills(it, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{withFills(b.text, String(i))}</p>;
      })}
    </>
  );
}

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
