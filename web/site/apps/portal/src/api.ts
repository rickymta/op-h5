// Khuôn dữ liệu của API cổng tài khoản (`id`, :8080).
//
// Hàm gọi (`api`, `ApiError`, `errText`) lấy từ @op/site-ui — ba app công khai dùng chung một
// lớp gọi, trong đó 401 KHÔNG chuyển trang: trang chính, tin tức, đăng nhập đều xem được khi là
// khách, nên "chưa đăng nhập" là một trạng thái bình thường. `useMe()` (lib/session.ts) đổi 401
// thành `null`, còn khu tài khoản tự chuyển sang `/dang-nhap?next=` khi thấy khách.
//
// File này chỉ giữ phần riêng của cổng: hình dạng JSON và bảng nhãn tiếng Việt.
export { api, ApiError, errText } from "@op/site-ui";

// ---------------------------------------------------------------- công khai (hợp đồng 4.2)

export interface Site {
  brand: string;
  notice: { id: number; slug: string; title: string; link_url: string } | null;
  support_url: string;
  fanpage_url: string;
  topup_url: string;     // rỗng = chưa có cổng nạp
  legal_note: string;
}

export type Badge = "" | "new" | "hot" | "soon";

export interface Game {
  code: string;
  name: string;
  tagline: string;
  genre: string;
  description: string;
  cover_url: string;
  banner_url: string;
  logo_url: string;
  accent: string;
  badge: Badge;
  featured: boolean;
  site_url: string;
  play_url: string;
  servers_url: string;
  online: number;
  servers_open: number;
  live: boolean;         // adapter trả lời được trong 3 s; false thì online/servers_open không tin được
}

export interface GamesResponse {
  games: Game[];
  online_total: number;
  servers_open_total: number;
  featured: string;      // code hoặc ''
}

export type NewsKind = "news" | "event" | "notice";

export interface NewsItem {
  id: number;
  slug: string;          // đường dẫn chữ: /tin-tuc/<slug>
  game_code: string | null;
  game_name: string;
  kind: NewsKind;
  title: string;
  summary: string;
  image_url: string;
  link_url: string;
  pinned: boolean;
  published_at: string;
}

export interface NewsDetail extends NewsItem {
  body: string;          // văn bản thuần; đoạn cách nhau bằng dòng trống
  /** Chỉ có khi vào bằng id mà bài đã có slug: trang tự đổi đường dẫn trên thanh địa chỉ. */
  canonical_slug?: string;
}

export const NEWS_KIND_LABEL: Record<NewsKind, string> = { news: "Tin", event: "Sự kiện", notice: "Thông báo" };

// ---------------------------------------------------------------- cần phiên (hợp đồng 4.3)

export interface Me {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface Balance {
  currency: "XU";
  balance: number;
}

export type HistoryKind = "topup" | "convert" | "refund" | "adjust";

export interface HistoryItem {
  txn: number;
  kind: HistoryKind | string;
  amount: number;
  memo?: string;
  at: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  page_size: number;
  has_more: boolean;
}

export const HISTORY_KIND_LABEL: Record<string, string> = {
  topup: "Nạp", convert: "Quy đổi", refund: "Hoàn", adjust: "Điều chỉnh",
};

export interface MyGame {
  code: string;
  name: string;
  logo_url: string;
  site_url: string;
  play_url: string;
  game_username: string;
  created_at: string;
  last_order_at?: string;
}

export interface Session {
  id_tail: string;
  ip: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  current: boolean;
}

/** `GET /api/wallet/summary` — bốn ô thống kê ở trang Ví (hợp đồng đợt 3, mục 3.2). */
export interface WalletSummary {
  balance: number;
  topup_total: number;
  convert_total: number;      // tổng đã tiêu để đổi vật phẩm, số dương
  refunded_total: number;
  orders_total: number;
  orders_pending: number;
  orders_granted: number;
  since: string;              // ngày tạo tài khoản, RFC 3339 (rỗng nếu không đọc được)
}

export type OrderStatus = "pending" | "granted" | "failed" | "refunded";

/**
 * Một đơn mua gói. `last_error` server cố ý trả rỗng (là thông báo kỹ thuật của console game)
 * nên trang tài khoản không hiện cột đó — giữ trong kiểu để khỏi lệch khuôn JSON.
 */
export interface Order {
  id: number;
  package_id: string;
  name: string;
  srv_code: string;
  amount_xu: number;
  status: OrderStatus | string;
  grant_mode: "mail" | "pay" | string;
  created_at: string;
  granted_at: string;
  game_code: string;
  game_name: string;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Đang xử lý", granted: "Đã phát", failed: "Thất bại", refunded: "Đã hoàn Xu",
};

/** Trạng thái nào tô màu gì trong bảng đơn. */
export const ORDER_STATUS_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  granted: "ok", pending: "warn", failed: "danger", refunded: "muted",
};

/**
 * `GET /api/pages/{slug}` — nội dung tĩnh người vận hành sửa được ở trang quản trị.
 * `body` là VĂN BẢN THUẦN: đoạn cách nhau bằng dòng trống, `## ` là tiêu đề phụ, `- ` là gạch
 * đầu dòng. Không bao giờ đưa vào innerHTML (xem `RichText` của @op/site-ui).
 */
export interface PageDoc {
  slug: string;
  game_code: string;
  title: string;
  body: string;
  updated_at: string;
}
