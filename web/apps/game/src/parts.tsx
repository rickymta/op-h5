// Mảnh giao diện dùng lại giữa các trang của app game (không đủ chung để đưa vào @op/ui).
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { BandPill, Card, Empty, Msg, ServerRow, formatInt } from "@op/ui/publisher";
import { errText, type Meta, type Pkg, type ServersResponse } from "./api";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Đầu trang con: eyebrow, h1, lead — cùng nhịp với các trang Go cũ. */
export function PageHead({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="gm-page">
      <p className="pb-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {lead ? <p className="pb-lead">{lead}</p> : null}
      {children}
    </header>
  );
}

export function Loading({ text = "Đang tải…" }: { text?: string }) {
  return (
    <p className="gm-loading" aria-busy="true">
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
      <h3>Ba dải trạng thái nghĩa là gì</h3>
      <div className="gm-legend">
        <div>
          <BandPill band="smooth" label="Mượt" />
          <span className="pb-muted">— còn nhiều chỗ, nhận cả người chơi mới.</span>
        </div>
        <div>
          <BandPill band="busy" label="Đông" />
          <span className="pb-muted">— vẫn vào được, nhưng người mới nên chọn máy khác.</span>
        </div>
        <div>
          <BandPill band="full" label="Đầy" />
          <span className="pb-muted">— tạm không nhận thêm phiên mới. Người đang chơi không bị ảnh hưởng.</span>
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
    <p className="gm-hint">
      Người mới nên vào <b>{r.name}</b> · <BandPill band={r.band} label={r.label} />
    </p>
  );
}

/**
 * Một ô gói. `onPick` → nút (cửa hàng, mở hộp xác nhận); `href` → liên kết (trang chủ, dẫn
 * sang cửa hàng). `poor` = thiếu Xu, giá đổi sang đỏ như store.html.
 */
export function PkgCard({ p, poor, onPick, href }: { p: Pkg; poor?: boolean; onPick?: (p: Pkg) => void; href?: string }) {
  const body = (
    <>
      {p.badge ? <span className="gm-pkg__badge">{p.badge}</span> : null}
      <span className="gm-pkg__nm">{p.name}</span>
      {p.description ? <span className="gm-pkg__desc">{p.description}</span> : null}
      {p.cond ? <span className="gm-pkg__cond">{p.cond}</span> : null}
      <span className="gm-pkg__price">{p.price_fmt} Xu</span>
    </>
  );
  const cls = cx("gm-pkg", poor && "poor");
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

/** Thân tin: đoạn cách nhau bằng dòng trống; xuống dòng đơn giữ nguyên (pre-line). */
export function Paragraphs({ text }: { text: string }) {
  const paras = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="gm-article__body">
      {paras.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
    </div>
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
