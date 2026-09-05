// Lớp gọi API của cổng tài khoản (`id`, :8080).
//
// Khác với apps/ops: 401 KHÔNG chuyển trang. Trang chính, tin tức, đăng nhập đều xem được
// khi là khách, nên "chưa đăng nhập" là một trạng thái bình thường — `useMe()` (lib/session.ts)
// đổi 401 thành `null`, còn khu tài khoản tự chuyển sang `/dang-nhap?next=` khi thấy khách.
// Mọi lỗi khác trả `ApiError` để trang tự quyết định hiện gì.

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
    credentials: "same-origin",
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

/** Thông báo lỗi để hiện cho người dùng: ApiError thì lấy nguyên, còn lại là lỗi mạng. */
export function errText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return "Có lỗi xảy ra.";
}

// ---------------------------------------------------------------- công khai (hợp đồng 4.2)

export interface Site {
  brand: string;
  notice: { id: number; title: string; link_url: string } | null;
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
