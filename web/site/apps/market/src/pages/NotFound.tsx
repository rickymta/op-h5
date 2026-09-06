import { Empty, LinkButton, Section } from "@op/site-ui";
import { to, useTitle } from "../lib/nav";

export function NotFound() {
  useTitle("Không tìm thấy trang");
  return (
    <main className="site-main">
      <Section eyebrow="404" title="Không tìm thấy trang">
        <Empty>
          <p className="m-0">Đường dẫn này không có trong chợ. Có thể tin rao đã bị gỡ, hoặc địa chỉ bị gõ sai.</p>
          <p className="m-0 mt-4 flex flex-wrap justify-center gap-2">
            <LinkButton href={to("/")}>Về bảng tin rao</LinkButton>
            <LinkButton href={to("/dang-ban")} variant="ghost">
              Xem thử đăng bán
            </LinkButton>
          </p>
        </Empty>
      </Section>
    </main>
  );
}
