import { useState } from "react";
import { Card, NewsList, cx } from "@op/site-ui";
import type { NewsKind } from "../api";
import { useMeta, useNews, useTitle } from "../queries";
import { Loading, Main, PageHead, QueryError } from "../parts";

const KINDS: { key: NewsKind | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "news", label: "Tin" },
  { key: "event", label: "Sự kiện" },
  { key: "notice", label: "Thông báo" },
];

/** Tin của game này + tin chung của nền tảng, lọc thể loại tại chỗ (API trả tối đa 50). */
export function News() {
  const meta = useMeta();
  const news = useNews(50);
  const [kind, setKind] = useState<NewsKind | "all">("all");
  const name = meta.data?.name;
  useTitle(name ? `Tin tức · ${name}` : undefined);

  const all = news.data?.news ?? [];
  const items = (kind === "all" ? all : all.filter((n) => n.kind === kind)).map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    image: n.image_url || undefined,
    href: `/tin-tuc/${n.slug || n.id}`, // bài cũ chưa có slug thì vẫn đi theo id
    published_at: n.published_at,
    kind: n.kind,
    game_name: n.game_name,
  }));

  return (
    <Main>
      <PageHead
        eyebrow="Tin tức"
        title="Tin tức & sự kiện"
        lead={name ? `Tin của ${name} và thông báo chung của hệ thống.` : undefined}
      />
      <div className="no-scrollbar mb-1 flex gap-1.5 overflow-x-auto pb-0.5 pt-1" role="tablist" aria-label="Thể loại tin">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="tab"
            aria-selected={k.key === kind}
            onClick={() => setKind(k.key)}
            className={cx(
              "min-h-touch shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
              k.key === kind
                ? "border-brand-500 bg-ink-850 text-fg"
                : "border-line bg-transparent text-fg-muted hover:border-fg-muted hover:text-fg",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Card>
          {news.isPending ? (
            <Loading text="Đang đọc tin…" />
          ) : news.isError ? (
            <QueryError error={news.error} prefix="Chưa đọc được tin" />
          ) : (
            <NewsList items={items} empty={kind === "all" ? "Chưa có tin nào." : "Chưa có tin thuộc thể loại này."} />
          )}
        </Card>
      </div>
    </Main>
  );
}
