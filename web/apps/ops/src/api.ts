// Lớp gọi API của trang quản trị.
//
// Phiên đăng nhập vẫn là cookie `op_admin` do Go đặt, và SPA chạy cùng gốc nên trình duyệt
// tự gửi kèm. Chưa đăng nhập thì API trả 401 JSON (requireAdminAPI) — ở đây chuyển thẳng
// sang form đăng nhập của Go thay vì dựng lại form trong React: giai đoạn 0 chỉ chứng minh
// đường ống, không đổi cách xác thực.

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
  if (res.status === 401) {
    window.location.href = "/dang-nhap";
    throw new ApiError(401, "unauthorized", "Chưa đăng nhập.");
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Phản hồi không phải JSON gần như luôn là trang lỗi của nginx hoặc proxy chen vào.
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

// ---------------------------------------------------------------- khuôn dữ liệu

export interface Order {
  id: number;
  user_id: number;
  username: string;
  package_id: string;
  name: string;
  srv_code: string;
  amount_xu: number;
  status: "pending" | "granted" | "failed" | "refunded";
  grant_mode: "pay" | "mail" | "ingame";
  last_error: string;
  attempts: number;
  created_at: string;
  granted_at: string;
}

export interface OrdersResponse {
  orders: Order[];
  counts: Record<string, number>;
  games: { code: string; name: string }[];
  game: string;
}

// ---------------------------------------------------------------- công cụ GM

export interface GMMeta {
  games: { code: string; name: string }[];
  game: string;
  servers: { code: string; name: string }[];
  bags: { type: number; label: string; note: string }[];
}

export interface Role {
  roleId: string;
  roleName: string;
  srvCode: string;
  accountUid: string;
  platformCode: string;
  level: number;
  vipLevel: number;
  power: number;
}

export interface BagSlot {
  id: string;
  tid: number;
  num: number;
  name: string;
}

// ---------------------------------------------------------------- quản trị nền tảng

/** Nhãn nhỏ trên thẻ game ở trang chính. Rỗng = không có nhãn. */
export type Badge = "" | "new" | "hot" | "soon";

export interface Game {
  code: string;
  name: string;
  adapter_url: string;
  site_url: string;
  status: "active" | "hidden";
  sort_order: number;
  servers: number;
  packages: number;
  has_client: boolean;
  // Phần giới thiệu (migration 0010_catalog). URL ảnh có thể tương đối so với site_url.
  tagline: string;
  genre: string;
  description: string;
  cover_url: string;   // bìa dọc 3:4 (thẻ game)
  banner_url: string;  // key visual ngang (hero)
  logo_url: string;
  accent: string;      // '#EE4623'; rỗng = màu mặc định
  badge: Badge;
  featured: boolean;   // chỉ một game nổi bật trong toàn nền tảng
  fanpage_url: string;
  group_url: string;
  support_url: string;
}

/** Thân gửi lên POST /api/games/{code}: đủ mọi trường sửa được, không có trường đếm. */
export type GameInput = Omit<Game, "code" | "servers" | "packages" | "has_client" | "sort_order">;

export interface Staff {
  id: number;
  username: string;
  role: "viewer" | "gm" | "operator" | "owner";
  status: "active" | "disabled";
  last_login_at: string;
  created_at: string;
}

export interface Me {
  id: number;
  username: string;
  email: string;
  role: "viewer" | "gm" | "operator" | "owner";
  must_change_password: boolean;
}

export interface Player {
  id: number;
  username: string;
  email: string;
  phone: string;
  status: "active" | "locked" | "deleted";
  balance: number;
  last_login_at: string;
  created_at: string;
}

export interface PlayerDetail {
  player: Player;
  identities: { game_code: string; game_username: string; account_uid: string; created_at: string }[];
  history: { txn_id: number; kind: string; amount: number; memo: string; at: string }[];
  orders: Order[];
}

// ---------------------------------------------------------------- tin tức

export type NewsKind = "news" | "event" | "notice";

export interface News {
  id: number;
  game_code: string | null; // null = tin chung của nền tảng
  game_name: string;
  kind: NewsKind;
  title: string;
  summary: string;
  body: string;             // văn bản thuần; đoạn cách nhau bằng dòng trống
  image_url: string;
  link_url: string;
  pinned: boolean;
  status: "draft" | "published";
  published_at: string | null; // RFC 3339
  created_by: number | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface NewsResponse {
  news: News[];
  has_more: boolean;
}

/** Thân gửi lên POST /api/news và /api/news/{id}. `published_at` bỏ trống thì không gửi. */
export interface NewsInput {
  game_code: string | null;
  kind: NewsKind;
  title: string;
  summary: string;
  body: string;
  image_url: string;
  link_url: string;
  pinned: boolean;
  status: "draft" | "published";
  published_at?: string;
}
