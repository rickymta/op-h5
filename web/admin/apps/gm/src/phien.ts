// Phiên đăng nhập.
//
// VÌ SAO KHÔNG DÙNG `api` CỦA @op/admin-ui Ở HAI CHỖ NÀY
// ------------------------------------------------------
// `api` gặp 401 thì chuyển thẳng trình duyệt sang `/dang-nhap` — đúng cho mọi lời gọi giữa
// ca trực, nhưng sai ở đúng hai chỗ:
//
//   1. Hỏi "tôi là ai" lúc mở trang: chưa đăng nhập là chuyện BÌNH THƯỜNG, phải hiện thẻ
//      đăng nhập của chính công cụ GM (cùng cookie, cùng danh sách nhân viên) chứ không
//      quăng người ta ra khỏi /gm.
//   2. Chính lời gọi đăng nhập: sai mật khẩu cũng trả 401, mà chuyển trang lúc đó thì người
//      trực không bao giờ đọc được câu "sai mật khẩu".
//
// Nên hai hàm này gọi `fetch` trực tiếp và tự đọc lỗi. Mọi lời gọi còn lại của app vẫn đi
// qua `api` chung, giữ đúng hành vi với trang quản trị nền tảng.

import type { Me } from "./api";

async function docJSON(res: Response): Promise<{ error?: string; error_description?: string } | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as { error?: string; error_description?: string };
  } catch {
    return null;
  }
}

/** Trả về người đang đăng nhập, hoặc `null` khi chưa — `null` không phải lỗi. */
export async function layMe(): Promise<Me | null> {
  const res = await fetch("/api/me", { headers: { Accept: "application/json" } });
  if (res.status === 401 || res.status === 403) return null;
  const body = await docJSON(res);
  if (!res.ok) {
    throw new Error(body?.error_description ?? `Không đọc được phiên (HTTP ${res.status}).`);
  }
  if (!body) throw new Error("Máy chủ trả về nội dung lạ khi hỏi phiên đăng nhập.");
  return body as unknown as Me;
}

/**
 * Đăng nhập bằng chính tài khoản nhân viên của trang quản trị nền tảng — một danh sách
 * người, một cookie. Ai đã đăng nhập ở admin.<domain> thì vào /gm là dùng được ngay.
 */
export async function dangNhap(username: string, password: string): Promise<Me> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await docJSON(res);
  if (!res.ok) {
    throw new Error(body?.error_description ?? "Sai tên đăng nhập hoặc mật khẩu.");
  }
  if (!body) throw new Error("Máy chủ trả về nội dung lạ khi đăng nhập.");
  return body as unknown as Me;
}
