// Khuôn dữ liệu của trang quản trị nền tảng.
//
// Lớp gọi mạng (`api`, `ApiError`) nằm ở @op/admin-ui và dùng chung với app GM; ở đây chỉ
// khai báo hình dạng dữ liệu mà tiến trình `admin` (:8100) trả về. Giữ đúng tên trường của
// Go — đổi tên ở tầng này chỉ tạo thêm một bảng ánh xạ phải nhớ.

// ---------------------------------------------------------------- người đang đăng nhập

export interface Me {
  id: number;
  username: string;
  email: string;
  role: "viewer" | "gm" | "operator" | "owner";
  must_change_password: boolean;
}

// ---------------------------------------------------------------- đơn mua

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

// ---------------------------------------------------------------- game

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
  cover_url: string; // bìa dọc 3:4 (thẻ game)
  banner_url: string; // key visual ngang (hero)
  logo_url: string;
  accent: string; // '#EE4623'; rỗng = màu mặc định
  badge: Badge;
  featured: boolean; // chỉ một game nổi bật trong toàn nền tảng
  fanpage_url: string;
  group_url: string;
  support_url: string;
}

/** Thân gửi lên POST /api/games/{code}: đủ mọi trường sửa được, không có trường đếm. */
export type GameInput = Omit<Game, "code" | "servers" | "packages" | "has_client" | "sort_order">;

// ---------------------------------------------------------------- nhân viên và người chơi

export type Role = "viewer" | "gm" | "operator" | "owner";

export interface Staff {
  id: number;
  username: string;
  role: Role;
  status: "active" | "disabled";
  last_login_at: string;
  created_at: string;
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

// ---------------------------------------------------------------- trang nội dung

/** Trang nội dung tĩnh: giới thiệu, hướng dẫn, điều khoản, chính sách, FAQ, hỗ trợ.
 *
 * `game_code` rỗng = bản CHUNG của nền tảng; có mã = bản riêng của một game. Trang của
 * game tra bản riêng trước rồi lui về bản chung, nên cùng một `slug` tồn tại được ở cả
 * hai mức — khoá duy nhất là cặp (slug, game_code). */
export interface ContentPage {
  id: number;
  slug: string;
  game_code: string; // rỗng = trang chung
  game_name: string;
  title: string;
  body: string;
  updated_by: number;
  updated_by_name: string;
  updated_at: string; // RFC 3339
}

export interface PagesResponse {
  pages: ContentPage[];
}

/** Thân gửi lên POST /api/pages. Ghi đè theo cặp (slug, game_code). */
export interface PageInput {
  slug: string;
  game_code: string;
  title: string;
  body: string;
}

// ---------------------------------------------------------------- tin tức

export type NewsKind = "news" | "event" | "notice";

export interface News {
  id: number;
  slug: string; // đường dẫn chữ của bài: /tin-tuc/<slug>
  game_code: string | null; // null = tin chung của nền tảng
  game_name: string;
  kind: NewsKind;
  title: string;
  summary: string;
  body: string; // văn bản thuần; đoạn cách nhau bằng dòng trống
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
  slug: string; // để trống: máy chủ tự sinh từ tiêu đề (bỏ dấu tiếng Việt)
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

// ---------------------------------------------------------------- đội máy chủ

/** GET /api/fleet — cấu hình trong DB gộp với tải thật hỏi từ Adapter của từng game.
 *  `reachable=false` nghĩa là mất số liệu tải, nhưng ngưỡng vẫn sửa được. */
export interface FleetGame {
  code: string;
  name: string;
  reachable: boolean;
  error?: string;
  online: number;
  soft_total: number;
  utilization: number;
  servers: FleetServer[];
  devices: FleetDevice[];
}

export type SrvStatus = "running" | "maintain" | "closed" | "merged";

export interface FleetServer {
  srv_code: string;
  name: string;
  device_code: string;
  status: SrvStatus;
  recommend: boolean;
  soft_limit: number;
  overflow_pct: number;
  hard_limit: number;
  online: number;
  band: string; // smooth | busy | full | unknown
  label: string;
}

export interface FleetDevice {
  device_code: string;
  name: string;
  max_online: number;
  online: number;
}

export interface FleetResponse {
  games: FleetGame[];
}

// ---------------------------------------------------------------- gói cửa hàng

export const NHOM_GOI = [
  "diamond",
  "card",
  "fund",
  "privilege",
  "daily",
  "limited",
  "event",
  "item",
  "ingame",
] as const;
export type PackageCategory = (typeof NHOM_GOI)[number];

export interface PackageRow {
  /** Ma goi. May chu tra o khoa `id` (cmd/admin/catalog.go), khong phai `package_id` —
   *  `package_id` la khoa cua ban ghi don mua, thu khac. */
  id: string;
  name: string;
  category: string;
  grant_mode: "pay" | "mail" | "ingame";
  reward: string;
  description: string;
  badge: string;
  status: "active" | "hidden";
  price_xu: number;
  item_tid: number;
  sort_order: number;
}

export interface PackagesResponse {
  packages: PackageRow[];
  games: { code: string; name: string }[];
  game: string;
  cats: { category: string; active: number; total: number }[];
  has_more?: boolean;
}

// ---------------------------------------------------------------- nhật ký

export interface AuditEntry {
  id: number;
  who: string;
  action: string;
  target: string;
  detail: string;
  at: string;
}

export interface AuditResponse {
  items: AuditEntry[];
  has_more?: boolean;
}
