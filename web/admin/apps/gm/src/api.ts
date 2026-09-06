// Khuôn dữ liệu của công cụ GM.
//
// Lớp gọi HTTP dùng chung `api`/`ApiError` của @op/admin-ui — cùng hành vi với trang quản
// trị nền tảng (401 -> /dang-nhap, lỗi lấy ở `error_description`). Ở đây chỉ khai báo hình
// dạng dữ liệu và một chỗ duy nhất đọc mã lỗi của console ra câu tiếng Việt.

import { ApiError } from "@op/admin-ui";

export { api, ApiError } from "@op/admin-ui";

/** Người đang trực. Vai trò quyết định được nhìn hay được chạm. */
export interface Me {
  id: number;
  username: string;
  email: string;
  role: "viewer" | "gm" | "operator" | "owner";
  must_change_password: boolean;
}

/** `viewer` chỉ được xem; từ `gm` trở lên mới được chạm vào nhân vật. */
export function canGM(me: Me | undefined | null): boolean {
  return me?.role === "gm" || me?.role === "operator" || me?.role === "owner";
}

export interface GameOpt {
  code: string;
  name: string;
}

export interface ServerOpt {
  code: string;
  name: string;
}

/** Một loại kho đồ (bagType) cùng tên tiếng Việt do máy chủ phát ra. */
export interface BagKind {
  type: number;
  label: string;
  note: string;
}

export interface GMMeta {
  games: GameOpt[];
  game: string;
  servers: ServerOpt[];
  bags: BagKind[];
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

export interface ClearResult {
  cleared: number;
  failed: number;
  message: string;
}

export interface MessageResult {
  message: string;
}

/**
 * Đổi lỗi thành câu cho người trực, phân biệt ba tình huống khác hẳn nhau:
 *
 *   409 console_rejected / changed  console SỐNG nhưng TỪ CHỐI — sửa tham số là xong.
 *   502 console_unavailable        console CHẾT hoặc mạng đứt — người trực không sửa được.
 *   503 console_unconfigured       cụm game chưa khai báo console — việc của người cài đặt.
 *
 * Gộp ba cái này vào một câu "lỗi" là cách nhanh nhất để ca trực đi sai hướng: cái đầu thì
 * gõ lại, hai cái sau thì gọi người trực hạ tầng.
 */
export function loiConsole(err: unknown): { text: string; nang: boolean } {
  if (!(err instanceof ApiError)) {
    return { text: err instanceof Error ? err.message : "Lỗi không rõ.", nang: true };
  }
  switch (err.code) {
    case "changed":
      return { text: err.message, nang: false };
    case "console_rejected":
      return { text: "Console từ chối: " + err.message, nang: false };
    case "console_unavailable":
      return { text: "Console không trả lời — hãy báo người trực hạ tầng. " + err.message, nang: true };
    case "console_unconfigured":
      return { text: "Cụm game chưa cấu hình console. " + err.message, nang: true };
    case "forbidden":
      return { text: "Tài khoản này chỉ có quyền xem.", nang: true };
    default:
      return { text: err.message, nang: true };
  }
}
