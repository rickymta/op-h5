// Lớp gọi API dùng chung cho hai trang quản trị.
//
// Chuyển nguyên hành vi của `web/apps/ops/src/api.ts` — không thêm, không bớt:
//   • Phiên đăng nhập là cookie `op_admin` do Go đặt; SPA chạy cùng gốc nên trình duyệt tự
//     gửi kèm, ở đây không đụng tới header xác thực.
//   • 401 → chuyển thẳng sang `/dang-nhap` (form của Go) rồi vẫn ném lỗi, để phần gọi không
//     chạy tiếp trên dữ liệu rỗng trong lúc trình duyệt còn đang rời trang.
//   • Phản hồi không phải JSON gần như luôn là trang lỗi của nginx hoặc proxy chen vào —
//     báo rõ chuyện đó thay vì để `JSON.parse` ném ra "Unexpected token <".
//   • Thông điệp lỗi lấy từ `error_description` của thân JSON.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
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

/** Rút thông điệp đọc được từ bất kỳ thứ gì `catch` bắt được. Dùng cho `error` của FormDialog. */
export function errText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}
