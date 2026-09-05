import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Empty, LinkButton, formatDate } from "@op/ui/publisher";
import { ApiError, api, type NewsDetail as NewsDetailT } from "../api";
import { useMeta, useTitle } from "../queries";
import { Loading, Paragraphs, QueryError } from "../parts";

const KIND_LABEL: Record<string, string> = { news: "Tin", event: "Sự kiện", notice: "Thông báo" };

/** Một tin: eyebrow (thể loại · game · ngày), tiêu đề, ảnh, tóm tắt, thân theo đoạn, liên kết ngoài nếu có. */
export function NewsDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const meta = useMeta();
  const q = useQuery({
    queryKey: ["news-item", id],
    queryFn: () => api.get<NewsDetailT>(`/api/game/news/${encodeURIComponent(id)}`),
    enabled: id !== "",
    staleTime: 5 * 60_000,
  });
  const [imgBad, setImgBad] = useState(false);
  const name = meta.data?.name;
  const n = q.data;
  useTitle(n && name ? `${n.title} · ${name}` : undefined);

  const notFound = q.isError && q.error instanceof ApiError && q.error.status === 404;

  return (
    <main className="pb-main">
      <article className="gm-article">
        {q.isPending ? (
          <Loading text="Đang đọc tin…" />
        ) : notFound ? (
          <Empty>Không có tin này — có thể đã gỡ hoặc chưa đăng.</Empty>
        ) : q.isError ? (
          <QueryError error={q.error} prefix="Chưa đọc được tin" />
        ) : n ? (
          <>
            <p className="pb-eyebrow">
              {[KIND_LABEL[n.kind] ?? n.kind, n.game_name || "Hệ thống", formatDate(n.published_at)].join(" · ")}
            </p>
            <h1>{n.title}</h1>
            {n.image_url && !imgBad ? (
              <img className="gm-article__img" src={n.image_url} alt="" onError={() => setImgBad(true)} />
            ) : null}
            {n.summary ? <p className="pb-lead">{n.summary}</p> : null}
            {n.body ? <Paragraphs text={n.body} /> : null}
            <div className="gm-article__foot">
              {n.link_url ? (
                <LinkButton variant="ghost" href={n.link_url}>
                  Xem chi tiết →
                </LinkButton>
              ) : null}
            </div>
          </>
        ) : null}
        <div className="gm-article__foot">
          <a href="/tin-tuc">← Tất cả tin</a>
        </div>
      </article>
    </main>
  );
}
