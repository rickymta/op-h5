// Lớp gọi API dùng chung cho ba app công khai (`id` :8080 và `adapter` :8090).
//
// Khác app quản trị: 401 KHÔNG tự chuyển trang. Trang chính, tin tức, chợ, trang game đều xem
// được khi là khách, nên "chưa đăng nhập" là một trạng thái bình thường — app tự đổi 401 thành
// `null` ở chỗ hỏi phiên, còn khu tài khoản tự chuyển sang `/dang-nhap?next=` khi thấy khách.
// Mọi lỗi khác ném `ApiError` để trang quyết định hiện gì.

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
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
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

/** Thông báo lỗi để hiện cho người dùng: `ApiError` lấy nguyên, còn lại coi như lỗi mạng. */
export function errText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return "Có lỗi xảy ra.";
}
