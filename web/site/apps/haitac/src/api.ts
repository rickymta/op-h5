// Khuôn dữ liệu của API trang game, và lời báo lỗi cho người chơi.
//
// Lớp gọi API lấy từ `@op/site-ui`: cùng hành vi với bản cũ của app này — phiên là cookie
// `haitac_sess` do Adapter đặt, SPA chạy cùng gốc nên trình duyệt tự gửi kèm, và **401 KHÔNG
// chuyển trang** (máy chủ, tin tức, bảng giá xem được khi chưa đăng nhập; chỉ cửa hàng cần
// phiên và nó tự hiện nút [Đăng nhập] → /choi-game, redirect phía Go chứ không phải route SPA).
import { ApiError } from "@op/site-ui";

export { api, ApiError } from "@op/site-ui";

/**
 * Lời báo lỗi cho người chơi: lỗi mạng (fetch ném TypeError) khác lỗi nghiệp vụ có mô tả.
 * Bọc lại `errText` của bộ dùng chung để giữ nguyên câu lui của từng trang (bộ dùng chung
 * không nhận tham số `fallback`).
 */
export function errText(e: unknown, fallback = "Mất kết nối. Vui lòng thử lại."): string {
  return e instanceof ApiError ? e.message : fallback;
}

// ---------------------------------------------------------------- khuôn dữ liệu (hợp đồng 4.4)

import type { Band, GameBadge } from "@op/site-ui";

/** GET /api/game/meta — dòng `games` của chính game này, do Adapter phát. */
export interface Meta {
  code: string;
  name: string;
  tagline: string;
  genre: string;
  description: string;
  cover_url: string;
  banner_url: string;
  logo_url: string;
  accent: string; // '#EE4623'; rỗng = màu mặc định
  badge: GameBadge;
  site_url: string;
  id_base: string; // gốc của trang ID (tài khoản, ví)
  brand: string; // tên nền tảng, in ở chân trang
  links: { fanpage_url: string; group_url: string; support_url: string };
  recommended: { srv_code: string; name: string; band: Band; label: string } | null;
  servers_open: number;
  online: number;
}

/** GET /api/game/servers — `serverView` trong handlers.go. */
export interface Server {
  code: string;
  name: string;
  band: Band;
  label: string;
  status: string;
  recommend: boolean;
  online: number;
  soft_limit: number;
}
export interface ServersResponse {
  servers: Server[];
  online: number;
  soft_total: number;
  utilization: number;
}

export type NewsKind = "news" | "event" | "notice";

/** GET /api/game/news — tin của game này và tin chung (game_code null hoặc rỗng). */
export interface NewsItem {
  id: number;
  slug: string;         // đường dẫn chữ: /tin-tuc/<slug>
  game_code: string | null;
  game_name: string;
  kind: NewsKind;
  title: string;
  summary: string;
  image_url: string;
  link_url: string;
  pinned: boolean;
  published_at: string; // RFC 3339
}
/** GET /api/game/news/{key} — `key` là slug hoặc id; thêm `body` (văn bản thuần, đoạn cách nhau bằng dòng trống). */
export interface NewsDetail extends NewsItem {
  body: string;
  /** Chỉ có khi vào bằng id mà bài đã có slug: trang tự đổi đường dẫn trên thanh địa chỉ. */
  canonical_slug?: string;
}

/** GET /api/game/me — luôn 200; khách thì `logged_in:false`. */
export interface Me {
  logged_in: boolean;
  username?: string;
  balance?: number;
}

/** `pkgView` trong store.go. `price_fmt` đã có dấu chấm hàng nghìn. */
export interface Pkg {
  id: string;
  name: string;
  category: string;
  grant_mode: "pay" | "mail" | "ingame";
  description: string;
  badge: string;
  cond: string;
  item_name: string;
  item_count: number;
  price_xu: number;
  price_fmt: string;
  vip_points: number;
}
/** `catView` trong store.go — một tab của cửa hàng. Tab không có gói thì server đã bỏ. */
export interface Category {
  key: string;
  title: string;
  hint: string;
  packages: Pkg[];
}
/** `listView` trong store.go — khối `list` trả kèm khi có tham số lọc (hợp đồng đợt 3 mục 3.1). */
export interface PkgList {
  packages: Pkg[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}
export interface PackagesResponse {
  /** `null` khi tham số `category` không khớp nhóm nào — trang lọc luôn bỏ qua khối này. */
  categories: Category[] | null;
  list?: PkgList;
}

/** `pkgDetail` — GET /api/game/packages/{id}. Gói ẩn hoặc `ingame` là 404 `package_unknown`. */
export interface PkgDetail extends Pkg {
  reward_items: { label: string; count: number }[];
  grant_note: string;
  server_days: { min: number; max: number };
  daily_limit: number;
  vip_required: number;
}

/** GET /api/game/store/stats — chỉ số thật: bao nhiêu gói, bao nhiêu nhóm. */
export interface StoreStats {
  packages: number;
  categories: number;
  rate_note: string;
  first_buy_bonus: boolean;
}

/** GET /api/game/pages/{slug} — nội dung tĩnh sửa được ở trang quản trị; 404 nếu chưa có. */
export interface PageDoc {
  slug: string;
  game_code: string;
  title: string;
  body: string;
  updated_at: string;
}

/** `orderView` trong store.go. `created_at` dạng "2026-09-05 21:14" (DATE_FORMAT phía SQL). */
export interface Order {
  id: number;
  name: string;
  srv_code: string;
  amount_fmt: string;
  status: "pending" | "granted" | "failed" | "refunded";
  status_vi: string;
  grant_mode: "pay" | "mail" | "ingame";
  created_at: string;
}
/** GET /api/game/orders — kèm số dư để trang thấy Xu được hoàn tự động. */
export interface OrdersResponse {
  orders: Order[];
  balance: number;
}

/** `roleView` trong store.go — nhân vật từ masterList của login server. */
export interface Role {
  srv_code: string;
  master_id_hex: string;
  name: string;
  level: number;
}
export interface RolesResponse {
  roles: Role[];
}

/** POST /api/game/convert. */
export interface ConvertRequest {
  package_id: string;
  srv_code: string;
  role_id: string;
  idempotency_key: string;
}
export interface ConvertResponse {
  txn: number;
  balance: number;
  message: string;
}
