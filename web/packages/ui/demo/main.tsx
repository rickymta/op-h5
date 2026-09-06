import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/publisher/publisher.css";
import {
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
  SearchField,
  Section,
  SelectField,
  ServerRow,
  SideNav,
  StatCard,
  StatTiles,
  Steps,
  Toast,
  TopBar,
  TrustRow,
  formatDate,
  formatInt,
  timeAgo,
  useToast,
} from "../src/publisher";

// Trang mẫu: mọi thành phần với dữ liệu giả để tự kiểm ở 375 px và desktop. Không app nào
// import file này.

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const H = 3600_000;
const D = 24 * H;

const news = [
  {
    id: 1,
    title: "Sự kiện Trung thu: đăng nhập 7 ngày nhận tướng SSR và 2.000 Kim Cương",
    summary: "Từ 10/09 đến 24/09, đăng nhập mỗi ngày để nhận quà; ngày thứ 7 mở rương tướng.",
    image: "https://picsum.photos/seed/tt/144/144",
    href: "#tin-1",
    published_at: iso(3 * D + 2 * H),
    kind: "event",
    game_name: "Đại Hải Trình",
  },
  {
    id: 2,
    title: "Bảo trì máy chủ S1–S3 lúc 09:00 ngày 08/09",
    summary: "Dự kiến 2 giờ. Xin lỗi vì sự bất tiện.",
    href: "#tin-2",
    published_at: iso(5 * 60_000),
    kind: "notice",
  },
  {
    id: 3,
    title: "Ra mắt máy chủ S4 — Hắc Long",
    href: "#tin-3",
    published_at: iso(45 * D),
    kind: "news",
    game_name: "Thần Long Truyền Kỳ",
  },
];

/** Năm gói cho bảng cửa hàng — số liệu giả nhưng đúng khuôn `pkgView` của adapter. */
type Pkg = { id: string; name: string; desc: string; item: string; cond: string; price: number };
const packages: Pkg[] = [
  { id: "p1", name: "Gói Tân Thủ", desc: "Chỉ mua một lần cho mỗi nhân vật", item: "Nguyên Bảo × 5.000", cond: "Cấp 10 trở lên", price: 50000 },
  { id: "p2", name: "Thẻ Tháng Tiểu Ngạch", desc: "Nhận Nguyên Bảo mỗi ngày trong 30 ngày", item: "Nguyên Bảo × 300/ngày", cond: "", price: 120000 },
  { id: "p3", name: "Quỹ Trưởng Thành", desc: "Hoàn thưởng theo cấp nhân vật", item: "Nguyên Bảo × 20.000", cond: "Máy chủ mở ≥ 3 ngày", price: 200000 },
  { id: "p4", name: "Rương Tướng Hiếm", desc: "Mở ra một tướng SSR ngẫu nhiên", item: "Rương tướng × 1", cond: "VIP 3", price: 480000 },
  { id: "p5", name: "Gói Kim Tệ", desc: "Kim tệ cho cường hoá trang bị", item: "Kim tệ × 2.000.000", cond: "", price: 30000 },
];

const navIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="8" cy="8" r="6" />
  </svg>
);

function Swatch({ name }: { name: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: `var(${name})`, border: "1px solid var(--line)" }} />
      <code className="pb-mono">{name}</code>
    </div>
  );
}

