import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { LinkButton, Msg, formatDate } from "@op/ui/publisher";
import { api, ApiError, errText, NEWS_KIND_LABEL, type NewsDetail } from "../api";
import { useTitle } from "../lib/title";

/** Một tin: tiêu đề, game, thời gian, ảnh (nếu có), thân tách đoạn theo dòng trống, link ngoài. */
export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["news", "one", id],
    queryFn: () => api.get<NewsDetail>(`/api/news/${encodeURIComponent(id ?? "")}`),
    enabled: !!id,
  });
  useTitle(q.data?.title ?? "Tin tức");

  const notFound = q.error instanceof ApiError && q.error.status === 404;

  return (
    <main className="pb-main pt-page">
      <p style={{ marginBottom: 16 }}><a href="/tin-tuc">← Tin tức</a></p>
      {q.isPending && <p className="pt-loading">Đang tải…</p>}
      {q.isError && (
        <div className="pt-stack">
          <Msg tone="err">{notFound ? "Tin này không tồn tại hoặc chưa được đăng." : errText(q.error)}</Msg>
          <LinkButton href="/tin-tuc" variant="ghost">Xem tin khác</LinkButton>
        </div>
      )}
      {q.isSuccess && (
        <article className="pt-article">
          <div className="pt-page__head">
            <h1>{q.data.title}</h1>
          </div>
          <p className="pt-article__meta">
            {q.data.game_name ? <><b>{q.data.game_name}</b> · </> : null}
            {NEWS_KIND_LABEL[q.data.kind] ?? q.data.kind} · {formatDate(q.data.published_at)}
          </p>
          {q.data.image_url && (
            <div className="pt-article__img"><img src={q.data.image_url} alt="" loading="lazy" /></div>
          )}
          {q.data.summary && !q.data.body && <p>{q.data.summary}</p>}
          {(q.data.body ?? "").split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
          {q.data.link_url && (
            <div className="pt-actions">
              <LinkButton href={q.data.link_url} target="_blank" rel="noopener">Xem chi tiết ↗</LinkButton>
            </div>
          )}
        </article>
      )}
    </main>
  );
}
