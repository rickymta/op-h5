import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, DataTable, LinkButton, formatDate, formatInt, timeAgo, type Column } from "@op/site-ui";
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
 * Số dư to màu vàng đồng.
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
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5">
      <div className="min-w-0">
        <div className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-fg-muted">Số dư</div>
        <div className="mt-1 font-mono text-[clamp(30px,6vw,44px)] font-medium leading-[1.1] tracking-[-0.03em] nums text-gold-400">
          {failed ? "—" : balance === undefined ? "…" : formatInt(balance)}
          <small className="ml-1.5 text-[0.45em] tracking-[0.04em] opacity-85">Xu</small>
        </div>
        {failed ? (
          <p className="m-0 mt-1.5 max-w-[46ch] text-[13px] text-warn-400">
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
    <div className="flex items-center gap-3.5 border-t border-line flex-wrap py-3 first:border-t-0 first:pt-0 tb:flex-nowrap">
      <div
        className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-ink-800 text-xl font-extrabold text-fg-muted"
        aria-hidden="true"
      >
        {g.logo_url ? (
          <img className="h-full w-full object-contain" src={g.logo_url} alt="" loading="lazy" />
        ) : (
          (g.name || "?").charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{g.name}</div>
        <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] text-fg-muted" title={g.game_username}>
          {g.game_username}
          {sub ? ` · ${sub}` : ""}
        </div>
      </div>
      <LinkButton href={g.play_url} variant="ghost" className="w-full flex-none tb:w-auto">
        Vào game
      </LinkButton>
    </div>
  );
}

/**
 * Số Xu có dấu. 0 là **trung tính**: không phải khoản cộng, tô xanh và thêm dấu `+` chỉ làm
 * người đọc tưởng vừa được nhận Xu (lỗi n8 trong báo cáo QA).
 */
function Amount({ n }: { n: number }) {
  const tone = n > 0 ? " text-ok-400" : n < 0 ? " text-danger-400" : "";
  return (
    <span className={`whitespace-nowrap font-mono nums${tone}`}>
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
        <span className="whitespace-nowrap font-mono nums text-fg-muted" title={formatDate(r.at)}>
          {timeAgo(r.at, now)}
        </span>
      ),
    },
    {
      key: "kind",
      title: "Loại",
      width: "16%",
      render: (r) => <Badge tone="muted">{HISTORY_KIND_LABEL[r.kind] ?? r.kind}</Badge>,
    },
    { key: "memo", title: "Nội dung", render: (r) => r.memo || "—" },
    { key: "amount", title: "Số Xu", align: "right", width: "18%", render: (r) => <Amount n={r.amount} /> },
  ];
  return <DataTable columns={cols} rows={rows} rowKey={(r) => r.key} loading={loading} empty="Chưa có giao dịch nào." />;
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
          <span
            className="mt-0.5 block font-mono text-[12.5px] text-fg-muted"
            title={o.created_at ? formatDate(sqlIso(o.created_at)) : undefined}
          >
            {o.created_at ? timeAgo(sqlIso(o.created_at), now) : ""}
          </span>
        </>
      ),
    },
    {
      key: "srv",
      title: "Máy chủ",
      width: "14%",
      render: (o) => <span className="whitespace-nowrap font-mono nums">{o.srv_code || "—"}</span>,
    },
    {
      key: "amount",
      title: "Số Xu",
      align: "right",
      width: "16%",
      render: (o) => <span className="whitespace-nowrap font-mono nums text-danger-400">-{formatInt(o.amount_xu)}</span>,
    },
    {
      key: "status",
      title: "Trạng thái",
      width: "16%",
      render: (o) => <Badge tone={ORDER_STATUS_TONE[o.status] ?? "muted"}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>,
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
