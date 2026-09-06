/** Chân trang: tên nền tảng, liên kết (Điều khoản, Chính sách, Hỗ trợ…), và `note` pháp lý nhỏ. */
export function Footer({
  brand,
  links,
  note,
}: {
  brand: string;
  links: { href: string; label: string }[];
  note?: string;
}) {
  return (
    <footer className="mt-11 border-t border-line px-4 pb-9 pt-6 text-[13.5px] text-fg-muted tb:mt-16 tb:px-6 tb:pb-10 tb:pt-7">
      <div className="mx-auto max-w-content">
        <div className="flex flex-col flex-wrap items-start justify-between gap-x-6 gap-y-3 tb:flex-row tb:items-center">
          <div className="text-[15px] font-bold text-fg">{brand}</div>
          {links.length ? (
            <ul className="m-0 flex list-none flex-wrap gap-x-1.5 gap-y-1 p-0">
              {links.map((l) => (
                <li key={l.href + l.label}>
                  {/* Vùng chạm 44 px dù chữ nhỏ — chân trang là nơi người ta bấm nhầm nhiều nhất. */}
                  <a
                    className="inline-flex min-h-touch items-center px-2 text-fg-muted no-underline hover:text-fg hover:no-underline"
                    href={l.href}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {note ? <p className="mb-0 mt-3.5 max-w-[80ch] text-[12.5px] leading-relaxed text-fg-muted">{note}</p> : null}
      </div>
    </footer>
  );
}
