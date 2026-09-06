import { Card, Empty, LinkButton, Msg, Section, formatDate, timeAgo } from "@op/ui/publisher";
import { errText } from "../../api";
import { useBalance, useMe, useSite } from "../../lib/session";
import { BalanceBig, GameRow, OrdersTable, useMyGames, useMyOrders } from "./parts";

/** Tổng quan: số dư + [Nạp Xu], game của bạn (mỗi dòng có Vào game), thông báo hệ thống. */
export function Overview() {
  const me = useMe();
  const site = useSite();
  const bal = useBalance(true);
  const games = useMyGames();
  const orders = useMyOrders(5);
  const u = me.data!;

  return (
    <>
      <div className="pt-account__head">
        <h1>Xin chào, {u.username}</h1>
        <p className="pb-sub">
          Tham gia {formatDate(u.created_at).slice(0, 10)}
          {u.last_login_at ? ` · đăng nhập gần nhất ${timeAgo(u.last_login_at)}` : ""}
        </p>
      </div>

      <Card pad="lg">
        {/* Đọc hỏng thì BalanceBig hiện "—" và nói rõ vì sao, KHÔNG hiện 0 (lỗi V2, QA đợt 3). */}
        <BalanceBig
          balance={bal.data?.balance}
          failed={bal.isError}
          action={<LinkButton href="/tai-khoan/vi" size="lg">Nạp Xu</LinkButton>}
        />
      </Card>

      {site.data?.notice && (
        <Msg tone="warn">
          <b>Thông báo:</b> {site.data.notice.title}{" "}
          <a href={site.data.notice.link_url || `/tin-tuc/${site.data.notice.slug || site.data.notice.id}`}>Xem →</a>
        </Msg>
      )}

      <Section title="Game của bạn" sub="Tài khoản game được tạo tự động lần đầu bạn bấm Chơi ngay."
               action={<a href="/tai-khoan/nhan-vat">Nhân vật →</a>}>
        <Card>
          {games.isPending && <p className="pt-loading">Đang tải…</p>}
          {games.isError && <Msg tone="err">{errText(games.error)}</Msg>}
          {games.isSuccess && games.data.games.length === 0 && (
            <Empty>
              Bạn chưa vào game nào. <a href="/#game">Chọn một game</a> và bấm Chơi ngay — tài khoản game sẽ tự tạo.
            </Empty>
          )}
          {games.isSuccess && games.data.games.map((g) => (
            <GameRow key={g.code} g={g} sub={g.last_order_at ? `mua gần nhất ${timeAgo(g.last_order_at)}` : undefined} />
          ))}
        </Card>
      </Section>

      {/* Đơn mua gói ở MỌI game — người chơi nhiều game không phải mở từng trang game để xem
          đơn của mình đã phát chưa. Chi tiết tiền nong nằm ở Lịch sử nên chỉ liệt kê 5 đơn. */}
      <Section title="Đơn gần đây" sub="Năm lần mua gói gần nhất ở tất cả các game."
               action={<a href="/tai-khoan/lich-su">Lịch sử ví →</a>}>
        <Card>
          {orders.isError ? (
            <Msg tone="err">{errText(orders.error)}</Msg>
          ) : (
            <OrdersTable orders={orders.data?.orders ?? []} loading={orders.isPending} />
          )}
        </Card>
      </Section>
    </>
  );
}
