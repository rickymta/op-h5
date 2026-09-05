import type { ReactNode } from "react";

/**
 * Dải huy hiệu tin cậy dưới hero: icon + tiêu đề + dòng phụ. Chỉ ghi điều **đúng** với hệ này
 * ("hoàn Xu tự động", "giá niêm yết") — không hứa cái chưa có.
 *
 * Icon là emoji hoặc SVG; nó chỉ trang trí nên bọc `aria-hidden` để trình đọc màn hình đọc
 * thẳng tiêu đề. Điện thoại: một hàng cuộn ngang trong khung riêng, không đẩy rộng trang.
 */
export function TrustRow({ items }: { items: { icon?: ReactNode; title: string; note?: string }[] }) {
  return (
    <ul className="pb-trust">
      {items.map((it, i) => (
        <li className="pb-trust__i" key={`${it.title}-${i}`}>
          {it.icon ? (
            <span className="pb-trust__ic" aria-hidden="true">
              {it.icon}
            </span>
          ) : null}
          <span className="pb-trust__tx">
            <b className="pb-trust__t">{it.title}</b>
            {it.note ? <span className="pb-trust__n">{it.note}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
