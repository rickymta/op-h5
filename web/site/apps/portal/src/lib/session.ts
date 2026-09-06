// Ba truy vấn dùng ở mọi trang: cấu hình cổng, người đang đăng nhập, số dư.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type Balance, type Me, type Site } from "../api";

const MOCK = import.meta.env.VITE_MOCK === "1";
/**
 * Chỉ khi chạy `dev:mock`: plugin mock luôn trả `me.json` (không giả được 401), nên trạng
 * thái khách/đã đăng nhập giữ trong sessionStorage để thử được cả luồng đăng nhập → tài
 * khoản → đăng xuất. Bản build thật không có đoạn này (Vite thay `import.meta.env.VITE_MOCK`
 * bằng hằng lúc build rồi loại nhánh chết).
 */
export const mockLogin = {
  get: () => MOCK && sessionStorage.getItem("op-mock-login") === "1",
  set: (on: boolean) => {
    if (MOCK) sessionStorage.setItem("op-mock-login", on ? "1" : "0");
  },
};

async function fetchMe(): Promise<Me | null> {
  if (MOCK && !mockLogin.get()) return null;
  try {
    return await api.get<Me>("/api/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null; // khách — không phải lỗi
    throw e;
  }
}

/** `data` là `undefined` khi chưa biết, `null` khi là khách, `Me` khi đã đăng nhập. */
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false, staleTime: 60_000 });
}

export function useSite() {
  return useQuery({ queryKey: ["site"], queryFn: () => api.get<Site>("/api/site"), staleTime: 5 * 60_000 });
}

export function useBalance(enabled: boolean) {
  return useQuery({
    queryKey: ["balance"],
    queryFn: () => api.get<Balance>("/api/wallet/balance"),
    enabled,
    staleTime: 30_000,
  });
}

/** Sau khi đăng nhập/đăng ký: nạp lại `me` và CHỜ xong, để khu tài khoản không tưởng là khách. */
export function useAfterLogin() {
  const qc = useQueryClient();
  return async () => {
    mockLogin.set(true);
    await qc.invalidateQueries({ queryKey: ["me"] });
  };
}

/** Sau khi đăng xuất: xoá mọi dữ liệu cá nhân trong cache, `me` thành khách ngay. */
export function useAfterLogout() {
  const qc = useQueryClient();
  return () => {
    mockLogin.set(false);
    qc.setQueryData(["me"], null);
    for (const k of ["balance", "history", "myGames", "sessions"]) qc.removeQueries({ queryKey: [k] });
  };
}
