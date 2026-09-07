// Trang mẫu: dựng mọi thành phần của @op/site-ui với dữ liệu tiếng Việt.
// Không nằm trong bản build của app nào; chỉ để soi bố cục và đo (375 px, gzip, vùng chạm).
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Badge,
  BandPill,
  Breadcrumb,
  Button,
  Card,
  DataTable,
  Empty,
  Field,
  FilterBar,
  Footer,
  GameCard,
  Hero,
  KeyValue,
  LinkButton,
  Modal,
  Msg,
  NewsList,
  Pagination,
  QuickPick,
  RichText,
  SearchField,
  Section,
  SelectField,
  ServerRow,
  StatCard,
  Steps,
  Toast,
  TopBar,
  TrustRow,
  formatDate,
  formatInt,
  useToast,
  type Column,
} from "@op/site-ui";
import "@op/site-ui/base.css";

type Order = { id: number; pkg: string; srv: string; xu: number; status: string; at: string };

const ORDERS: Order[] = [
  { id: 90211, pkg: "Gói Tân Thủ", srv: "S1 · Hải Tặc", xu: 20000, status: "granted", at: "2026-09-05T14:03:00+07:00" },
  { id: 90210, pkg: "Kim Cương 6.480", srv: "S3 · Vịnh Bão", xu: 150000, status: "pending", at: "2026-09-05T09:41:00+07:00" },
  { id: 90204, pkg: "Thẻ Tháng", srv: "S1 · Hải Tặc", xu: 50000, status: "refunded", at: "2026-09-02T21:12:00+07:00" },
  { id: 90188, pkg: "Quỹ Trưởng Thành", srv: "S2 · Đảo Xương", xu: 98000, status: "failed", at: "2026-08-29T08:00:00+07:00" },
];

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "muted" }> = {
  granted: { label: "Đã phát", tone: "ok" },
  pending: { label: "Đang xử lý", tone: "warn" },
  failed: { label: "Thất bại", tone: "danger" },
  refunded: { label: "Đã hoàn Xu", tone: "muted" },
};

