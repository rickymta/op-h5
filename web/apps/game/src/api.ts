// Lớp gọi API của trang game.
//
// Phiên là cookie `haitac_sess` do Adapter đặt sau redirect OIDC; SPA chạy cùng gốc nên trình
// duyệt tự gửi kèm. Khác trang quản trị: 401 KHÔNG chuyển trang — máy chủ, tin tức, bảng giá
// xem được khi chưa đăng nhập; chỉ cửa hàng cần phiên và nó tự hiện nút [Đăng nhập] → /choi-game
// (redirect OIDC phía Go, không phải route SPA).

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Không phải JSON gần như luôn là trang lỗi của nginx hoặc proxy chen vào.
    throw new ApiError(res.status, "not_json", `Máy chủ trả về nội dung lạ (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    const e = body as { error?: string; error_description?: string } | null;
    throw new ApiError(res.status, e?.error ?? "error", e?.error_description ?? `Lỗi HTTP ${res.status}.`);
  }
  return body as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? "{}" : JSON.stringify(body) }),
};

/** Lời báo lỗi cho người chơi: lỗi mạng (fetch ném TypeError) khác lỗi nghiệp vụ có mô tả. */
export function errText(e: unknown, fallback = "Mất kết nối. Vui lòng thử lại."): string {
  return e instanceof ApiError ? e.message : fallback;
}

// ---------------------------------------------------------------- khuôn dữ liệu (hợp đồng 4.4)

import type { Band, Badge } from "@op/ui/publisher";

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
  badge: Badge;
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

/** GET /api/game/news — tin của game này và tin chung (game_code null). */
export interface NewsItem {
  id: number;
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
/** GET /api/game/news/{id} — thêm `body` (văn bản thuần, đoạn cách nhau bằng dòng trống). */
export interface NewsDetail extends NewsItem {
  body: string;
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
export interface PackagesResponse {
  categories: Category[];
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
