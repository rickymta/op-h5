// Mảnh giao diện dùng lại giữa các trang của trang game (không đủ chung để đưa vào @op/site-ui).
//
// Bố cục giữ nguyên bản cũ (`web/apps/game/src/parts.tsx` + `game.css`); chỉ đổi cách tô màu:
// mọi giá trị màu nay là lớp Tailwind lấy từ bảng màu chuẩn trong preset dùng chung.
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { BandPill, Card, Empty, Msg, ServerRow, cx, formatInt } from "@op/site-ui";
import { errText, type Meta, type Pkg, type ServersResponse } from "./api";

/** Khung nội dung của mọi trang — thay cho `.pb-main` (rộng tối đa 1180, chừa 72px dưới chân). */
export function Main({ children }: { children: ReactNode }) {
  return <main className="site-main">{children}</main>;
}

/** Chữ nhỏ in hoa trên tiêu đề — thay cho `.pb-eyebrow`. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 font-mono text-[11.5px] uppercase tracking-[0.16em] text-brand-500">{children}</p>;
}

/** Đầu trang con: eyebrow, h1, lead — cùng nhịp với các trang Go cũ. */
export function PageHead({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="pt-7 tb:pt-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="m-0 mb-3 text-[28px] font-semibold leading-tight text-fg tb:text-[36px]">{title}</h1>
      {lead ? <p className="m-0 mb-[18px] max-w-[56ch] text-[17px] leading-[1.5] text-fg-muted">{lead}</p> : null}
      {children}
    </header>
  );
}

export function Loading({ text = "Đang tải…" }: { text?: string }) {
  return (
    <p className="m-0 py-2 text-sm text-fg-muted" aria-busy="true">
      {text}
    </p>
  );
}

/** Danh sách máy chủ trong một Card, đủ ba trạng thái tải/lỗi/rỗng. */
export function ServerList({ q, emptyText }: { q: UseQueryResult<ServersResponse>; emptyText: string }) {
  const list = q.data?.servers ?? [];
  return (
    <Card>
      {q.isPending ? (
        <Loading text="Đang đọc danh sách máy chủ…" />
      ) : q.isError ? (
        <Msg tone="warn">{emptyText}</Msg>
      ) : list.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        list.map((s) => (
          <ServerRow
            key={s.code}
            name={s.name}
            code={s.code}
            online={formatInt(s.online)}
            band={s.band}
            label={s.label}
            recommend={s.recommend}
          />
        ))
      )}
    </Card>
  );
}

/** Chú thích ba dải Mượt/Đông/Đầy — nguyên văn servers.html. */
export function BandLegend() {
  return (
    <Card>
      <h3 className="m-0 text-[15.5px] font-semibold text-fg">Ba dải trạng thái nghĩa là gì</h3>
      <div className="mt-3 grid gap-2.5 text-[14.5px]">
        <div className="flex flex-wrap items-baseline gap-2">
          <BandPill band="smooth" label="Mượt" />
          <span className="text-fg-muted">— còn nhiều chỗ, nhận cả người chơi mới.</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <BandPill band="busy" label="Đông" />
          <span className="text-fg-muted">— vẫn vào được, nhưng người mới nên chọn máy khác.</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <BandPill band="full" label="Đầy" />
          <span className="text-fg-muted">— tạm không nhận thêm phiên mới. Người đang chơi không bị ảnh hưởng.</span>
        </div>
      </div>
    </Card>
  );
}

/** "Người mới nên vào Đông Hải · Mượt" — từ `meta.recommended` (AdmitNew phía Adapter). */
export function RecommendHint({ meta }: { meta?: Meta }) {
  const r = meta?.recommended;
  if (!r) return null;
  return (
    <p className="m-0 flex flex-wrap items-center gap-1.5 text-fg-muted">
      Người mới nên vào <b className="font-semibold text-fg">{r.name}</b> · <BandPill band={r.band} label={r.label} />
    </p>
  );
}

