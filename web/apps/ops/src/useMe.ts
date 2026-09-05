import { useQuery } from "@tanstack/react-query";
import { api, type Me } from "./api";

/** Người đang đăng nhập. Cùng queryKey với App nên chỉ gọi API một lần cho cả trang. */
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/me"), staleTime: 60_000 });
}

/** Menu hiện cho mọi người; nút ghi chỉ bật từ operator trở lên. API phía Go chặn lần nữa. */
export function canWrite(me: Me | undefined): boolean {
  return me?.role === "operator" || me?.role === "owner";
}
