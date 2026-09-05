import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, LinkButton, formatDate, formatInt, timeAgo, type Column } from "@op/ui/publisher";
import {
  api,
  HISTORY_KIND_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  type HistoryItem,
  type MyGame,
  type Order,
  type WalletSummary,
} from "../../api";

/** Danh sách game người này đã vào (từ `game_identities`). Dùng ở Tổng quan và Nhân vật. */
export function useMyGames() {
  return useQuery({ queryKey: ["myGames"], queryFn: () => api.get<{ games: MyGame[] }>("/api/me/games") });
}

/** Bốn ô thống kê ví + số dư đối chứng. Dùng ở trang Ví. */
export function useWalletSummary() {
  return useQuery({
    queryKey: ["walletSummary"],
    queryFn: () => api.get<WalletSummary>("/api/wallet/summary"),
    staleTime: 30_000,
  });
}

/** Đơn mua gói ở mọi game. Dùng ở Tổng quan. */
export function useMyOrders(limit = 5) {
  return useQuery({
    queryKey: ["myOrders", limit],
    queryFn: () => api.get<{ orders: Order[] }>(`/api/me/orders?limit=${limit}`),
    staleTime: 30_000,
  });
}

/**
 * Số dư to màu brass.
 *
 * Ba trạng thái, KHÔNG được lẫn lộn: đang đọc (`…`), đọc hỏng (`—` kèm một câu giải thích) và
 * đọc được (con số, kể cả 0). Hiện "0 Xu" cho một người vừa nạp tiền mà hệ thống chỉ đang lỗi
 * đọc ví là cách nhanh nhất làm họ tưởng mất tiền — đó là lỗi V2 trong báo cáo QA đợt 3.
 */
export function BalanceBig({
  balance,
  failed,
  action,
}: {
  balance?: number;
  failed?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="pt-balance">
      <div className="pt-balance__main">
        <div className="pt-balance__k">Số dư</div>
        <div className="pt-balance__v">
          {failed ? "—" : balance === undefined ? "…" : formatInt(balance)}
          <small>Xu</small>
        </div>
        {failed ? (
          <p className="pt-balance__err">
            Chưa đọc được số dư — đây là lỗi kết nối, không phải bạn hết Xu. Tải lại trang để thử lại.
          </p>
        ) : null}
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
 * Số Xu có dấu. 0 là **trung tính**: không phải khoản cộng, tô xanh và thêm dấu `+` chỉ làm
 * người đọc tưởng vừa được nhận Xu (lỗi n8 trong báo cáo QA).
 */
function Amount({ n }: { n: number }) {
  const tone = n > 0 ? " pt-amount--pos" : n < 0 ? " pt-amount--neg" : "";
  return (
    <span className={`pt-num${tone}`}>
      {n > 0 ? "+" : ""}
      {formatInt(n)}
    </span>
  );
}

/**
 * Một dòng lịch sử kèm khoá riêng: `txn` không đủ làm khoá vì "Xem thêm" nối nhiều trang và
 * một giao dịch điều chỉnh có thể sinh hai bút toán cùng số.
 */
export type HistoryRow = HistoryItem & { key: string };

/** Gắn khoá theo vị trí (trang, dòng) cho danh sách lịch sử trước khi đưa vào bảng. */
export function withKeys(items: HistoryItem[], prefix = ""): HistoryRow[] {
  return items.map((it, i) => ({ ...it, key: `${prefix}${i}-${it.txn}` }));
}

/**
 * Bảng giao dịch ví: Lúc / Loại / Nội dung / Số Xu. Dùng `DataTable` nên dưới 720 px mỗi dòng
 * tự thành một thẻ có nhãn cột — không cuộn ngang, số Xu luôn nhìn thấy.
 */
export function HistoryTable({ rows, loading }: { rows: HistoryRow[]; loading?: boolean }) {
  const now = new Date();
  const cols: Column<HistoryRow>[] = [
    {
      key: "at",
      title: "Lúc",
      width: "22%",
      render: (r) => (
        <span className="pt-num pt-dim" title={formatDate(r.at)}>
          {timeAgo(r.at, now)}
        </span>
      ),
    },
    {
      key: "kind",
      title: "Loại",
      width: "16%",
      render: (r) => <span className="pt-tag">{HISTORY_KIND_LABEL[r.kind] ?? r.kind}</span>,
    },
    { key: "memo", title: "Nội dung", render: (r) => r.memo || "—" },
    { key: "amount", title: "Số Xu", align: "right", width: "18%", render: (r) => <Amount n={r.amount} /> },
  ];
  return (
    <DataTable
      columns={cols}
      rows={rows}
      rowKey={(r) => r.key}
      loading={loading}
      empty="Chưa có giao dịch nào."
    />
  );
}

/**
 * `game_grants.created_at` về dạng SQL "2026-09-05 21:14" chứ không phải RFC 3339 (khác mọi
 * API còn lại). Đổi dấu cách thành `T` để `Date` đọc được như giờ địa phương, rồi để
 * formatDate/timeAgo lo phần hiển thị — trang không bao giờ in thẳng chuỗi SQL cho người đọc.
 */
function sqlIso(s: string): string {
  return s.includes(" ") ? s.replace(" ", "T") : s;
}

/**
 * Bảng đơn mua gói ở mọi game: Game / Gói / Máy chủ / Số Xu / Trạng thái.
 *
 * Không hiện `last_error`: server cố ý trả rỗng vì đó là thông báo kỹ thuật của console game.
 * Đơn hỏng thì trạng thái đã nói đủ, và Xu được hoàn tự động.
 */
export function OrdersTable({ orders, loading }: { orders: Order[]; loading?: boolean }) {
  const now = new Date();
  const cols: Column<Order>[] = [
    { key: "game", title: "Game", width: "18%", render: (o) => o.game_name || o.game_code },
    {
      key: "name",
      title: "Gói",
      render: (o) => (
        <>
          <span>{o.name || o.package_id}</span>
          <span className="pt-dim pt-order__at" title={o.created_at ? formatDate(sqlIso(o.created_at)) : undefined}>
            {o.created_at ? timeAgo(sqlIso(o.created_at), now) : ""}
          </span>
        </>
      ),
    },
    { key: "srv", title: "Máy chủ", width: "14%", render: (o) => <span className="pt-num">{o.srv_code || "—"}</span> },
    {
      key: "amount",
      title: "Số Xu",
      align: "right",
      width: "16%",
      render: (o) => <span className="pt-num pt-amount--neg">-{formatInt(o.amount_xu)}</span>,
    },
    {
      key: "status",
      title: "Trạng thái",
      width: "16%",
      render: (o) => {
        const tone = ORDER_STATUS_TONE[o.status] ?? "";
        return (
          <span className={`pt-tag${tone ? ` pt-tag--${tone}` : ""}`}>
            {ORDER_STATUS_LABEL[o.status] ?? o.status}
          </span>
        );
      },
    },
  ];
  return (
    <DataTable
      columns={cols}
      rows={orders}
      rowKey={(o) => String(o.id)}
      loading={loading}
      empty="Bạn chưa mua gói nào. Vào cửa hàng của game để đổi Xu lấy vật phẩm."
    />
  );
}
