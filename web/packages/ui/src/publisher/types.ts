/** Dải tải của máy chủ — trùng với `band` mà adapter trả ở `/api/game/servers`. */
export type Band = "smooth" | "busy" | "full" | "unknown";

/** Nhãn góc thẻ game — trùng enum `games.badge` trong DB (rỗng = không có nhãn). */
export type Badge = "" | "new" | "hot" | "soon";

/** Nhãn tiếng Việt cho `Badge`; rỗng thì không hiện. */
export const BADGE_LABEL: Record<Badge, string> = { "": "", new: "Mới", hot: "Hot", soon: "Sắp ra" };