const COLUMNS: Column<Order>[] = [
  { key: "id", title: "Mã đơn", width: "110px", render: (r) => <span className="font-mono">#{r.id}</span> },
  {
    key: "pkg",
    title: "Gói",
    render: (r) => (
      <>
        <div className="font-semibold">{r.pkg}</div>
        <div className="text-[12.5px] text-fg-muted">{r.srv}</div>
      </>
    ),
  },
  { key: "at", title: "Thời điểm", hideOnMobile: true, render: (r) => <span className="text-fg-muted">{formatDate(r.at)}</span> },
  { key: "xu", title: "Số Xu", align: "right", width: "120px", render: (r) => <span className="font-mono text-gold-400">{formatInt(r.xu)}</span> },
  {
    key: "status",
    title: "Trạng thái",
    align: "right",
    width: "130px",
    render: (r) => {
      const s = STATUS[r.status] ?? { label: r.status, tone: "muted" as const };
      return <Badge tone={s.tone}>{s.label}</Badge>;
    },
  },
];

const BODY = `## Cách nạp Xu

Xu là đơn vị trung gian của nền tảng. Bạn nạp Xu một lần rồi dùng cho mọi trò chơi trong hệ thống, không phải nạp riêng từng game.

- Nạp qua ngân hàng: tiền vào ví trong vòng một phút.
- Nạp qua thẻ cào: hệ thống trừ phí nhà mạng theo bảng niêm yết.
- Đơn thất bại được hoàn Xu tự động, không cần liên hệ hỗ trợ.

## Giới hạn

Mỗi tài khoản nạp tối đa [số tiền] mỗi ngày. Vượt mức này cần liên hệ [kênh hỗ trợ] để mở khoá.`;

function App() {
  const [tab, setTab] = useState("all");
  const [srv, setSrv] = useState("s1");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(4);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast, show } = useToast();

  return (
    <>
      <TopBar
        brand="Ant Farms"
        links={[
          { href: "#tro-choi", label: "Trò chơi", active: true },
          { href: "#cho", label: "Chợ" },
          { href: "#tin-tuc", label: "Tin tức" },
          { href: "#ho-tro", label: "Hỗ trợ" },
        ]}
        right={
          <>
            <span className="hidden font-mono text-[12.5px] text-gold-400 xs:inline">quan · 1.240.000 Xu</span>
            <LinkButton href="#nap" variant="ghost">
              Nạp Xu
            </LinkButton>
          </>
        }
        notice={{ text: "Bảo trì máy chủ S2 · Đảo Xương từ 03:00 đến 05:00 ngày 07/09.", href: "#thong-bao" }}
      />

      <Hero
        eyebrow="Đại Hải Trình"
        title="Ra khơi cùng thuỷ thủ đoàn của bạn"
        lead="Game đấu tướng nhàn rỗi trên trình duyệt. Không tải, không cài đặt — mở là chơi."
        logo=""
        actions={
          <>
            <LinkButton href="#choi" size="lg">
              Chơi ngay
            </LinkButton>
            <LinkButton href="#gioi-thieu" variant="ghost" size="lg">
              Xem giới thiệu
            </LinkButton>
          </>
        }
      >
        Chưa có tài khoản? Bấm “Chơi ngay”, hệ thống tự tạo giúp bạn.
      </Hero>

      <main className="site-main">
        <Section eyebrow="Số liệu" title="Nền tảng đang chạy" sub="Cập nhật mỗi phút từ adapter.">
          <div className="site-stat-grid">
            <StatCard label="Đang chơi" value={formatInt(12480)} hint="toàn hệ thống" />
            <StatCard label="Máy chủ mở" value="18" tone="ok" />
            <StatCard label="Số dư ví" value={formatInt(1240000)} tone="gold" hint="Xu" />
            <StatCard label="Đơn chờ" value="2" tone="warn" hint="đang phát vật phẩm" />
          </div>
          <div className="mt-4">
            <TrustRow
              items={[
                { icon: "↺", title: "Hoàn Xu tự động", note: "đơn hỏng hoàn trong 5 phút" },
                { icon: "₫", title: "Giá niêm yết", note: "không phụ thu, không đổi giá" },
                { icon: "☎", title: "Hỗ trợ 8h–22h", note: "mỗi ngày, kể cả cuối tuần" },
              ]}
            />
          </div>
        </Section>

        <Section eyebrow="Danh mục" title="Trò chơi" action={<a href="#tat-ca">Xem tất cả →</a>} id="tro-choi">
          <div className="site-game-grid">
            <GameCard name="Đại Hải Trình" genre="Đấu tướng" badge="hot" href="#g1" meta="12.4k đang chơi" />
            <GameCard name="Tam Quốc Nhàn Rỗi" genre="Idle" badge="new" href="#g2" />
            <GameCard name="Vương Quốc Băng" genre="Chiến thuật" badge="soon" href="#g3" cta="Đăng ký trước" />
            <GameCard name="Kiếm Hiệp Tình" genre="Nhập vai" href="#g4" meta="3.1k đang chơi" />
          </div>
        </Section>

        <Section eyebrow="Máy chủ" title="Chọn máy chủ" sub="Ba dải trạng thái: Mượt, Đông, Đầy.">
          <Card>
            <ServerRow name="S1 · Hải Tặc" code="s1" online={formatInt(4820)} band="smooth" label="Mượt" recommend />
            <ServerRow name="S2 · Đảo Xương" code="s2" online={formatInt(9130)} band="busy" label="Đông" />
            <ServerRow name="S3 · Vịnh Bão" code="s3" online={formatInt(12000)} band="full" label="Đầy" />
            <ServerRow name="S4 · Mũi Kim" code="s4" online="—" band="unknown" label="Chưa rõ" />
          </Card>
        </Section>

        <Section eyebrow="Tài khoản" title="Lịch sử đơn" id="bang">
          <Breadcrumb items={[{ label: "Tài khoản", href: "#tk" }, { label: "Ví", href: "#vi" }, { label: "Lịch sử đơn" }]} />
          <FilterBar
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setSrv("s1");
                  setQ("");
                  setPage(1);
                }}
              >
                Đặt lại
              </Button>
            }
          >
            <SearchField value={q} onChange={setQ} onSubmit={() => show(`Tìm: ${q || "(trống)"}`)} placeholder="Mã đơn hoặc tên gói" />
            <SelectField
              label="Máy chủ"
              value={srv}
              onChange={setSrv}
              options={[
                { value: "s1", label: "S1 · Hải Tặc" },
                { value: "s2", label: "S2 · Đảo Xương" },
                { value: "s3", label: "S3 · Vịnh Bão" },
              ]}
            />
            <SelectField
              label="Sắp xếp"
              value="new"
              onChange={() => {}}
              options={[
                { value: "new", label: "Mới nhất" },
                { value: "old", label: "Cũ nhất" },
              ]}
            />
          </FilterBar>

          <div className="mb-3">
            <QuickPick
              ariaLabel="Lọc nhanh theo trạng thái"
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "granted", label: "Đã phát" },
                { value: "pending", label: "Đang xử lý" },
                { value: "refunded", label: "Đã hoàn" },
              ]}
            />
          </div>

          <DataTable columns={COLUMNS} rows={loading ? [] : ORDERS} rowKey={(r) => String(r.id)} loading={loading} />
          <Pagination page={page} pages={20} onChange={setPage} />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setLoading((v) => !v)}>
              {loading ? "Tắt trạng thái đang tải" : "Bật trạng thái đang tải"}
            </Button>
            <Button onClick={() => setOpen(true)}>Mở hộp thoại</Button>
            <Button variant="danger" onClick={() => show("Không huỷ được đơn đã phát.", true)}>
              Báo lỗi thử
            </Button>
          </div>
        </Section>

        <Section eyebrow="Mua gói" title="Luồng bốn bước" id="buoc">
          <Steps steps={["Chọn gói", "Nhân vật", "Xác nhận", "Nhận hàng"]} current={3} />
          <div className="mt-5 grid gap-4 tb:grid-cols-2">
            <Card>
              <h3 className="mb-3">Tóm tắt đơn</h3>
              <KeyValue
                rows={[
                  { k: "Gói", v: "Kim Cương 6.480" },
                  { k: "Máy chủ", v: "S1 · Hải Tặc" },
                  { k: "Nhân vật", v: "ThuyThuTruong" },
                  { k: "Giá", v: `${formatInt(150000)} Xu`, tone: "gold" },
                  { k: "Số dư sau", v: `${formatInt(1090000)} Xu`, strong: true, tone: "gold" },
                ]}
              />
            </Card>
            <Card>
              <h3 className="mb-3">Biểu mẫu</h3>
              <Field label="Tên nhân vật" hint="đúng như trong game" htmlFor="d-name">
                <input id="d-name" defaultValue="ThuyThuTruong" />
              </Field>
              <Field label="Máy chủ" htmlFor="d-srv">
                <select id="d-srv" defaultValue="s1">
                  <option value="s1">S1 · Hải Tặc</option>
                  <option value="s2">S2 · Đảo Xương</option>
                </select>
              </Field>
              <Field label="Ghi chú" htmlFor="d-note">
                <textarea id="d-note" placeholder="Không bắt buộc" />
              </Field>
              <Button full onClick={() => show("Đã gửi đơn.")}>
                Xác nhận mua
              </Button>
            </Card>
          </div>
        </Section>

        <Section eyebrow="Thông báo" title="Ba mức nhắc">
          <Msg tone="ok">Đơn #90211 đã phát vào hòm thư trong game.</Msg>
          <Msg tone="warn">Máy chủ S3 đang đầy; đơn có thể chậm vài phút.</Msg>
          <Msg tone="err">Không tìm thấy nhân vật với tên đã nhập.</Msg>
          <Empty>Chưa có đơn nào trong 30 ngày gần đây.</Empty>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="brand">Nổi bật</Badge>
            <Badge tone="gold">VIP 6</Badge>
            <Badge tone="ok">Đã phát</Badge>
            <Badge tone="warn">Đang xử lý</Badge>
            <Badge tone="danger">Thất bại</Badge>
            <Badge>Nhập vai</Badge>
            <BandPill band="smooth" label="Mượt" />
            <BandPill band="busy" label="Đông" />
            <BandPill band="full" label="Đầy" />
          </div>
        </Section>

        <Section eyebrow="Tin tức" title="Mới nhất" id="tin-tuc">
          <NewsList
            items={[
              {
                id: 1,
                title: "Sự kiện Trung Thu: đăng nhập bảy ngày nhận Thuyền Trăng",
                summary: "Mốc quà mỗi ngày, không cần nạp.",
                published_at: "2026-09-05T10:00:00+07:00",
                kind: "event",
                game_name: "Đại Hải Trình",
                href: "#n1",
              },
              {
                id: 2,
                title: "Bảo trì định kỳ máy chủ S2",
                summary: "03:00–05:00 ngày 07/09. Tiến độ nhân vật không ảnh hưởng.",
                published_at: "2026-09-03T18:20:00+07:00",
                kind: "notice",
                href: "#n2",
              },
              {
                id: 3,
                title: "Cập nhật bảng giá gói nạp",
                published_at: "2026-08-12T08:00:00+07:00",
                kind: "news",
                game_name: "Tam Quốc Nhàn Rỗi",
              },
            ]}
          />
        </Section>

        <Section eyebrow="Nội dung" title="Văn bản thuần → trang" id="ho-tro">
          <Card>
            <RichText body={BODY} />
          </Card>
        </Section>
      </main>

      <Footer
        brand="Ant Farms"
        links={[
          { href: "#dieu-khoan", label: "Điều khoản" },
          { href: "#chinh-sach", label: "Chính sách bảo mật" },
          { href: "#ho-tro", label: "Hỗ trợ" },
          { href: "#lien-he", label: "Liên hệ" },
        ]}
        note="Ant Farms là nền tảng phát hành trò chơi trên trình duyệt. Mọi giao dịch Xu đều có hoá đơn điện tử trong mục Lịch sử."
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Xác nhận huỷ đơn"
        actions={
          <>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Không huỷ
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                show("Đã huỷ đơn #90210.");
              }}
            >
              Huỷ đơn
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">Đơn #90210 đang chờ phát. Huỷ bây giờ thì Xu quay lại ví ngay, không mất phí.</p>
      </Modal>

      <Toast toast={toast} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

