import { useQuery } from "@tanstack/react-query";
import { Button, Card, LinkButton, Msg, Section, StatCard, formatDate, formatInt } from "@op/site-ui";
import { api, errText, type GamesResponse, type HistoryResponse } from "../../api";
import { useBalance, useSite } from "../../lib/session";
import { AccountHead } from "../../lib/shell";
import { BalanceBig, HistoryTable, useWalletSummary, withKeys } from "./parts";

/**
 * Ví & nạp Xu — bố cục theo mockup người vận hành gửi (hợp đồng đợt 3, mục 5.2):
 * số dư to + nút nạp đỏ → bốn ô thống kê → cảnh báo lừa đảo → 5 giao dịch gần nhất.
 *
 * Cổng nạp Go chưa có (giai đoạn 5). `site.topup_url` rỗng thì nút Nạp Xu **tắt** kèm một câu
 * nói vì sao và chỉ đường sang trang nạp của game — dựng một nút bấm vào không đi đâu còn tệ
 * hơn là không có nút.
 */
export function Wallet() {
  const site = useSite();
  const bal = useBalance(true);
  const sum = useWalletSummary();
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

  // Số dư đọc được ở một trong hai nguồn là đủ; hỏng cả hai mới là "chưa đọc được".
  const balance = bal.data?.balance ?? sum.data?.balance;
  const balFailed = balance === undefined && (bal.isError || sum.isError);
  const s = sum.data;

  return (
    <>
      <AccountHead
        title="Ví & nạp Xu"
        sub={
          <>
            Xu dùng chung cho mọi game. Đổi vật phẩm ngay trong cửa hàng của từng game.
            {s?.since ? ` Ví mở từ ${formatDate(s.since).slice(0, 10)}.` : ""}
          </>
        }
      />

      <Card pad="lg">
        <BalanceBig
          balance={balance}
          failed={balFailed}
          action={
            topup ? (
              <LinkButton href={topup} size="lg" target="_blank" rel="noopener">Nạp Xu ↗</LinkButton>
            ) : (
              <Button type="button" size="lg" disabled>Nạp Xu — chưa mở</Button>
            )
          }
        />
        {site.isSuccess && !topup && (
          <Msg tone="warn">
            Cổng nạp Xu đang được chuyển sang hệ thống mới nên nút Nạp Xu ở đây chưa dùng được. Tạm thời
            nạp qua trang game, Xu vẫn về đúng ví này.{" "}
            {gameSite ? <a href={gameSite}>Mở trang game →</a> : <a href="/#game">Chọn game →</a>}
          </Msg>
        )}
      </Card>

      {/* Bốn ô thống kê: ở điện thoại xếp 2×2 thay vì một hàng bốn ô bóp nhỏ. */}
      <div className="site-stat-grid">
        <StatCard
          label="Tổng đã nạp"
          value={s ? formatInt(s.topup_total) : sum.isError ? "—" : "…"}
          tone="gold"
          hint="Xu đã vào ví từ trước đến nay"
        />
        <StatCard
          label="Đã quy đổi"
          value={s ? formatInt(s.convert_total) : sum.isError ? "—" : "…"}
          hint={s && s.refunded_total > 0 ? `đã hoàn lại ${formatInt(s.refunded_total)} Xu` : "Xu đã đổi lấy vật phẩm"}
        />
        <StatCard
          label="Đơn thành công"
          value={s ? formatInt(s.orders_granted) : sum.isError ? "—" : "…"}
          tone="ok"
          hint={s ? `trên tổng ${formatInt(s.orders_total)} đơn` : undefined}
        />
        <StatCard
          label="Đang chờ"
          value={s ? formatInt(s.orders_pending) : sum.isError ? "—" : "…"}
          tone={s && s.orders_pending > 0 ? "warn" : "default"}
          hint="đơn đang đợi máy chủ game phát hàng"
        />
      </div>
      {sum.isError && <Msg tone="err">Chưa đọc được số liệu ví: {errText(sum.error)}</Msg>}

      <Msg tone="warn">
        <b>Giữ an toàn:</b> Chỉ nạp qua đường chính thức trên tên miền này. Không đưa mật khẩu hay mã OTP
        cho bất kỳ ai, kể cả người tự nhận là nhân viên.
      </Msg>

      <Section title="Giao dịch gần đây" action={<a href="/tai-khoan/lich-su">Xem tất cả →</a>}>
        <Card>
          {recent.isError ? (
            <Msg tone="err">{errText(recent.error)}</Msg>
          ) : (
            <HistoryTable rows={withKeys(recent.data?.items.slice(0, 5) ?? [], "r")} loading={recent.isPending} />
          )}
        </Card>
      </Section>
    </>
  );
}
