import { Badge, Breadcrumb, Card, Empty, KeyValue, LinkButton, Section, formatDate, timeAgo } from "@op/site-ui";
import { DEMO_NOW, STATUS_LABEL, gameName, listingById, serverName } from "../demo-data";
import { FEE_PCT, PRICE_CEIL, PRICE_FLOOR, PRICE_UNIT, quote } from "../lib/market";
import { to, useTitle } from "../lib/nav";
import { DemoTag, LockedButton, LockedNote } from "../components/Preview";
import { NB, UnitPrice, Xu } from "../components/Num";

/** Bốn điều người mua cần biết trước khi chợ mở — cơ chế dự kiến, chưa chạy. */
const NOTES: { k: string; v: string }[] = [
  {
    k: "Ký gửi trước khi niêm yết",
    v: "Số Nguyên Bảo bị trừ khỏi nhân vật người bán ngay lúc đăng tin, không phải lúc bán được. Nhờ vậy tin đang rao luôn có hàng thật đứng sau; nếu bước trừ thất bại thì tin bị huỷ và người bán không mất gì.",
  },
  {
    k: "Phí trừ vào phần người bán nhận",
    v: `Người mua trả đúng số ở dòng Thành tiền. Cổng giữ lại ${FEE_PCT}% và người bán nhận phần còn lại — con số ấy hiện rõ cho người bán ngay ở bước xem trước, trước khi đăng.`,
  },
  {
    k: "Giá có sàn và trần",
    v: `Đơn giá phải nằm trong khoảng ${PRICE_FLOOR.toLocaleString("vi-VN")}–${PRICE_CEIL.toLocaleString("vi-VN")} Xu cho ${PRICE_UNIT.toLocaleString("vi-VN")} Nguyên Bảo. Trần bằng giá cửa hàng vì bán đắt hơn thì không ai mua; sàn chặn bán tháo và chặn chuyển Xu trá hình qua giá gần 0.`,
  },
  {
    k: "Huỷ tin thì hàng trả về qua thư",
    v: "Người bán huỷ tin chưa bán được thì số Nguyên Bảo đã ký gửi được gửi trả vào hòm thư trong game của chính nhân vật đó, không trả bằng Xu.",
  },
];

export function Listing({ id }: { id: string }) {
  const l = listingById(id);
  useTitle(l ? `Tin ${l.id}` : "Không tìm thấy tin");

  const crumb = [{ label: "Chợ", href: to("/") }, { label: l ? `Tin ${l.id}` : "Không tìm thấy" }];

  if (!l) {
    return (
      <main className="site-main">
        <Breadcrumb items={crumb} />
        <Section title="Không tìm thấy tin rao">
          <Empty>
            <p className="m-0">
              Mã <span className="font-mono">{id}</span> không có trong bộ dữ liệu mẫu của bản xem trước này.
            </p>
            <p className="m-0 mt-3">
              <LinkButton href={to("/")} variant="ghost">
                Về bảng tin rao
              </LinkButton>
            </p>
          </Empty>
        </Section>
      </main>
    );
  }

  const q = quote(l.amount, l.price);

  return (
    <main className="site-main">
      <Breadcrumb items={crumb} />

      <Section
        eyebrow={`${gameName(l.game)} · ${serverName(l.game, l.srv)}`}
        title={`Tin rao ${l.id}`}
        sub={`Đăng ${timeAgo(l.createdAt, DEMO_NOW)} — ${formatDate(l.createdAt)}`}
        action={<DemoTag />}
      >
        <div className="grid items-start gap-4 tb:grid-cols-[minmax(0,1fr)_320px]">
          <Card pad="lg">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={l.status === "active" ? "ok" : "muted"}>{STATUS_LABEL[l.status]}</Badge>
              <Badge tone="muted">{serverName(l.game, l.srv)}</Badge>
              {q.savedPct > 0 ? <Badge tone="gold">rẻ hơn cửa hàng {q.savedPct}%</Badge> : null}
            </div>

            <h3 className="mt-3">
              Gói <NB n={l.amount} /> từ người bán <span className="font-mono">{l.seller}</span>
            </h3>
            <p className="m-0 mt-2 text-[14px] text-fg-muted">
              Người bán đã ký gửi số Nguyên Bảo này; khi có người mua, hàng được giao vào hòm thư trong game của
              nhân vật người mua trên đúng máy chủ {serverName(l.game, l.srv)}.
            </p>

            <div className="mt-4">
              <KeyValue
                rows={[
                  { k: "Game", v: gameName(l.game) },
                  { k: "Máy chủ", v: serverName(l.game, l.srv) },
                  { k: "Người bán", v: <span className="font-mono">{l.seller}</span> },
                  { k: "Số lượng", v: <NB n={l.amount} /> },
                  { k: `Đơn giá (mỗi ${PRICE_UNIT.toLocaleString("vi-VN")} Nguyên Bảo)`, v: <UnitPrice n={l.price} /> },
                  { k: "Đăng lúc", v: formatDate(l.createdAt) },
                ]}
              />
            </div>
          </Card>

          <Card pad="lg">
            <h3>Tóm tắt đơn</h3>
            <div className="mt-3">
              <KeyValue
                rows={[
                  { k: "Người bán nhận", v: <Xu n={q.net} /> },
                  { k: `Phí sàn (${FEE_PCT}%)`, v: <Xu n={q.fee} tone="muted" /> },
                  { k: "Người mua trả", v: <Xu n={q.total} tone="gold" />, strong: true, tone: "gold" },
                ]}
              />
            </div>
            <p className="m-0 mt-3 text-[13px] text-fg-muted">
              Phí trừ vào phần người bán nhận, không cộng thêm vào số người mua trả.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <LockedButton full size="lg">
                Mua gói này
              </LockedButton>
              <LockedNote />
            </div>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Cơ chế dự kiến" title="Lưu ý" sub="Bốn quy tắc dưới đây sẽ áp dụng khi chợ mở giao dịch thật.">
        <div className="grid gap-3 tb:grid-cols-2">
          {NOTES.map((n) => (
            <Card key={n.k}>
              <h3 className="text-[15px]">{n.k}</h3>
              <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-fg-muted">{n.v}</p>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
