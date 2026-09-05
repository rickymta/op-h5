import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LinkButton, formatDate, formatInt, timeAgo } from "@op/ui/publisher";
import { api, HISTORY_KIND_LABEL, type HistoryItem, type MyGame } from "../../api";

/** Danh sách game người này đã vào (từ `game_identities`). Dùng ở Tổng quan và Nhân vật. */
export function useMyGames() {
  return useQuery({ queryKey: ["myGames"], queryFn: () => api.get<{ games: MyGame[] }>("/api/me/games") });
}

/** Số dư to màu brass. */
export function BalanceBig({ balance, action }: { balance?: number; action?: ReactNode }) {
  return (
    <div className="pt-balance">
      <div>
        <div className="pt-balance__k">Số dư</div>
        <div className="pt-balance__v">
          {balance === undefined ? "…" : formatInt(balance)}<small>XU</small>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Một dòng game: logo · tên / tài khoản game · [Vào game] (liên kết thường, sang host của game). */
export function GameRow({ g, sub }: { g: MyGame; sub?: string }) {
  return (
    <div className="pt-gamerow">
      <div className="pt-gamerow__logo" aria-hidden="true">
        {g.logo_url ? <img src={g.logo_url} alt="" loading="lazy" /> : (g.name || "?").charAt(0).toUpperCase()}
      </div>
      <div className="pt-gamerow__main">
        <div className="pt-gamerow__name">{g.name}</div>
        <div className="pt-gamerow__sub" title={g.game_username}>
          {g.game_username}{sub ? ` · ${sub}` : ""}
        </div>
      </div>
      <LinkButton href={g.play_url} variant="ghost">Vào game</LinkButton>
    </div>
  );
}

/**
 * Bảng giao dịch: ngày / loại / nội dung / số Xu (+ xanh, − đỏ). Dưới 560 px mỗi dòng xếp
 * chồng (CSS `.pt-hist`) để số Xu luôn nhìn thấy, không phải cuộn ngang.
 */
export function HistoryTable({ items, keyPrefix = "" }: { items: HistoryItem[]; keyPrefix?: string }) {
  const now = new Date();
  return (
    <div className="pt-scroll">
      <table className="pt-table pt-hist">
        <thead>
          <tr><th>Lúc</th><th>Loại</th><th>Nội dung</th><th className="amt">Số Xu</th></tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={`${keyPrefix}${it.txn}-${i}`}>
              <td className="num when" title={formatDate(it.at)}>{timeAgo(it.at, now)}</td>
              <td className="kind"><span className="pt-tag">{HISTORY_KIND_LABEL[it.kind] ?? it.kind}</span></td>
              <td className="memo">{it.memo || "—"}</td>
              <td className={`num amt ${it.amount >= 0 ? "pt-amount--pos" : "pt-amount--neg"}`}>
                {it.amount > 0 ? "+" : ""}{formatInt(it.amount)}
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="pb-muted">Chưa có giao dịch nào.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
