import { Card, Empty, Msg, formatDate } from "@op/site-ui";
import { errText } from "../../api";
import { AccountHead, Loading } from "../../lib/shell";
import { GameRow, useMyGames } from "./parts";

/**
 * Nhân vật theo game. API chỉ trả tài khoản game (`game_identities`), không có tên nhân vật hay
 * máy chủ — nhân vật nằm trong DB của từng game; muốn xem thì vào game.
 */
export function Characters() {
  const games = useMyGames();

  return (
    <>
      <AccountHead
        title="Nhân vật"
        sub="Mỗi game một tài khoản game riêng, tạo tự động từ tài khoản này. Nhân vật nằm trong game."
      />

      <Card>
        {games.isPending && <Loading />}
        {games.isError && <Msg tone="err">{errText(games.error)}</Msg>}
        {games.isSuccess && games.data.games.length === 0 && (
          <Empty>
            Bạn chưa có nhân vật nào. <a href="/#game">Chọn một game</a>, bấm Chơi ngay rồi tạo nhân vật
            trong game — tài khoản game sẽ hiện ở đây.
          </Empty>
        )}
        {games.isSuccess &&
          games.data.games.map((g) => (
            <GameRow key={g.code} g={g} sub={`vào lần đầu ${formatDate(g.created_at).slice(0, 10)}`} />
          ))}
      </Card>
    </>
  );
}
