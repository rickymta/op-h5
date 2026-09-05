import { LinkButton, formatDate } from "@op/ui/publisher";
import { useSite } from "../lib/session";
import { useTitle } from "../lib/title";
import { RichText, usePageContent } from "../lib/content";

/**
 * Một trang nội dung tĩnh: Giới thiệu, Hỗ trợ, Điều khoản, Chính sách.
 *
 * Nội dung lấy từ `/api/pages/{slug}` nếu người vận hành đã đăng bản của mình, không thì dùng
 * bản mặc định trong `content/pages.ts`. Cả hai đi qua cùng một hàm dựng nên nhìn giống nhau.
 * Trang chỉ hiện dòng "Cập nhật …" khi nội dung đến từ DB — bản trong mã không có ngày sửa
 * thật, in một ngày bịa ra còn tệ hơn là không in.
 */
export function ContentPage({ slug }: { slug: string }) {
  const site = useSite();
  const brand = site.data?.brand ?? "Cổng game";
  const { content, pending } = usePageContent(slug, brand);
  useTitle(content?.title ?? "Đang tải");

  if (pending) {
    return (
      <main className="pb-main pt-page">
        <p className="pt-loading">Đang tải…</p>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="pb-main pt-page">
        <div className="pt-page__head">
          <h1>Không có trang này</h1>
          <p className="pb-sub">Trang bạn tìm chưa được đăng hoặc đã đổi đường dẫn.</p>
        </div>
        <div className="pt-actions">
          <LinkButton href="/" size="lg">Về trang chủ</LinkButton>
          <LinkButton href="/ho-tro" variant="ghost" size="lg">Trang hỗ trợ</LinkButton>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-main pt-page">
      <article className="pt-static">
        <div className="pt-page__head">
          <h1>{content.title}</h1>
        </div>
        <RichText body={content.body} />
        {/* Trang Hỗ trợ: kênh liên hệ thật (nếu người vận hành đã đặt) nằm ngay dưới bài, để
            người đang cần giúp không phải đi tìm ở chân trang. */}
        {slug === "ho-tro" && (site.data?.support_url || site.data?.fanpage_url) ? (
          <div className="pt-actions">
            {site.data?.support_url ? (
              <LinkButton href={site.data.support_url} size="lg" target="_blank" rel="noopener">
                Liên hệ hỗ trợ ↗
              </LinkButton>
            ) : null}
            {site.data?.fanpage_url ? (
              <LinkButton href={site.data.fanpage_url} variant="ghost" size="lg" target="_blank" rel="noopener">
                Fanpage ↗
              </LinkButton>
            ) : null}
          </div>
        ) : null}
        {content.source === "db" && content.updated_at ? (
          <p className="pt-static__at">Cập nhật {formatDate(content.updated_at)}</p>
        ) : null}
        {site.data?.legal_note ? <p className="pt-static__at">{site.data.legal_note}</p> : null}
      </article>
    </main>
  );
}