function Demo() {
  const [open, setOpen] = useState(false);
  const { toast, show } = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(7);
  const [who, setWho] = useState("s3-hailang");
  const [step, setStep] = useState(2);
  const [busy, setBusy] = useState(false);

  const shown = packages.filter((p) => (q ? p.name.toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <>
      <TopBar
        brand="Cổng game"
        links={[
          { href: "#game", label: "Game", active: true },
          { href: "#tin-tuc", label: "Tin tức" },
          { href: "https://example.com/ho-tro", label: "Hỗ trợ", external: true },
        ]}
        right={
          <LinkButton href="#dang-nhap" variant="ghost">
            Đăng nhập
          </LinkButton>
        }
        notice={{
          text: "Bảo trì máy chủ S1–S3 lúc 09:00 ngày 08/09, dự kiến 2 giờ. Xin lỗi vì sự bất tiện này với toàn thể người chơi.",
          href: "#tin-2",
        }}
      />

      <Hero
        image="https://picsum.photos/seed/hero/1600/800"
        logo="https://picsum.photos/seed/logo/320/110"
        eyebrow="Game nổi bật"
        title="Ra khơi cùng băng hải tặc của riêng bạn"
        lead="Chơi thẳng trên trình duyệt, không cần tải. Một tài khoản dùng chung cho mọi game trên hệ thống."
        actions={
          <>
            <LinkButton href="#choi" size="lg">
              Chơi ngay
            </LinkButton>
            <LinkButton href="#may-chu" size="lg" variant="ghost">
              Máy chủ
            </LinkButton>
          </>
        }
      >
        Gợi ý cho người mới: <b>S3 · Hắc Long</b> <BandPill band="smooth" label="Mượt" />
      </Hero>

      <main className="pb-main">
        <Section
          id="cua-hang"
          eyebrow="Cửa hàng"
          title="Bảng gói + bộ lọc + phân trang"
          sub="Bố cục theo mockup: hàng lọc trên, bảng dày ở giữa, số trang dưới. Ở 375 px mỗi dòng thành một thẻ."
          action={
            <Button variant="ghost" onClick={() => setBusy((b) => !b)}>
              {busy ? "Tắt loading" : "Bật loading"}
            </Button>
          }
        >
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "#" },
              { label: "Cửa hàng", href: "#cua-hang" },
              { label: "Gói Tân Thủ" },
            ]}
          />

          <TrustRow
            items={[
              { icon: "↩", title: "Hoàn Xu tự động", note: "Đơn không phát được sẽ hoàn ngay" },
              { icon: "⏱", title: "Phát trong một phút", note: "Vật phẩm vào hòm thư trong game" },
              { icon: "₫", title: "Giá niêm yết", note: "Không phụ phí, không đấu giá" },
            ]}
          />

          <div style={{ height: 16 }} />

          <FilterBar
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setCat("all");
                  setSort("popular");
                  setPage(1);
                }}
              >
                Đặt lại
              </Button>
            }
          >
            <SearchField value={q} onChange={setQ} onSubmit={() => show(`Tìm: ${q || "(trống)"}`)} placeholder="Tên gói hoặc vật phẩm…" />
            <SelectField
              label="Nhóm gói"
              value={cat}
              onChange={setCat}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "newbie", label: "Tân thủ" },
                { value: "month", label: "Thẻ tháng" },
                { value: "fund", label: "Quỹ" },
              ]}
            />
            <SelectField
              label="Sắp xếp"
              value={sort}
              onChange={setSort}
              options={[
                { value: "popular", label: "Phổ biến" },
                { value: "price_asc", label: "Giá thấp → cao" },
                { value: "price_desc", label: "Giá cao → thấp" },
              ]}
            />
          </FilterBar>

          <DataTable<Pkg>
            loading={busy}
            rows={shown}
            rowKey={(p) => p.id}
            empty="Không có gói nào khớp từ khoá. Thử bỏ bớt chữ hoặc bấm Đặt lại."
            columns={[
              {
                key: "name",
                title: "Gói",
                render: (p) => (
                  <>
                    <div className="pb-tbl__title">{p.name}</div>
                    <div className="pb-tbl__sub">{p.desc}</div>
                  </>
                ),
              },
              { key: "item", title: "Nội dung", render: (p) => p.item },
              { key: "cond", title: "Điều kiện", render: (p) => p.cond || "—" },
              { key: "upd", title: "Cập nhật", hideOnMobile: true, render: () => <span className="pb-mono pb-muted">05/09</span> },
              {
                key: "price",
                title: "Giá",
                align: "right",
                width: "130px",
                render: (p) => <span className="pb-mono" style={{ color: "var(--brass)" }}>{formatInt(p.price)} Xu</span>,
              },
              {
                key: "act",
                title: "Thao tác",
                align: "right",
                width: "110px",
                render: (p) => <Button onClick={() => show(`Đã chọn ${p.name}.`)}>Mua</Button>,
              },
            ]}
          />

          <Pagination page={page} pages={20} onChange={(p) => setPage(p)} />

          <p className="pb-muted" style={{ marginTop: 14, fontSize: 13 }}>
            Trang {page}/20 · cột “Cập nhật” có <code className="pb-mono">hideOnMobile</code> nên biến mất ở điện thoại.
          </p>
        </Section>

        <Section
          id="chi-tiet"
          eyebrow="Chi tiết gói"
          title="Bước · số liệu · chọn nhanh · tóm tắt đơn"
          sub="Bốn thành phần của trang mua một gói."
        >
          <Steps steps={["Chọn gói", "Nhân vật", "Xác nhận", "Nhận hàng"]} current={step} />
          <div style={{ marginTop: 14 }}>
            <QuickPick
              ariaLabel="Bước đang xem"
              value={String(step)}
              onChange={(v) => setStep(Number(v))}
              options={[
                { value: "1", label: "Bước 1" },
                { value: "2", label: "Bước 2" },
                { value: "3", label: "Bước 3" },
                { value: "4", label: "Bước 4" },
              ]}
            />
          </div>

          <div className="pb-stats pb-stats--2" style={{ marginTop: 20 }}>
            <StatCard label="Số dư" value={`${formatInt(250000)} Xu`} tone="brass" hint="ví dùng chung mọi game" />
            <StatCard label="Tổng đã nạp" value={formatInt(1200000)} hint="từ 12/03/2025" />
            <StatCard label="Đơn thành công" value="18" tone="ok" />
            <StatCard label="Đang chờ" value="1" tone="warn" hint="thường xong trong một phút" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              alignItems: "start",
              marginTop: 20,
            }}
          >
            <Card>
              <h3 style={{ marginBottom: 12 }}>Nhân vật nhận</h3>
              <QuickPick
                ariaLabel="Nhân vật nhận vật phẩm"
                value={who}
                onChange={setWho}
                options={[
                  { value: "s3-hailang", label: "Hải Lang · S3" },
                  { value: "s2-bachho", label: "Bạch Hổ Con · S2" },
                  { value: "s1-thuyenphu", label: "Thuyền Phó · S1" },
                ]}
              />
              <p className="pb-muted" style={{ margin: "14px 0 0", fontSize: 13 }}>
                Từ 5 nhân vật trở lên dùng <code className="pb-mono">SelectField</code> cho gọn.
              </p>
            </Card>
            <Card>
              <h3 style={{ marginBottom: 8 }}>Tóm tắt đơn</h3>
              <KeyValue
                rows={[
                  { k: "Gói", v: "Gói Tân Thủ" },
                  { k: "Nhận ở", v: "Hải Lang · S3" },
                  { k: "Nội dung", v: "Nguyên Bảo × 5.000" },
                  { k: "Giá", v: `${formatInt(50000)} Xu`, tone: "brass" },
                  { k: "Số dư hiện tại", v: `${formatInt(250000)} Xu` },
                  { k: "Số dư sau", v: `${formatInt(200000)} Xu`, strong: true, tone: "brass" },
                ]}
              />
              <div style={{ marginTop: 16 }}>
                <Button full onClick={() => show("Đã trừ 50.000 Xu. Vật phẩm vào hòm thư trong game.")}>
                  Xác nhận mua
                </Button>
              </div>
            </Card>
          </div>

          <div style={{ marginTop: 20 }}>
            <DataTable<Pkg> rows={[]} rowKey={(p) => p.id} columns={[]} empty="Chưa mua gói nào. Đơn đã mua sẽ hiện ở đây." />
          </div>
        </Section>

        <Section eyebrow="Số liệu" title="Ba ô" sub="Chỉ hiện số thật; đủ ba ô thì ba cột ở cả điện thoại.">
          <StatTiles
            items={[
              { label: "Game đang mở", value: "3" },
              { label: "Đang chơi", value: formatInt(12480), hint: "cập nhật 30 giây" },
              { label: "Máy chủ đang mở", value: "5" },
            ]}
          />
        </Section>
        <Section title="Năm ô" sub="Từ bốn ô trở lên: điện thoại thành một hàng cuộn ngang.">
          <StatTiles
            items={[
              { label: "Game", value: "3" },
              { label: "Đang chơi", value: formatInt(1234567) },
              { label: "Máy chủ", value: "5" },
              { label: "Đơn hôm nay", value: formatInt(842) },
              { label: "Xu đã đổi", value: formatInt(9_876_540) },
            ]}
          />
        </Section>

        <Section
          id="game"
          eyebrow="Danh mục"
          title="Game"
          sub="Bìa 3:4; thiếu bìa thì gradient + chữ cái đầu."
          action={<a href="#tat-ca">Xem tất cả →</a>}
        >
          <div className="pb-game-grid">
            <GameCard name="Đại Hải Trình" genre="Đấu tướng · Idle" badge="hot" href="#dht" meta="1.284 đang chơi" />
            <GameCard
              name="Thần Long Truyền Kỳ"
              genre="Nhập vai"
              cover="https://picsum.photos/300/400"
              badge="new"
              href="https://example.com/tl"
              external
            />
            <GameCard name="Vương Quốc Mèo Mập Siêu Dễ Thương Phiên Bản 2" genre="Nông trại" badge="soon" href="#vq" cta="Đăng ký trước" />
          </div>
        </Section>

        <Section id="may-chu" title="Máy chủ" sub="“Đông” vẫn vào được; “Đầy” thì chọn máy chủ khác." action={<a href="#cap-nhat">Làm mới</a>}>
          <Card>
            <ServerRow name="Hắc Long" code="s3" online={formatInt(412)} band="smooth" label="Mượt" recommend />
            <ServerRow name="Bạch Hổ" code="s2" online={formatInt(1830)} band="busy" label="Đông" />
            <ServerRow name="Thanh Long Vĩnh Hằng Bất Diệt" code="s1" online={formatInt(2650)} band="full" label="Đầy" />
            <ServerRow name="Chu Tước" code="s4" online="—" band="unknown" label="Chưa rõ" />
          </Card>
        </Section>

        <Section id="tin-tuc" eyebrow="Cập nhật" title="Tin tức" action={<a href="#tin">Tất cả tin →</a>}>
          <NewsList items={news} />
          <div style={{ marginTop: 16 }}>
            <NewsList items={[]} empty="Chưa có tin cho game này." />
          </div>
        </Section>

        <Section eyebrow="Tài khoản" title="SideNav + nội dung" sub="Desktop: cột trái dính; điện thoại: tab ngang cuộn.">
          <div className="pb-layout">
            <SideNav
              items={[
                { href: "#tk", label: "Tổng quan", icon: navIcon, active: true },
                { href: "#tk-vi", label: "Ví", icon: navIcon },
                { href: "#tk-ls", label: "Lịch sử", icon: navIcon },
                { href: "#tk-nv", label: "Nhân vật", icon: navIcon },
                { href: "#tk-bm", label: "Bảo mật", icon: navIcon },
              ]}
            >
              <Card>
                <div className="pb-muted" style={{ fontSize: 12.5 }}>
                  Số dư
                </div>
                <div className="pb-mono" style={{ fontSize: 24, color: "var(--brass)" }}>
                  {formatInt(250000)} Xu
                </div>
              </Card>
            </SideNav>
            <div>
              <Card pad="lg">
                <h3 style={{ marginBottom: 14 }}>Đổi mật khẩu</h3>
                <Msg tone="warn">Chỉ nạp qua đường chính thức, không đưa mật khẩu hay OTP cho bất kỳ ai.</Msg>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    show("Đã lưu mật khẩu mới.");
                  }}
                >
                  <Field label="Mật khẩu hiện tại" htmlFor="pw0">
                    <input id="pw0" type="password" autoComplete="current-password" />
                  </Field>
                  <Field label="Mật khẩu mới" hint="ít nhất 8 ký tự" htmlFor="pw1">
                    <input id="pw1" type="password" autoComplete="new-password" />
                  </Field>
                  <Field label="Máy chủ nhận" htmlFor="srv">
                    <select id="srv" defaultValue="s3">
                      <option value="s3">S3 · Hắc Long</option>
                      <option value="s2">S2 · Bạch Hổ</option>
                    </select>
                  </Field>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button type="submit">Lưu</Button>
                    <Button type="button" variant="ghost" onClick={() => show("Đã huỷ.", true)}>
                      Huỷ
                    </Button>
                    <Button type="button" variant="danger" onClick={() => setOpen(true)}>
                      Đăng xuất mọi nơi khác
                    </Button>
                  </div>
                </form>
              </Card>
              <div style={{ marginTop: 16 }}>
                <Msg tone="ok">Đã trừ 50.000 Xu cho Gói Tân Thủ. Vật phẩm vào hòm thư trong game, thường trong một phút.</Msg>
                <Msg tone="err">Thiếu 20.000 Xu. Nạp thêm ở trang tài khoản.</Msg>
                <Empty>Chưa mua gì.</Empty>
              </div>
            </div>
          </div>
        </Section>

        <Section eyebrow="Nút" title="Biến thể" sub="primary · ghost · danger · lg · full">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Button>Chơi ngay</Button>
            <Button variant="ghost">Máy chủ</Button>
            <Button variant="danger">Xoá</Button>
            <Button size="lg">Chơi ngay</Button>
            <Button disabled>Đang xử lý…</Button>
            <BandPill band="smooth" label="Mượt" />
            <BandPill band="busy" label="Đông" />
            <BandPill band="full" label="Đầy" />
            <BandPill band="unknown" label="Chưa rõ" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Button full onClick={() => setOpen(true)}>
              Mở hộp thoại (full)
            </Button>
          </div>
          <p className="pb-muted" style={{ marginTop: 14, fontSize: 13 }}>
            timeAgo: {timeAgo(iso(20_000))} · {timeAgo(iso(5 * 60_000))} · {timeAgo(iso(3 * H))} · {timeAgo(iso(3 * D))} ·{" "}
            {timeAgo(iso(45 * D))} · formatDate: {formatDate("2026-09-05T14:03:00+07:00")} · formatInt: {formatInt(1234567)}
          </p>
        </Section>

        <Section eyebrow="Token" title="Bảng màu">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {["--bg", "--surface", "--surface-2", "--line", "--text", "--muted", "--accent", "--accent-dim", "--brass", "--ok", "--warn", "--danger"].map(
              (n) => (
                <Swatch key={n} name={n} />
              ),
            )}
          </div>
        </Section>
      </main>

      <Hero
        eyebrow="Không ảnh · accent riêng"
        title="Thần Long Truyền Kỳ"
        lead="Hero không có ảnh: nền gradient từ --surface-2. Màu nhấn #2F80ED đổi eyebrow và nút."
        accent="#2F80ED"
        actions={<LinkButton href="#choi-2">Chơi ngay</LinkButton>}
      />

      <Footer
        brand="Cổng game"
        links={[
          { href: "#dieu-khoan", label: "Điều khoản" },
          { href: "#chinh-sach", label: "Chính sách" },
          { href: "#ho-tro", label: "Hỗ trợ" },
          { href: "#fanpage", label: "Fanpage" },
        ]}
        note="Công ty TNHH Ví dụ · Giấy phép G1 số 000/GP-BTTTT · Chơi quá 180 phút một ngày ảnh hưởng xấu tới sức khoẻ."
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Xác nhận"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Để sau
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                show("Đã đăng xuất 2 phiên khác.");
              }}
            >
              Đồng ý
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }} className="pb-muted">
          Mọi phiên khác sẽ bị đăng xuất. Phiên hiện tại giữ nguyên. Đóng bằng Esc hoặc bấm ra ngoài.
        </p>
      </Modal>
      <Toast toast={toast} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
