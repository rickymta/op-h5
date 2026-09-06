import { LinkButton } from "@op/site-ui";
import { useMeta, useTitle } from "../queries";
import { Actions, Main, PageHead } from "../parts";

export function NotFound() {
  const meta = useMeta();
  const name = meta.data?.name;
  useTitle(name ? `Không có trang này · ${name}` : "Không có trang này");
  return (
    <Main>
      <PageHead eyebrow="404" title="Không có trang này" lead="Đường dẫn không tồn tại hoặc đã đổi. Về trang chủ để tiếp tục." />
      <Actions tight>
        <LinkButton href="/">Về trang chủ</LinkButton>
        <LinkButton variant="ghost" href="/choi-game">
          Chơi ngay
        </LinkButton>
      </Actions>
    </Main>
  );
}
