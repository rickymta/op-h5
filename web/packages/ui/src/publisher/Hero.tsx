import type { CSSProperties, ReactNode } from "react";

/** Tối màu hex đi ~18% cho trạng thái hover của nút chính khi game có màu nhấn riêng. */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.round(v * 0.82)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** Biến CSS inline để eyebrow/nút đổi theo `accent` của game; hex sai thì bỏ qua. */
function accentVars(accent?: string): CSSProperties | undefined {
  if (!accent || !/^#[0-9a-fA-F]{6}$/.test(accent)) return undefined;
  return { "--accent": accent, "--accent-dim": darken(accent) } as CSSProperties;
}

/**
 * Khối đầu trang full-bleed. `image` là key visual phủ lớp dốc tối (veil) để chữ luôn đọc được;
 * không có ảnh thì nền gradient từ `--surface-2`. `logo` hiện to phía trên tiêu đề. `children`
 * đặt dưới hàng nút (gợi ý máy chủ, ghi chú "chưa có tài khoản…").
 */
export function Hero({
  image,
  logo,
  eyebrow,
  title,
  lead,
  actions,
  children,
  accent,
}: {
  image?: string;
  logo?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  children?: ReactNode;
  accent?: string;
}) {
  return (
    <section className="pb-hero" style={accentVars(accent)}>
      {image ? (
        <>
          <div className="pb-hero__art" style={{ backgroundImage: `url("${image}")` }} aria-hidden="true" />
          <div className="pb-hero__veil" aria-hidden="true" />
        </>
      ) : null}
      <div className="pb-hero__in">
        {logo ? <img className="pb-hero__logo" src={logo} alt="" /> : null}
        {eyebrow ? <p className="pb-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lead ? <p className="pb-lead">{lead}</p> : null}
        {actions ? <div className="pb-hero__actions">{actions}</div> : null}
        {children ? <div className="pb-hero__more">{children}</div> : null}
      </div>
    </section>
  );
}
