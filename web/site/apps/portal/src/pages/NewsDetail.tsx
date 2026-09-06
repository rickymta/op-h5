import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { LinkButton, Msg, RichText, formatDate } from "@op/site-ui";
import { api, ApiError, errText, NEWS_KIND_LABEL, type NewsDetail } from "../api";
import { useTitle } from "../lib/title";
import { Actions, Loading, Main } from "../lib/shell";

/**
 * Một tin: tiêu đề, game, thời gian, ảnh (nếu có), thân tách đoạn theo dòng trống, link ngoài.
 *
 * `:key` là slug hoặc id — API nhận cả hai, nên mọi liên kết `/tin-tuc/12` gửi đi trước đây vẫn
 * mở đúng bài. Vào bằng id mà bài có slug thì API trả `canonical_slug` và ta thay đường dẫn tại
 * chỗ (replace, không push) để người đọc chép được một URL đọc được và nút Quay lại không kẹt.
 */
export function NewsDetailPage() {
  const { key } = useParams<{ key: string }>();
  const [, navigate] = useLocation();
  const q = useQuery({
    queryKey: ["news", "one", key],
    queryFn: () => api.get<NewsDetail>(`/api/news/${encodeURIComponent(key ?? "")}`),
    enabled: !!key,
  });
  useTitle(q.data?.title ?? "Tin tức");

  const canonical = q.data?.canonical_slug;
  useEffect(() => {
    if (canonical && canonical !== key) navigate(`/tin-tuc/${canonical}`, { replace: true });
  }, [canonical, key, navigate]);

  const notFound = q.error instanceof ApiError && q.error.status === 404;

  return (
    <Main className="pt-5 tb:pt-8">
      <p className="mb-4">
        <a href="/tin-tuc">← Tin tức</a>
      </p>
      {q.isPending && <Loading />}
      {q.isError && (
        <div className="[&>*+*]:mt-4">
          <Msg tone="err">{notFound ? "Tin này không tồn tại hoặc chưa được đăng." : errText(q.error)}</Msg>
          <LinkButton href="/tin-tuc" variant="ghost">Xem tin khác</LinkButton>
        </div>
      )}
      {q.isSuccess && (
        <article className="max-w-[72ch] [&_p]:text-base [&_p]:leading-[1.65]">
          <div className="mb-5">
            <h1 className="mb-1.5 text-[clamp(26px,4vw,36px)]">{q.data.title}</h1>
          </div>
          <p className="mb-[18px] font-mono text-[13.5px] text-fg-muted">
            {q.data.game_name ? (
              <>
                <b className="font-medium text-gold-400">{q.data.game_name}</b> ·{" "}
              </>
            ) : null}
            {NEWS_KIND_LABEL[q.data.kind] ?? q.data.kind} · {formatDate(q.data.published_at)}
          </p>
          {q.data.image_url && (
            <div className="mb-5 overflow-hidden rounded-xl bg-ink-800">
              <img src={q.data.image_url} alt="" loading="lazy" />
            </div>
          )}
          {q.data.summary && !q.data.body && <p>{q.data.summary}</p>}
          {q.data.body ? <RichText body={q.data.body} /> : null}
          {q.data.link_url && (
            <Actions>
              <LinkButton href={q.data.link_url} target="_blank" rel="noopener">Xem chi tiết ↗</LinkButton>
            </Actions>
          )}
        </article>
      )}
    </Main>
  );
}
