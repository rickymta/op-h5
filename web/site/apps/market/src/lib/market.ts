/**
 * Quy tac cho Xu ⇄ Nguyen Bao — docs/plan-go-react.md muc 12.3.
 *
 * Cac tham so duoi day la **thiet ke da chot**, khong phai so lieu thong ke bia ra:
 * chung se thanh bien moi truong MARKET_* khi backend duoc dung. Tinh phi ngay tren
 * trinh duyet chi de nguoi ban hieu co che truoc khi cho mo that; luc co backend thi
 * con so cuoi cung van do may chu tinh lai, trinh duyet khong duoc tin.
 */

/** Don vi niem yet gia: Xu cho moi 1.000 Nguyen Bao. */
export const PRICE_UNIT = 1000;

/** Cua hang ban 1 Xu = 1 Nguyen Bao, nen 1.000 Nguyen Bao o cua hang = 1.000 Xu. */
export const SHOP_PRICE_PER_UNIT = 1000;

/** MARKET_FEE_PCT — tru vao phan **nguoi ban** nhan. */
export const FEE_PCT = 5;

/** MARKET_PRICE_MIN_PCT — chan ban thao va chan chuyen Xu tra hinh qua gia gan 0. */
export const PRICE_MIN_PCT = 50;

/** MARKET_PRICE_MAX_PCT — ban dat hon cua hang thi khong ai mua, chi lam rac bang. */
export const PRICE_MAX_PCT = 100;

/** MARKET_MAX_OPEN_LISTINGS — chan spam bang. */
export const MAX_OPEN_LISTINGS = 5;

/** Buoc so luong Nguyen Bao khi dang ban. */
export const AMOUNT_STEP = 100;

/** So luong toi thieu mot tin rao. */
export const AMOUNT_MIN = 1000;

export const PRICE_FLOOR = Math.round((SHOP_PRICE_PER_UNIT * PRICE_MIN_PCT) / 100);
export const PRICE_CEIL = Math.round((SHOP_PRICE_PER_UNIT * PRICE_MAX_PCT) / 100);

export interface Quote {
  /** Tong Xu nguoi mua tra. */
  total: number;
  /** Phi san, tru vao phan nguoi ban nhan. */
  fee: number;
  /** So Xu nguoi ban thuc nhan. */
  net: number;
  /** Phan tram re hon cua hang, lam tron; 0 neu bang gia cua hang. */
  savedPct: number;
}

/** Thanh tien va phi cua mot tin rao. Lam tron ve so nguyen Xu, phi lam tron len phia san. */
export function quote(amount: number, pricePerUnit: number): Quote {
  const total = Math.round((amount / PRICE_UNIT) * pricePerUnit);
  const fee = Math.round((total * FEE_PCT) / 100);
  const shop = Math.round((amount / PRICE_UNIT) * SHOP_PRICE_PER_UNIT);
  const savedPct = shop > 0 ? Math.round(((shop - total) / shop) * 100) : 0;
  return { total, fee, net: total - fee, savedPct: Math.max(0, savedPct) };
}

/** Loi cua o so luong, hoac null neu hop le. */
export function checkAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Nhập số Nguyên Bảo muốn bán.";
  if (amount < AMOUNT_MIN) return `Tối thiểu ${AMOUNT_MIN.toLocaleString("vi-VN")} Nguyên Bảo một tin.`;
  if (amount % AMOUNT_STEP !== 0) return `Số lượng phải là bội của ${AMOUNT_STEP}.`;
  return null;
}

/** Loi cua o don gia, hoac null neu hop le. */
export function checkPrice(price: number): string | null {
  if (!Number.isFinite(price) || price <= 0) return "Nhập đơn giá.";
  if (price < PRICE_FLOOR) return `Giá sàn là ${PRICE_FLOOR.toLocaleString("vi-VN")} Xu cho ${PRICE_UNIT.toLocaleString("vi-VN")} Nguyên Bảo.`;
  if (price > PRICE_CEIL) return `Giá trần là ${PRICE_CEIL.toLocaleString("vi-VN")} Xu cho ${PRICE_UNIT.toLocaleString("vi-VN")} Nguyên Bảo.`;
  return null;
}
