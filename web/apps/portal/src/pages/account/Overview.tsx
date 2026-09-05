import { Card, Empty, LinkButton, Msg, Section, formatDate, timeAgo } from "@op/ui/publisher";
import { errText } from "../../api";
import { useBalance, useMe, useSite } from "../../lib/session";
import { BalanceBig, GameRow, useMyGames } from "./parts";

/** Tổng quan: số dư + [Nạp Xu], game của bạn (mỗi dòng có Vào game), thông báo hệ thống. */
export function Overview() {
  const me = useMe();
  const site = useSite();
  const bal = useBalance(true);
  const games = useMyGames();
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
        {bal.isError ? (
          <Msg tone="err">{errText(bal.error)}</Msg>
        ) : (
          <BalanceBig balance={bal.data?.balance} action={<LinkButton href="/tai-khoan/vi" size="lg">Nạp Xu</LinkButton>} />
        )}
      </Card>

      {site.data?.notice && (
        <Msg tone="warn">
          <b>Thông báo:</b> {site.data.notice.title}{" "}
          <a href={site.data.notice.link_url || `/tin-tuc/${site.data.notice.id}`}>Xem →</a>
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
    </>
  );
}