/** Lưới ô gói — hai cột ở điện thoại, tự xếp từ 230px ở màn rộng (ngưỡng cũ của store.html). */
export function PkgGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 xs:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] xs:gap-3.5">
      {children}
    </div>
  );
}

/**
 * Một ô gói. `onPick` → nút (cửa hàng, mở hộp xác nhận); `href` → liên kết (trang chủ, dẫn
 * sang cửa hàng). `poor` = thiếu Xu, giá đổi sang đỏ như store.html.
 */
export function PkgCard({ p, poor, onPick, href }: { p: Pkg; poor?: boolean; onPick?: (p: Pkg) => void; href?: string }) {
  const body = (
    <>
      {p.badge ? (
        <span className="absolute right-2.5 top-2.5 rounded bg-brand-500 px-[7px] py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-white">
          {p.badge}
        </span>
      ) : null}
      <span className={cx("text-[14.5px] font-semibold leading-snug xs:text-[15.5px]", p.badge && "pr-11")}>{p.name}</span>
      {p.description ? <span className="line-clamp-3 text-[13px] leading-[1.45] text-fg-muted">{p.description}</span> : null}
      {p.cond ? <span className="font-mono text-[11.5px] text-warn-400">{p.cond}</span> : null}
      <span className={cx("mt-auto pt-1.5 font-mono text-[15px] nums", poor ? "text-danger-400" : "text-gold-400")}>
        {p.price_fmt} Xu
      </span>
    </>
  );
  const cls =
    "relative flex min-h-touch flex-col gap-1.5 rounded-xl border border-line bg-ink-850 p-3 text-left text-fg no-underline transition hover:-translate-y-0.5 hover:border-gold-400 hover:no-underline xs:p-4";
  if (href) {
    return (
      <a className={cls} href={href}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => onPick?.(p)}>
      {body}
    </button>
  );
}

/** Một dòng đơn mua — dùng ở cửa hàng và ở trang chi tiết sau khi mua. */
const ORDER_TONE: Record<string, string> = {
  granted: "bg-ok-bg text-ok-400",
  pending: "bg-warn-bg text-warn-400",
  failed: "bg-danger-bg text-danger-400",
  refunded: "bg-danger-bg text-danger-400",
};
export function OrderRow({ name, meta, status, statusVi }: { name: string; meta: string; status: string; statusVi: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 border-b border-line py-2.5 text-sm last:border-b-0">
      <div>
        {name}
        <div className="mt-0.5 font-mono text-xs text-fg-muted">{meta}</div>
      </div>
      <span
        className={cx(
          "self-center whitespace-nowrap rounded-full px-2.5 py-[3px] font-mono text-[11.5px]",
          ORDER_TONE[status] ?? "bg-ink-800 text-fg-muted",
        )}
      >
        {statusVi}
      </span>
    </div>
  );
}

/** Danh sách gạch đầu dòng "Lưu ý" — chấm đầu dòng lấy màu nhấn. */
export function Notes({ children }: { children: ReactNode }) {
  return <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-[14.5px] text-fg-muted marker:text-brand-500">{children}</ul>;
}

/** Tiêu đề trong thẻ. Nhỏ hơn `h3` mặc định của base.css — giữ đúng nhịp chữ của bản cũ. */
export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="m-0 mb-3 text-[15.5px] font-semibold text-fg">{children}</h3>;
}

/** Hàng nút cuối trang. */
export function Actions({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return <div className={cx("flex flex-wrap gap-3", tight ? "mt-0" : "mt-[22px]")}>{children}</div>;
}

/** Liên kết chữ trong nội dung — vùng chạm cao 44px, màu vàng đồng như mọi liên kết văn xuôi. */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="inline-flex min-h-touch items-center" href={href}>
      {children}
    </a>
  );
}

export function QueryError({ error, prefix }: { error: unknown; prefix?: string }) {
  return (
    <Msg tone="err">
      {prefix ? `${prefix}: ` : ""}
      {errText(error, "Mất kết nối tới máy chủ.")}
    </Msg>
  );
}
