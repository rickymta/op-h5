import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/publisher/publisher.css";
import {
  BandPill,
  Button,
  Card,
  Empty,
  Field,
  Footer,
  GameCard,
  Hero,
  LinkButton,
  Modal,
  Msg,
  NewsList,
  Section,
  ServerRow,
  SideNav,
  StatTiles,
  Toast,
  TopBar,
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
