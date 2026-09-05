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
