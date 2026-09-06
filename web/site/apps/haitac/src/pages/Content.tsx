import { LinkButton, RichText } from "@op/site-ui";
import { usePage, useMeta, useTitle } from "../queries";
import { Actions, Loading, Main, PageHead, QueryError } from "../parts";
import { PAGE_FAQ, PAGE_GIOI_THIEU, PAGE_HUONG_DAN, type DefaultPage } from "../content";

/**
 * Ba trang nội dung của game. Bản trong DB (`/api/game/pages/{slug}`) thắng bản mặc định viết
 * trong mã: người vận hành sửa ở trang quản trị là trang đổi ngay, không cần build lại.
 *
 * Chưa có bản ghi thì `usePage` trả `null` (404 không phải lỗi) và ta dùng bản mặc định — nên
 * trang không bao giờ trắng. Chỉ khi API hỏng thật (5xx, mất mạng) mới hiện lời báo lỗi, và
 * vẫn kèm nội dung mặc định phía dưới để người đọc không ra về tay không.
 */
function ContentPage({ slug, fallback, eyebrow }: { slug: string; fallback: DefaultPage; eyebrow: string }) {
  const meta = useMeta();
  const page = usePage(slug);
  const doc = page.data ?? null;
  const title = doc?.title || fallback.title;
  const name = meta.data?.name;
  useTitle(name ? `${title} · ${name}` : title);

  return (
    <Main>
      <PageHead eyebrow={eyebrow} title={title} />
      {page.isPending ? (
        <Loading text="Đang đọc nội dung…" />
      ) : (
        <>
          {page.isError ? <QueryError error={page.error} prefix="Không đọc được bản mới nhất" /> : null}
          <div className="max-w-[72ch]">
            <RichText body={doc?.body || fallback.body} />
          </div>
        </>
      )}
      <Actions>
        <LinkButton href="/choi-game">Chơi ngay</LinkButton>
        <LinkButton variant="ghost" href="/cua-hang">
          Cửa hàng
        </LinkButton>
      </Actions>
    </Main>
  );
}

export const About = () => <ContentPage slug="gioi-thieu" fallback={PAGE_GIOI_THIEU} eyebrow="Giới thiệu" />;
export const Guide = () => <ContentPage slug="huong-dan" fallback={PAGE_HUONG_DAN} eyebrow="Người mới" />;
export const Faq = () => <ContentPage slug="faq" fallback={PAGE_FAQ} eyebrow="Hỏi đáp" />;
