import { cx } from "./cx";
import { BADGE_LABEL, type Badge } from "./types";

/**
 * Thẻ game kiểu launcher: bìa dọc 3:4, tên, pill thể loại, nhãn góc (Mới/Hot/Sắp ra) và nút
 * "Chơi ngay". Cả thẻ là một liên kết. Thiếu `cover` thì nền gradient + chữ cái đầu của tên.
 * Xếp nhiều thẻ bằng `<div className="pb-game-grid">` (2 cột ở điện thoại).
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
  badge?: Badge;
  href: string;
  cta?: string;
  meta?: string;
  external?: boolean;
}) {
  const label = BADGE_LABEL[badge] ?? "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <a className="pb-game" href={href} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined}>
      {label ? <span className={cx("pb-badge", `pb-badge--${badge}`)}>{label}</span> : null}
      <div className={cx("pb-game__cover", !cover && "pb-game__cover--empty")} aria-hidden="true">
        {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="pb-game__initial">{initial}</span>}
      </div>
      <div className="pb-game__body">
        <div className="pb-game__name">{name}</div>
        {genre || meta ? (
          <div className="pb-game__row">
            {genre ? <span className="pb-pill">{genre}</span> : null}
            {meta ? <span className="pb-game__meta">{meta}</span> : null}
          </div>
        ) : null}
        <span className="pb-btn pb-btn--primary pb-btn--full" aria-hidden="true">
          {cta}
        </span>
      </div>
    </a>
  );
}
