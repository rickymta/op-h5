// Đọc chuỗi quà `type:id:count` (nhiều món nối bằng `#`) thành thứ người trực đọc được.
//
// Máy chủ kiểm chuỗi này bằng đúng một biểu thức (`rewardRe` trong platform/internal/gmops),
// nên ở đây dùng lại y hệt: sai định dạng thì chặn ngay trên trang, khỏi tốn một vòng gọi
// console. Phần dịch tên chỉ để XEM TRƯỚC — không thay đổi thứ gửi đi, và món nào không
// tra được tên thì vẫn hiện nguyên mã chứ không bịa.

import type { BagKind } from "./api";

/** Y hệt `rewardRe` phía Go. Đổi ở đây thì phải đổi cả bên kia. */
export const REWARD_RE = /^\d+:\d+:\d+(#\d+:\d+:\d+)*$/;

export interface RewardPart {
  raw: string;
  type: number;
  id: number;
  count: number;
  label: string;
  /** true khi chỉ đoán được nhóm, chưa biết tên món — hiện mã cho người trực tự tra. */
  mo: boolean;
}

/** Ví trong game nằm ở type 0, id là loại tiền. Đây là các id ca trực gặp hằng ngày. */
const VI: Record<number, string> = {
  0: "Kim tệ",
  1: "Nguyên Bảo",
  4: "EXP anh hùng",
};

export function rewardHopLe(s: string): boolean {
  return REWARD_RE.test(s.trim());
}

/**
 * Tách chuỗi quà thành từng món. Chuỗi rỗng trả mảng rỗng; chuỗi sai định dạng cũng trả
 * mảng rỗng — chỗ gọi đã có `rewardHopLe` để báo lỗi riêng.
 */
export function docReward(s: string, bags: BagKind[] = []): RewardPart[] {
  const t = s.trim();
  if (!t || !REWARD_RE.test(t)) return [];
  return t.split("#").map((raw) => {
    const [a, b, c] = raw.split(":");
    const type = Number(a);
    const id = Number(b);
    const count = Number(c);
    if (type === 0) {
      const ten = VI[id];
      return { raw, type, id, count, label: ten ?? `Ví · loại ${id}`, mo: ten === undefined };
    }
    const kind = bags.find((k) => k.type === type);
    return {
      raw,
      type,
      id,
      count,
      label: kind ? `${kind.label} #${id}` : `Loại ${type} · mã ${id}`,
      mo: true,
    };
  });
}
