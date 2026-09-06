import type { ReactNode } from "react";
import { Button } from "@op/site-ui";
import { NOT_OPEN } from "../lib/nav";

/**
 * Dải "bản xem trước" ở đầu mọi trang.
 *
 * Đợt này chợ **chỉ có giao diện**: dữ liệu là bộ mẫu nằm trong bundle, chưa có backend, chưa
 * đụng ví. Người xem phải biết điều đó ngay dòng đầu — một trang chợ trông thật mà bấm mua
 * không được là cách nhanh nhất làm mất lòng tin. Vì thế dải này không tắt được, không thu gọn.
 */
export function PreviewBanner() {
  return (
    <div className="border-b border-warn-500/40 bg-warn-bg">
      <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-2.5 tb:flex-row tb:items-center tb:gap-3 tb:px-6">
        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-warn-500 px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-warn-400">
          Bản xem trước
        </span>
        <p className="m-0 text-[13px] leading-snug text-warn-400">
          Trang chợ đang dựng giao diện. Mọi tin rao, tên người bán và con số trên trang là{" "}
          <strong className="font-semibold">dữ liệu mẫu</strong>; các nút mua, bán, huỷ đều đã bị khoá và
          chưa có giao dịch thật nào diễn ra.
        </p>
      </div>
    </div>
  );
}

/**
 * Nút thao tác tiền đang khoá. Luôn `disabled`, luôn kèm `title` + nhãn cho trình đọc màn hình,
 * để không đường nào — chuột, bàn phím, trình đọc — hiểu nhầm là bấm được.
 */
export function LockedButton({
  children,
  full,
  size,
  variant = "primary",
}: {
  children: ReactNode;
  full?: boolean;
  size?: "md" | "lg";
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <Button
      type="button"
      disabled
      variant={variant}
      size={size}
      full={full}
      title={NOT_OPEN}
      aria-label={`${typeof children === "string" ? children : "Thao tác"} — ${NOT_OPEN}`}
    >
      {children}
    </Button>
  );
}

/** Dòng giải thích đặt ngay dưới một nút khoá. */
export function LockedNote({ children }: { children?: ReactNode }) {
  return (
    <p className="m-0 text-[13px] leading-snug text-fg-faint">
      {children ?? `${NOT_OPEN}. Nút trên trang chỉ để xem bố cục.`}
    </p>
  );
}

/** Nhãn nhỏ gắn cạnh tiêu đề một khối lấy số từ bộ mẫu. */
export function DemoTag({ children = "dữ liệu mẫu" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-ink-800 px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-fg-faint">
      {children}
    </span>
  );
}
