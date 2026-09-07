import { Badge, Breadcrumb, DataTable, LinkButton, Msg, Section, StatCard, formatDate, timeAgo } from "@op/site-ui";
import type { DemoListing, DemoTrade, ListingStatus } from "../demo-data";
import { DEMO_MY_LISTINGS, DEMO_NOW, DEMO_TRADES, STATUS_LABEL, gameName, serverName } from "../demo-data";
import { FEE_PCT, MAX_OPEN_LISTINGS, quote } from "../lib/market";
import { to, useTitle } from "../lib/nav";
import { DemoTag, LockedButton } from "../components/Preview";
import { NB, UnitPrice, Xu } from "../components/Num";

const STATUS_TONE: Record<ListingStatus, "ok" | "warn" | "muted" | "danger" | "gold"> = {
  active: "ok",
  escrowing: "warn",
  sold: "gold",
  cancelled: "muted",
  void: "danger",
};

export function Mine() {
  useTitle("Tin rao của tôi");
  const open = DEMO_MY_LISTINGS.filter((l) => l.status === "active" || l.status === "escrowing");
  const sold = DEMO_MY_LISTINGS.filter((l) => l.status === "sold");
  const earned = DEMO_TRADES.filter((t) => t.kind === "sell").reduce((s, t) => s + t.xu, 0);

  return (
    <main className="site-main">
      <Breadcrumb items={[{ label: "Chợ", href: to("/") }, { label: "Tin rao của tôi" }]} />

      <Section
        eyebrow="Tài khoản mẫu hai***122"
        title="Tin rao của tôi"
        sub="Trang này chưa nối tài khoản thật; mọi dòng dưới đây thuộc bộ dữ liệu mẫu của bản xem trước."
        action={<DemoTag />}
      >
        <Msg tone="warn">
          <strong>Dữ liệu ví dụ.</strong> Đây không phải tin rao hay lịch sử của bạn — chợ chưa mở, chưa có tài
          khoản nào đăng bán được. Các nút “Huỷ tin” trong bảng đã bị khoá.
        </Msg>

        <div className="site-stat-grid mt-4">
          <StatCard
            label="Tin đang mở"
            value={`${open.length}/${MAX_OPEN_LISTINGS}`}
            hint="dữ liệu mẫu"
            tone="brand"
          />
          <StatCard label="Tin đã bán" value={String(sold.length)} hint="dữ liệu mẫu" />
          <StatCard label="Xu đã nhận" value={`${earned.toLocaleString("vi-VN")}`} hint="dữ liệu mẫu, đã trừ phí" tone="gold" />
          <StatCard label="Phí sàn" value={`${FEE_PCT}%`} hint="tham số thiết kế" />
        </div>
      </Section>

      <Section title="Tin rao" sub="Tin đang ký gửi là tin đã trừ Kim Cương nhưng chưa lên bảng.">
        <DataTable<DemoListing>
          rows={DEMO_MY_LISTINGS}
          rowKey={(r) => r.id}
          empty="Chưa có tin rao nào."
          columns={[
            {
              key: "id",
              title: "Mã tin",
              render: (r) => (
                // Mã tin để nguyên chữ, không làm liên kết: một dòng chữ cao 15 px là vùng chạm
                // quá nhỏ trên điện thoại. Đường vào trang chi tiết là nút ở cột Thao tác.
                <div className="min-w-0">
                  <div className="font-mono text-[13px] text-fg">{r.id}</div>
                  <div className="mt-0.5 truncate text-2xs text-fg-faint">
                    {gameName(r.game)} · {serverName(r.game, r.srv)} · {timeAgo(r.createdAt, DEMO_NOW)}
                  </div>
                </div>
              ),
            },
            { key: "amount", title: "Số lượng", align: "right", width: "140px", render: (r) => <NB n={r.amount} /> },
            { key: "price", title: "Đơn giá", align: "right", width: "150px", render: (r) => <UnitPrice n={r.price} /> },
            {
              key: "net",
              title: "Nhận được",
              align: "right",
              width: "140px",
              render: (r) => <Xu n={quote(r.amount, r.price).net} tone="gold" />,
            },
            {
              key: "status",
              title: "Trạng thái",
              width: "120px",
              render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
            },
            {
              key: "act",
              title: "Thao tác",
              align: "right",
              width: "200px",
              render: (r) => (
                <div className="flex items-center justify-end gap-2">
                  <LinkButton href={to(`/tin/${r.id}`)} variant="ghost">
                    Chi tiết
                  </LinkButton>
                  {r.status === "active" || r.status === "escrowing" ? (
                    <LockedButton variant="danger">Huỷ tin</LockedButton>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Lịch sử giao dịch" sub="Số Xu ở cột cuối là số thực nhận (bán) hoặc số đã trả (mua).">
        <DataTable<DemoTrade>
          rows={DEMO_TRADES}
          rowKey={(r) => r.id}
          empty="Chưa có giao dịch nào."
          columns={[
            {
              key: "id",
              title: "Mã",
              render: (r) => (
                <div className="min-w-0">
                  <div className="font-mono text-[13px] text-fg">{r.id}</div>
                  <div className="mt-0.5 truncate text-2xs text-fg-faint">{formatDate(r.at)}</div>
                </div>
              ),
            },
            {
              key: "kind",
              title: "Loại",
              width: "100px",
              render: (r) => <Badge tone={r.kind === "sell" ? "gold" : "brand"}>{r.kind === "sell" ? "Bán" : "Mua"}</Badge>,
            },
            {
              key: "pack",
              title: "Gói",
              align: "right",
              width: "160px",
              render: (r) => (
                <div>
                  <NB n={r.amount} />
                  <div className="mt-0.5 text-2xs text-fg-faint">{serverName(r.game, r.srv)}</div>
                </div>
              ),
            },
            { key: "price", title: "Đơn giá", align: "right", width: "150px", render: (r) => <UnitPrice n={r.price} /> },
            { key: "xu", title: "Xu", align: "right", width: "140px", render: (r) => <Xu n={r.xu} tone="gold" /> },
            {
              key: "who",
              title: "Đối tác",
              align: "right",
              width: "130px",
              hideOnMobile: true,
              render: (r) => <span className="font-mono text-[13px] text-fg-muted">{r.counterparty}</span>,
            },
          ]}
        />

        <p className="mt-4">
          <LinkButton href={to("/")} variant="ghost">
            Về bảng tin rao
          </LinkButton>
        </p>
      </Section>
    </main>
  );
}
