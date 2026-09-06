/** Dải tải của máy chủ — trùng với `band` mà adapter trả ở `/api/game/servers`. */
export type Band = "smooth" | "busy" | "full" | "unknown";

/** Nhãn góc thẻ game — trùng enum `games.badge` trong DB (rỗng = không có nhãn). */
export type GameBadge = "" | "new" | "hot" | "soon";

/** Nhãn tiếng Việt cho `GameBadge`; rỗng thì không hiện. */
export const BADGE_LABEL: Record<GameBadge, string> = { "": "", new: "Mới", hot: "Hot", soon: "Sắp ra" };

/** Sắc thái dùng chung cho `Badge`, `StatCard`, `KeyValue`. */
export type Tone = "brand" | "gold" | "ok" | "warn" | "danger" | "muted";
