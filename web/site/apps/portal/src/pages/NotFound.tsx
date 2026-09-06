import { Empty, LinkButton } from "@op/site-ui";
import { useTitle } from "../lib/title";
import { Actions, Main, PageHead } from "../lib/shell";

export function NotFound() {
  useTitle("Không có trang này");
  return (
    <Main className="pt-5 tb:pt-8">
      <PageHead title="Không có trang này" sub="Đường dẫn có thể đã đổi hoặc gõ sai." />
      <Empty>Trang bạn tìm không tồn tại.</Empty>
      <Actions>
        <LinkButton href="/" size="lg">Về trang chủ</LinkButton>
        <LinkButton href="/tin-tuc" variant="ghost" size="lg">Xem tin tức</LinkButton>
      </Actions>
    </Main>
  );
}
