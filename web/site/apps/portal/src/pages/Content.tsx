import { LinkButton, RichText, formatDate } from "@op/site-ui";
import { useSite } from "../lib/session";
import { useTitle } from "../lib/title";
import { usePageContent } from "../lib/content";
import { Actions, Loading, Main, PageHead } from "../lib/shell";

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
      <Main className="pt-5 tb:pt-8">
        <Loading />
      </Main>
    );
  }

  if (!content) {
    return (
      <Main className="pt-5 tb:pt-8">
        <PageHead title="Không có trang này" sub="Trang bạn tìm chưa được đăng hoặc đã đổi đường dẫn." />
        <Actions>
          <LinkButton href="/" size="lg">Về trang chủ</LinkButton>
          <LinkButton href="/ho-tro" variant="ghost" size="lg">Trang hỗ trợ</LinkButton>
        </Actions>
      </Main>
    );
  }

  return (
    <Main className="pt-5 tb:pt-8">
      <article className="max-w-[72ch]">
        <div className="mb-5">
          <h1 className="mb-1.5 text-[clamp(26px,4vw,36px)]">{content.title}</h1>
        </div>
        <RichText body={content.body} />
        {/* Trang Hỗ trợ: kênh liên hệ thật (nếu người vận hành đã đặt) nằm ngay dưới bài, để
            người đang cần giúp không phải đi tìm ở chân trang. */}
        {slug === "ho-tro" && (site.data?.support_url || site.data?.fanpage_url) ? (
          <Actions>
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
          </Actions>
        ) : null}
        {content.source === "db" && content.updated_at ? (
          <p className="mt-[26px] border-t border-line pt-3.5 text-[13px] text-fg-muted">
            Cập nhật {formatDate(content.updated_at)}
          </p>
        ) : null}
        {site.data?.legal_note ? (
          <p className="mt-[26px] border-t border-line pt-3.5 text-[13px] text-fg-muted">{site.data.legal_note}</p>
        ) : null}
      </article>
    </Main>
  );
}
