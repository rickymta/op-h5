import { Empty, LinkButton } from "@op/ui/publisher";
import { useTitle } from "../lib/title";

export function NotFound() {
  useTitle("Không có trang này");
  return (
    <main className="pb-main pt-page">
      <div className="pt-page__head">
        <h1>Không có trang này</h1>
        <p className="pb-sub">Đường dẫn có thể đã đổi hoặc gõ sai.</p>
      </div>
      <Empty>Trang bạn tìm không tồn tại.</Empty>
      <div className="pt-actions">
        <LinkButton href="/" size="lg">Về trang chủ</LinkButton>
        <LinkButton href="/tin-tuc" variant="ghost" size="lg">Xem tin tức</LinkButton>
      </div>
    </main>
  );
}
