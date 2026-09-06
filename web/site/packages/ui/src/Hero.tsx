import type { CSSProperties, ReactNode } from "react";

/** Tối màu hex đi ~18% cho trạng thái hover của nút chính khi game có màu nhấn riêng. */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.max(0, Math.round(v * 0.82))
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/**
 * Biến CSS inline để eyebrow/nút đổi theo `accent` của game; hex sai thì bỏ qua.
 * Chỉ có game mới cần: portal và chợ luôn dùng `brand-500`.
 */
function accentVars(accent?: string): CSSProperties | undefined {
  if (!accent || !/^#[0-9a-fA-F]{6}$/.test(accent)) return undefined;
  return { "--accent": accent, "--accent-dim": darken(accent) } as CSSProperties;
}

/**
 * Khối đầu trang full-bleed. `image` là key visual phủ lớp dốc tối (veil) để chữ luôn đọc được;
 * không có ảnh thì nền dốc từ `ink-800`. `logo` hiện to phía trên tiêu đề. `children` đặt dưới
 * hàng nút (gợi ý máy chủ, ghi chú "chưa có tài khoản…").
 *
 * Lớp phủ là hai dốc chồng nhau — ngang (trái đậm) và dọc (đáy đậm) — nên chữ ở góc dưới-trái
 * đọc được bất kể ảnh sáng ở đâu.
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
    <section
      className="relative isolate flex min-h-[52vh] items-end overflow-hidden border-b border-line bg-gradient-to-b from-ink-800 to-ink-900 tb:min-h-[min(70vh,560px)]"
      style={accentVars(accent)}
    >
      {image ? (
        <>
          <div
            className="absolute inset-0 -z-20 bg-cover bg-no-repeat"
            style={{ backgroundImage: `url("${image}")`, backgroundPosition: "center 30%" }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 -z-10"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(11,15,20,0.72) 0%, rgba(11,15,20,0.3) 55%, rgba(11,15,20,0) 100%)," +
                "linear-gradient(180deg, rgba(11,15,20,0.3) 0%, rgba(11,15,20,0.68) 55%, #0B0F14 100%)",
            }}
          />
        </>
      ) : null}

      <div className="relative mx-auto w-full max-w-content px-4 pb-8 pt-10 tb:px-6 tb:pb-[52px] tb:pt-16">
        {logo ? (
          <img
            className="mb-3.5 h-auto max-h-[84px] w-auto max-w-[min(340px,80%)] drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] tb:mb-5 tb:max-h-[120px]"
            src={logo}
            alt=""
          />
        ) : null}
        {eyebrow ? (
          <p className="mb-2.5 font-mono text-[11.5px] uppercase tracking-[0.16em] text-[color:var(--accent,theme(colors.brand.500))]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mb-3.5 max-w-[16ch] text-balance text-[30px] [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] tb:text-[clamp(30px,5vw,52px)]">
          {title}
        </h1>
        {lead ? <p className="mb-6 max-w-[56ch] text-[15.5px] leading-normal text-fg-muted tb:text-[17px]">{lead}</p> : null}
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        {children ? <div className="mt-[18px] text-sm text-fg-muted">{children}</div> : null}
      </div>
    </section>
  );
}
