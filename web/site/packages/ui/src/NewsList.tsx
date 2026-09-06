import { Empty } from "./Msg";
import { timeAgo } from "./format";

export type NewsItem = {
  id: number | string;
  slug?: string;
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

const ITEM =
  "grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 border-b border-line py-3 text-fg no-underline hover:no-underline";

/**
 * Danh sách tin: ảnh nhỏ 72×72 (thiếu thì ô màu `ink-800`), tiêu đề tối đa 2 dòng, dòng phụ
 * thể loại/tên game · "x ngày trước". Không có `href` thì dòng không bấm được.
 */
export function NewsList({ items, empty }: { items: NewsItem[]; empty?: string }) {
  if (!items.length) return <Empty>{empty ?? "Chưa có tin nào."}</Empty>;
  const now = new Date();
  return (
    <ul className="m-0 list-none p-0">
      {items.map((it) => {
        const body = (
          <>
            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-ink-800" aria-hidden="true">
              {it.image ? <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="line-clamp-2 text-[15px] font-semibold leading-snug transition-colors duration-150 group-hover/news:text-gold-400">
                {it.title}
              </div>
              {it.summary ? <div className="mt-0.5 line-clamp-1 text-[13px] text-fg-muted">{it.summary}</div> : null}
              <div className="mt-1 font-mono text-[12.5px] text-fg-muted">{subline(it, now)}</div>
            </div>
          </>
        );
        return (
          // Dòng cuối bỏ gạch dưới: gạch nằm trên con của <li>, nên nhắm bằng bộ chọn con.
          <li key={it.id} className="[&:last-child>*]:border-b-0">
            {it.href ? (
              <a className={`group/news ${ITEM}`} href={it.href}>
                {body}
              </a>
            ) : (
              <div className={ITEM}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
