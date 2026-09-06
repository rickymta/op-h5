// Thứ được "giữ" khi người trực chuyển trang: game, máy chủ, và nhân vật đang thao tác.
//
// Ca trực làm liên tiếp nhiều việc trên CÙNG một nhân vật (đọc kho đồ → nạp bù → gửi thư
// xin lỗi). Bắt chọn lại máy chủ ở mỗi trang là cách chắc chắn nhất để một lúc nào đó nạp
// nhầm sang máy chủ khác. Nên: chọn một lần trên thanh trên, mọi trang dùng chung.
//
// Lưu vào sessionStorage chứ không phải localStorage — hết phiên trình duyệt là quên. Mở
// thẳng đường /gm/nhan-vat/<id> sau khi F5 vẫn còn nhân vật; đóng tab thì không còn ai
// "đang được chọn" nữa, đúng với cách một ca trực kết thúc.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./api";

const K_GAME = "gm.game";
const K_SRV = "gm.srv";
const K_ROLE = "gm.role";

function doc(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function ghi(key: string, v: string) {
  try {
    if (v) sessionStorage.setItem(key, v);
    else sessionStorage.removeItem(key);
  } catch {
    /* chế độ riêng tư chặn storage: chấp nhận mất lựa chọn khi F5 */
  }
}

function docRole(): Role | null {
  const s = doc(K_ROLE);
  if (!s) return null;
  try {
    return JSON.parse(s) as Role;
  } catch {
    return null;
  }
}

interface ChonCtx {
  game: string;
  srv: string;
  role: Role | null;
  datGame: (v: string) => void;
  datSrv: (v: string) => void;
  datRole: (r: Role | null) => void;
}

const Ctx = createContext<ChonCtx | null>(null);

export function ChonProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState(() => doc(K_GAME));
  const [srv, setSrv] = useState(() => doc(K_SRV));
  const [role, setRole] = useState<Role | null>(() => docRole());

  // Đổi game thì máy chủ và nhân vật cũ không còn nghĩa gì — bỏ luôn, đừng để sót lại một
  // srvCode của game khác rồi gửi đi.
  const datGame = useCallback((v: string) => {
    setGame(v);
    ghi(K_GAME, v);
    setSrv("");
    ghi(K_SRV, "");
    setRole(null);
    ghi(K_ROLE, "");
  }, []);

  const datSrv = useCallback((v: string) => {
    setSrv(v);
    ghi(K_SRV, v);
    setRole((cu) => {
      if (cu && cu.srvCode !== v) {
        ghi(K_ROLE, "");
        return null;
      }
      return cu;
    });
  }, []);

  const datRole = useCallback((r: Role | null) => {
    setRole(r);
    ghi(K_ROLE, r ? JSON.stringify(r) : "");
  }, []);

  const value = useMemo<ChonCtx>(
    () => ({ game, srv, role, datGame, datSrv, datRole }),
    [game, srv, role, datGame, datSrv, datRole],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChon(): ChonCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChon phải nằm trong <ChonProvider>");
  return c;
}
