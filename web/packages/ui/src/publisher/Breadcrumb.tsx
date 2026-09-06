/**
 * Đường dẫn phân cấp: "Cửa hàng › Gói Tân Thủ". Mục cuối là trang hiện tại — không đặt `href`,
 * nó được đánh dấu `aria-current="page"`. Dấu `›` do CSS vẽ nên trình đọc màn hình không đọc.
 * Danh sách rỗng thì `<nav>` trống và CSS `:empty` giấu đi (không để lại khoảng hở).
 */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="pb-crumbs" aria-label="Đường dẫn">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return it.href && !last ? (
          <a className="pb-crumbs__i" href={it.href} key={`${it.label}-${i}`}>
            {it.label}
          </a>
        ) : (
          <span className="pb-crumbs__i is-cur" key={`${it.label}-${i}`} aria-current={last ? "page" : undefined}>
            {it.label}
          </span>
        );
      })}
    </nav>
  );
}
