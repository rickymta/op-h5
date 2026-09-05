import { useQuery } from "@tanstack/react-query";
import { Card, LinkButton, Msg, Section } from "@op/ui/publisher";
import { api, errText, type GamesResponse, type HistoryResponse } from "../../api";
import { useBalance, useSite } from "../../lib/session";
import { BalanceBig, HistoryTable } from "./parts";

/**
 * Ví & nạp Xu. Cổng nạp Go chưa có (giai đoạn 5): `site.topup_url` rỗng thì hướng dẫn nạp qua
 * trang game; có thì nút Nạp Xu ra ngoài. Khối cảnh báo lừa đảo là cố định (khảo sát Garena/VTC).
 */
export function Wallet() {
  const site = useSite();
  const bal = useBalance(true);
  const recent = useQuery({
    queryKey: ["history", "recent"],
    queryFn: () => api.get<HistoryResponse>("/api/wallet/history?page=1&page_size=5"),
  });
  // Không có cổng nạp thì trỏ sang trang của game nổi bật (nơi còn cổng nạp PHP).
  const games = useQuery({
    queryKey: ["games"],
    queryFn: () => api.get<GamesResponse>("/api/games"),
    staleTime: 30_000,
    enabled: site.isSuccess && !site.data.topup_url,
  });
  const topup = site.data?.topup_url ?? "";
  const gameSite = games.data?.games.find((g) => g.code === games.data.featured)?.site_url ?? games.data?.games[0]?.site_url;

  return (
    <>
      <div className="pt-account__head">
        <h1>Ví & nạp Xu</h1>
        <p className="pb-sub">Xu dùng chung cho mọi game. Đổi vật phẩm ngay trong cửa hàng của từng game.</p>
      </div>

      <Card pad="lg">
        {bal.isError ? (
          <Msg tone="err">{errText(bal.error)}</Msg>
        ) : (
          <BalanceBig
            balance={bal.data?.balance}
            action={topup ? <LinkButton href={topup} size="lg" target="_blank" rel="noopener">Nạp Xu ↗</LinkButton> : undefined}
          />
        )}
        {site.isSuccess && !topup && (
          <Msg tone="warn">
            Cổng nạp Xu đang được chuyển sang hệ thống mới, tạm thời nạp qua trang game.{" "}
            {gameSite ? <a href={gameSite}>Mở trang game →</a> : <a href="/#game">Chọn game →</a>}
          </Msg>
        )}
      </Card>

      <Msg tone="warn">
        <b>Giữ an toàn:</b> Chỉ nạp qua đường chính thức trên tên miền này. Không đưa mật khẩu hay mã OTP
        cho bất kỳ ai, kể cả người tự nhận là nhân viên.
      </Msg>

      <Section title="Giao dịch gần đây" action={<a href="/tai-khoan/lich-su">Xem tất cả →</a>}>
        <Card>
          {recent.isPending && <p className="pt-loading">Đang tải…</p>}
          {recent.isError && <Msg tone="err">{errText(recent.error)}</Msg>}
          {recent.isSuccess && <HistoryTable items={recent.data.items.slice(0, 5)} />}
        </Card>
      </Section>
    </>
  );
}
