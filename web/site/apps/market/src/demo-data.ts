/**
 * DU LIEU MAU — khong phai so lieu that.
 *
 * Dot nay cho chi co giao dien (hop dong muc 1, quyet dinh 2): chua noi backend, chua dung
 * toi vi hay console. Moi con so duoi day duoc bia ra **de xem bo cuc**, va moi man hinh
 * hien tren dau mot dai noi ro dieu do. Khong duoc dung file nay lam co so bao cao.
 *
 * Ten nguoi ban da che kieu `hai***122` giong cac cho that: khi mo that, may chu chi tra
 * ve dang che nay, khong tra ten tai khoan day du.
 */

export type ListingStatus = "active" | "escrowing" | "sold" | "cancelled" | "void";

export interface DemoServer {
  code: string;
  name: string;
}

export interface DemoGame {
  code: string;
  name: string;
  genre: string;
  /** Tin rao dang mo: false thi game co mat trong bo loc nhung chua co hang. */
  open: boolean;
  note: string;
  servers: DemoServer[];
}

export interface DemoListing {
  id: string;
  game: string;
  srv: string;
  seller: string;
  /** So Nguyen Bao ky gui. */
  amount: number;
  /** Xu cho moi 1.000 Nguyen Bao. */
  price: number;
  createdAt: string;
  status: ListingStatus;
}

export interface DemoCharacter {
  id: string;
  game: string;
  srv: string;
  name: string;
  /** So Nguyen Bao dang co trong nhan vat. */
  balance: number;
}

export interface DemoTrade {
  id: string;
  at: string;
  kind: "sell" | "buy";
  game: string;
  srv: string;
  amount: number;
  price: number;
  /** So Xu doi ung: nguoi ban thi da tru phi, nguoi mua thi la so da tra. */
  xu: number;
  counterparty: string;
}

/**
 * Moc thoi gian cua bo du lieu mau. Truyen vao `timeAgo` de "3 gio truoc" khong bien thanh
 * "8 thang truoc" khi ai do mo trang nay sau nay.
 */
export const DEMO_NOW = new Date("2026-09-06T20:00:00+07:00");

export const DEMO_GAMES: DemoGame[] = [
  {
    code: "haitac",
    name: "Đại Hải Trình",
    genre: "Đấu tướng · Idle",
    open: true,
    note: "nhiều máy chủ",
    servers: [
      { code: "s1", name: "S1 · Đông Hải" },
      { code: "s2", name: "S2 · Nam Hải" },
      { code: "s3", name: "S3 · Tây Hải" },
      { code: "s4", name: "S4 · Bắc Hải" },
      { code: "s5", name: "S5 · Grand Line" },
    ],
  },
  {
    code: "tamquoc",
    name: "Tam Quốc Chí",
    genre: "Chiến thuật · SLG",
    open: false,
    note: "Chưa mở chợ",
    servers: [{ code: "s1", name: "S1 · Trung Nguyên" }],
  },
];

export const DEMO_LISTINGS: DemoListing[] = [
  { id: "M-2481", game: "haitac", srv: "s1", seller: "hai***122", amount: 120000, price: 720, createdAt: "2026-09-06T19:12:00+07:00", status: "active" },
  { id: "M-2480", game: "haitac", srv: "s2", seller: "thu***907", amount: 50000, price: 680, createdAt: "2026-09-06T18:40:00+07:00", status: "active" },
  { id: "M-2478", game: "haitac", srv: "s1", seller: "lon***045", amount: 300000, price: 750, createdAt: "2026-09-06T17:55:00+07:00", status: "active" },
  { id: "M-2477", game: "haitac", srv: "s3", seller: "kie***331", amount: 20000, price: 640, createdAt: "2026-09-06T16:30:00+07:00", status: "active" },
  { id: "M-2475", game: "haitac", srv: "s5", seller: "nam***588", amount: 1000000, price: 800, createdAt: "2026-09-06T15:02:00+07:00", status: "active" },
  { id: "M-2473", game: "haitac", srv: "s2", seller: "hai***122", amount: 75000, price: 700, createdAt: "2026-09-06T13:48:00+07:00", status: "active" },
  { id: "M-2470", game: "haitac", srv: "s4", seller: "quy***216", amount: 45000, price: 660, createdAt: "2026-09-06T11:20:00+07:00", status: "active" },
  { id: "M-2468", game: "haitac", srv: "s1", seller: "tie***774", amount: 200000, price: 730, createdAt: "2026-09-06T09:05:00+07:00", status: "active" },
  { id: "M-2465", game: "haitac", srv: "s3", seller: "dan***390", amount: 15000, price: 620, createdAt: "2026-09-05T22:41:00+07:00", status: "active" },
  { id: "M-2463", game: "haitac", srv: "s5", seller: "bao***108", amount: 500000, price: 780, createdAt: "2026-09-05T20:17:00+07:00", status: "active" },
  { id: "M-2460", game: "haitac", srv: "s2", seller: "min***552", amount: 88000, price: 690, createdAt: "2026-09-05T18:03:00+07:00", status: "active" },
  { id: "M-2458", game: "haitac", srv: "s1", seller: "hoa***967", amount: 33000, price: 650, createdAt: "2026-09-05T14:29:00+07:00", status: "active" },
  { id: "M-2455", game: "haitac", srv: "s4", seller: "vin***483", amount: 260000, price: 740, createdAt: "2026-09-05T10:11:00+07:00", status: "active" },
  { id: "M-2451", game: "haitac", srv: "s3", seller: "cua***029", amount: 60000, price: 670, createdAt: "2026-09-04T21:36:00+07:00", status: "active" },
];

