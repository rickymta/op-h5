import { cx } from "./cx";
import { Badge } from "./Badge";
import { btnClass } from "./Button";
import { BADGE_LABEL, type GameBadge } from "./types";

const BADGE_CX: Record<Exclude<GameBadge, "">, string> = {
  new: "bg-brand-500 text-white",
  hot: "bg-gold-500 text-ink-900",
  soon: "border border-line bg-ink-800 text-fg-muted",
};

/**
 * Thẻ game kiểu launcher: bìa dọc 3:4, tên, pill thể loại, nhãn góc (Mới/Hot/Sắp ra) và nút
 * "Chơi ngay". Cả thẻ là một liên kết. Thiếu `cover` thì nền dốc + chữ cái đầu của tên.
 * Xếp nhiều thẻ bằng `<div className="site-game-grid">` (2 cột ở điện thoại).
 *
 * Nút bên trong là `<span>` chứ không phải `<button>`: cả thẻ đã là `<a>` rồi, lồng thêm một
 * điều khiển bấm được nữa là HTML sai và trình đọc màn hình sẽ đọc hai lần.
 */
export function GameCard({
  name,
  genre,
  cover,
  badge = "",
  href,
  cta = "Chơi ngay",
  meta,
  external,
}: {
  name: string;
  genre?: string;
  cover?: string;
  badge?: GameBadge;
  href: string;
  cta?: string;
  meta?: string;
  external?: boolean;
}) {
  const label = BADGE_LABEL[badge] ?? "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <a
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-ink-850 text-fg no-underline transition duration-150 hover:-translate-y-0.5 hover:border-gold-400 hover:no-underline"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
    >
      {label && badge ? (
        <span
          className={cx(
            "absolute left-2.5 top-2.5 z-10 rounded-sm px-2 py-[3px] font-mono text-2xs uppercase tracking-[0.08em]",
            BADGE_CX[badge],
          )}
        >
          {label}
        </span>
      ) : null}

      <div className="relative aspect-[3/4] overflow-hidden bg-ink-800" aria-hidden="true">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-b from-ink-800 to-ink-900 text-[56px] font-extrabold leading-none tracking-[-0.04em] text-fg/20 xs:text-[72px]">
            {initial}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-2.5 pb-3 pt-2.5 xs:gap-2 xs:px-3.5 xs:pb-3.5 xs:pt-3">
        <div className="line-clamp-2 text-[14.5px] font-bold leading-snug xs:text-[15.5px]">{name}</div>
        {genre || meta ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {genre ? <Badge>{genre}</Badge> : null}
            {meta ? <span className="text-[12.5px] text-fg-muted">{meta}</span> : null}
          </div>
        ) : null}
        <span className={btnClass("primary", "md", true, "mt-auto")} aria-hidden="true">
          {cta}
        </span>
      </div>
    </a>
  );
}
