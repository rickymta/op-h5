import type { ReactNode } from "react";
import { cx } from "./cx";

const ITEM =
  "inline-flex min-h-touch items-center no-underline tb:min-h-9 " +
  // Dấu `›` do CSS vẽ nên trình đọc màn hình không đọc thành chữ.
  "before:mx-2 before:text-fg-muted before:opacity-60 before:content-['›'] first:before:content-none";

/**
 * Đường dẫn phân cấp: "Cửa hàng › Gói Tân Thủ". Mục cuối là trang hiện tại — không đặt `href`,
 * nó được đánh dấu `aria-current="page"`. Danh sách rỗng thì không vẽ gì.
 */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  if (!items.length) return null;
  return (
    <nav className="mb-2.5 flex flex-wrap items-center text-[12.5px] tb:mb-3.5 tb:text-[13px]" aria-label="Đường dẫn">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return it.href && !last ? (
          <a className={cx(ITEM, "text-fg-muted hover:text-gold-400 hover:no-underline")} href={it.href} key={`${it.label}-${i}`}>
            {it.label}
          </a>
        ) : (
          <span className={cx(ITEM, "text-fg")} key={`${it.label}-${i}`} aria-current={last ? "page" : undefined}>
            {it.label}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Dải huy hiệu tin cậy dưới hero: icon + tiêu đề + dòng phụ. Chỉ ghi điều **đúng** với hệ này
 * ("hoàn Xu tự động", "giá niêm yết") — không hứa cái chưa có.
 *
 * Icon là emoji hoặc SVG; nó chỉ trang trí nên bọc `aria-hidden` để trình đọc màn hình đọc
 * thẳng tiêu đề. Điện thoại: mỗi mục chiếm cả dòng, không bóp chữ.
 */
export function TrustRow({ items }: { items: { icon?: ReactNode; title: string; note?: string }[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2.5 p-0 xs:gap-x-[26px] xs:gap-y-3">
      {items.map((it, i) => (
        <li className="flex min-w-0 flex-[1_1_100%] items-center gap-2.5 xs:flex-[0_1_auto]" key={`${it.title}-${i}`}>
          {it.icon ? (
            <span
              className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-line bg-ink-800 text-base text-gold-400"
              aria-hidden="true"
            >
              {it.icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col">
            <b className="text-sm font-semibold">{it.title}</b>
            {it.note ? <span className="text-[12.5px] text-fg-muted">{it.note}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Nhãn + ô nhập. Nhãn gắn ô qua `htmlFor`; ô nhập do app tự viết và ăn kiểu dáng từ base.css. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[13px] font-medium text-fg-muted" htmlFor={htmlFor}>
        {label}
        {hint ? <span className="ml-1.5 font-normal opacity-85">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
