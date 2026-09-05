import { Empty } from "./Empty";
import { timeAgo } from "./format";

export type NewsItem = {
  id: number | string;
  title: string;
  summary?: string;
  image?: string;
  href?: string;
  published_at: string;
  kind?: string;
  game_name?: string;
};

const KIND_LABEL: Record<string, string> = { news: "Tin", event: "Sự kiện", notice: "Thông báo" };

/** Dòng phụ: "Sự kiện · Đại Hải Trình · 3 ngày trước" — bỏ phần nào thiếu. */
function subline(it: NewsItem, now: Date) {
  const parts: string[] = [];
  const kind = it.kind ? (KIND_LABEL[it.kind] ?? it.kind) : "";
  if (kind && it.kind !== "news") parts.push(kind);
  if (it.game_name) parts.push(it.game_name);
  else if (!parts.length && kind) parts.push(kind);
  parts.push(timeAgo(it.published_at, now));
  return parts.filter(Boolean).join(" · ");
}

/**
 * Danh sách tin: ảnh nhỏ 72×72 (thiếu thì ô màu `--surface-2`), tiêu đề tối đa 2 dòng, dòng phụ
 * thể loại/tên game · "x ngày trước". Không có `href` thì dòng không bấm được.
 */
export function NewsList({ items, empty }: { items: NewsItem[]; empty?: string }) {
  if (!items.length) return <Empty>{empty ?? "Chưa có tin nào."}</Empty>;
  const now = new Date();
  return (
    <ul className="pb-news">
      {items.map((it) => {
        const body = (
          <>
            <div className="pb-news__thumb" aria-hidden="true">
              {it.image ? <img src={it.image} alt="" loading="lazy" /> : null}
            </div>
            <div>
              <div className="pb-news__title">{it.title}</div>
              {it.summary ? <div className="pb-news__sum">{it.summary}</div> : null}
              <div className="pb-news__sub">{subline(it, now)}</div>
            </div>
          </>
        );
        return (
          <li key={it.id}>
            {it.href ? (
              <a className="pb-news__item" href={it.href}>
                {body}
              </a>
            ) : (
              <div className="pb-news__item">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
