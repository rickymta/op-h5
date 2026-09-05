/** Chân trang: tên nền tảng, liên kết (Điều khoản, Chính sách, Hỗ trợ…), và `note` pháp lý nhỏ. */
export function Footer({ brand, links, note }: { brand: string; links: { href: string; label: string }[]; note?: string }) {
  return (
    <footer className="pb-footer">
      <div className="pb-footer__in">
        <div className="pb-footer__row">
          <div className="pb-footer__brand">{brand}</div>
          {links.length ? (
            <ul className="pb-footer__links">
              {links.map((l) => (
                <li key={l.href + l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {note ? <p className="pb-footer__note">{note}</p> : null}
      </div>
    </footer>
  );
}