// `?y=3800` kéo nội dung lên 3800 px. Dùng để chụp ảnh từng đoạn bằng Chrome headless: nó
// chỉ vẽ khung nhìn đầu tiên, `scrollTo` xong chụp ra ảnh trống — kéo bằng `margin-top` âm
// thì đoạn cần chụp nằm ngay trong khung nhìn nên vẽ bình thường. Không ảnh hưởng app nào.
const qs = new URLSearchParams(location.search);
const y = Number(qs.get("y"));
if (Number.isFinite(y) && y > 0) document.body.style.marginTop = `-${y}px`;

// `?w=375` bó thân trang về đúng 375 px. Chrome headless trên macOS ép khung nhìn rộng tối
// thiểu 500 px nên không chụp được khổ điện thoại thật; bó bề rộng thì nội dung xuống dòng
// y hệt 375 px, còn media query vẫn ở 500 px — vẫn nằm dưới cả hai điểm ngắt (561 và 721)
// nên chọn đúng nhánh bố cục. Đo thật (scrollWidth ≤ 375) làm trong trình duyệt, không ở đây.
const w = Number(qs.get("w"));
if (Number.isFinite(w) && w > 0) {
  document.body.style.width = `${w}px`;
  document.body.style.overflowX = "hidden";
  // Vạch đỏ đánh dấu mép phải: ảnh chụp rộng 500 px, mọi thứ bên phải vạch là nền thừa.
  document.body.style.borderRight = "2px solid #EE4623";
}

