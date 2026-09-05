import { LinkButton } from "@op/ui/publisher";
import { useMeta, useTitle } from "../queries";
import { PageHead } from "../parts";

export function NotFound() {
  const meta = useMeta();
  const name = meta.data?.name;
  useTitle(name ? `Không có trang này · ${name}` : "Không có trang này");
  return (
    <main className="pb-main">
      <PageHead eyebrow="404" title="Không có trang này" lead="Đường dẫn không tồn tại hoặc đã đổi. Về trang chủ để tiếp tục." />
      <div className="gm-actions" style={{ marginTop: 0 }}>
        <LinkButton href="/">Về trang chủ</LinkButton>
        <LinkButton variant="ghost" href="/choi-game">
          Chơi ngay
        </LinkButton>
      </div>
    </main>
  );
}