/** Nhan vat mau cho biểu mẫu đăng bán (bước 1). */
export const DEMO_CHARACTERS: DemoCharacter[] = [
  { id: "r1", game: "haitac", srv: "s1", name: "ThuyenTruong", balance: 486300 },
  { id: "r2", game: "haitac", srv: "s2", name: "HaiTacDo", balance: 92500 },
  { id: "r3", game: "haitac", srv: "s5", name: "VuaBienCa", balance: 1240000 },
];

/** Tin rao "cua toi" — day du cac trang thai de xem cach hien thi. */
export const DEMO_MY_LISTINGS: DemoListing[] = [
  { id: "M-2481", game: "haitac", srv: "s1", seller: "hai***122", amount: 120000, price: 720, createdAt: "2026-09-06T19:12:00+07:00", status: "active" },
  { id: "M-2473", game: "haitac", srv: "s2", seller: "hai***122", amount: 75000, price: 700, createdAt: "2026-09-06T13:48:00+07:00", status: "active" },
  { id: "M-2440", game: "haitac", srv: "s1", seller: "hai***122", amount: 30000, price: 660, createdAt: "2026-09-04T08:22:00+07:00", status: "escrowing" },
  { id: "M-2402", game: "haitac", srv: "s3", seller: "hai***122", amount: 40000, price: 640, createdAt: "2026-09-02T19:50:00+07:00", status: "sold" },
  { id: "M-2377", game: "haitac", srv: "s1", seller: "hai***122", amount: 25000, price: 900, createdAt: "2026-08-31T12:05:00+07:00", status: "cancelled" },
];

export const DEMO_TRADES: DemoTrade[] = [
  { id: "T-8814", at: "2026-09-02T19:58:00+07:00", kind: "sell", game: "haitac", srv: "s3", amount: 40000, price: 640, xu: 24320, counterparty: "ngu***710" },
  { id: "T-8790", at: "2026-08-29T21:14:00+07:00", kind: "buy", game: "haitac", srv: "s1", amount: 10000, price: 700, xu: 7000, counterparty: "lon***045" },
  { id: "T-8752", at: "2026-08-25T10:02:00+07:00", kind: "sell", game: "haitac", srv: "s1", amount: 150000, price: 710, xu: 101175, counterparty: "tie***774" },
];

export const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "Đang rao",
  escrowing: "Đang ký gửi",
  sold: "Đã bán",
  cancelled: "Đã huỷ",
  void: "Không thành",
};

export function gameOf(code: string): DemoGame | undefined {
  return DEMO_GAMES.find((g) => g.code === code);
}

export function gameName(code: string): string {
  return gameOf(code)?.name ?? code;
}

export function serverName(gameCode: string, srv: string): string {
  return gameOf(gameCode)?.servers.find((s) => s.code === srv)?.name ?? srv.toUpperCase();
}

export function listingById(id: string): DemoListing | undefined {
  return DEMO_LISTINGS.find((l) => l.id === id) ?? DEMO_MY_LISTINGS.find((l) => l.id === id);
}
