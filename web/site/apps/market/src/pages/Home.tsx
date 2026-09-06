import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  FilterBar,
  Hero,
  LinkButton,
  DataTable,
  Msg,
  Pagination,
  QuickPick,
  SearchField,
  Section,
  SelectField,
  StatCard,
  TrustRow,
  timeAgo,
} from "@op/site-ui";
import type { DemoListing } from "../demo-data";
import { DEMO_GAMES, DEMO_LISTINGS, DEMO_NOW, gameName, serverName } from "../demo-data";
import {
  FEE_PCT,
  MAX_OPEN_LISTINGS,
  PRICE_CEIL,
  PRICE_FLOOR,
  PRICE_UNIT,
  quote,
} from "../lib/market";
import { NOT_OPEN, to, useTitle } from "../lib/nav";
import { DemoTag, LockedButton } from "../components/Preview";
import { NB, UnitPrice, Xu } from "../components/Num";

const PAGE_SIZE = 8;

const SORTS = [
  { value: "new", label: "Mới đăng trước" },
  { value: "price-asc", label: "Đơn giá thấp trước" },
  { value: "price-desc", label: "Đơn giá cao trước" },
  { value: "amount-desc", label: "Số lượng nhiều trước" },
];

function sortListings(rows: DemoListing[], sort: string): DemoListing[] {
  const out = rows.slice();
  if (sort === "price-asc") out.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") out.sort((a, b) => b.price - a.price);
  else if (sort === "amount-desc") out.sort((a, b) => b.amount - a.amount);
  else out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return out;
}

export function Home() {
  useTitle();
  const [q, setQ] = useState("");
  const [game, setGame] = useState("all");
  const [srv, setSrv] = useState("all");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);

  // Máy chủ của game đang chọn; chọn "tất cả" thì gộp danh sách, bỏ mã trùng.
  const servers = useMemo(() => {
    const src = game === "all" ? DEMO_GAMES : DEMO_GAMES.filter((g) => g.code === game);
    const seen = new Map<string, string>();
    for (const g of src) for (const s of g.servers) if (!seen.has(s.code)) seen.set(s.code, s.name);
    return [...seen].map(([code, name]) => ({ value: code, label: name.split(" · ")[0] ?? code }));
  }, [game]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const found = DEMO_LISTINGS.filter((l) => {
      if (l.status !== "active") return false;
      if (game !== "all" && l.game !== game) return false;
      if (srv !== "all" && l.srv !== srv) return false;
      if (needle && !(l.seller.includes(needle) || l.id.toLowerCase().includes(needle))) return false;
      return true;
    });
    return sortListings(found, sort);
  }, [q, game, srv, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const reset = () => {
    setQ("");
    setGame("all");
    setSrv("all");
    setSort("new");
    setPage(1);
  };

  // Hero nằm ngoài `.site-main`: nó là khối full-bleed, lồng vào khung có lề sẽ thành thẻ hẹp.
  return (
    <main>
      <Hero
        eyebrow="Chợ giữa người chơi"
        title="Chợ Xu ⇄ Nguyên Bảo"
        lead="Người chơi ký gửi Nguyên Bảo rồi rao bán lấy Xu. Giá do người bán đặt, trong khoảng sàn và trần do cổng quy định; cổng chỉ thu một khoản phí, trừ vào phần người bán nhận."
        actions={
          <>
            <LinkButton href={to("/dang-ban")} size="lg">
              Xem thử đăng bán
            </LinkButton>
            <LinkButton href={to("/cua-toi")} variant="ghost" size="lg">
              Tin rao của tôi
            </LinkButton>
          </>
        }
      >
        <TrustRow
          items={[
            {
              title: "Ký gửi trước khi niêm yết",
              note: "Nguyên Bảo rời nhân vật người bán ngay lúc đăng, nên tin rao không thể là tin ảo.",
            },
            {
              title: `Phí ${FEE_PCT}% hiện trước khi đăng`,
              note: "Phí trừ vào phần người bán nhận. Người mua trả đúng số ghi ở cột Thành tiền.",
            },
            {
              title: "Giá có sàn và trần",
              note: `Từ ${PRICE_FLOOR.toLocaleString("vi-VN")} đến ${PRICE_CEIL.toLocaleString("vi-VN")} Xu cho ${PRICE_UNIT.toLocaleString("vi-VN")} Nguyên Bảo.`,
            },
          ]}
        />
      </Hero>

      <div className="site-main">
        <Section
          eyebrow="Quy tắc"
          title="Bốn con số quyết định mọi tin rao"
          sub="Đây là tham số thiết kế của chợ, không phải thống kê giao dịch."
        >
          <div className="site-stat-grid">
            <StatCard label="Phí giao dịch" value={`${FEE_PCT}%`} hint="trừ vào phần người bán nhận" tone="brand" />
            <StatCard
              label="Giá sàn"
              value={PRICE_FLOOR.toLocaleString("vi-VN")}
              hint={`Xu / ${PRICE_UNIT.toLocaleString("vi-VN")} Nguyên Bảo`}
              tone="gold"
            />
            <StatCard
              label="Giá trần"
              value={PRICE_CEIL.toLocaleString("vi-VN")}
              hint="bằng giá cửa hàng, không bán đắt hơn"
              tone="gold"
            />
            <StatCard label="Tin rao mở cùng lúc" value={`${MAX_OPEN_LISTINGS} tin`} hint="mỗi tài khoản" />
          </div>
        </Section>

        <Section eyebrow="Game" title="Game trong chợ" sub="Dữ liệu mẫu. Mỗi game sẽ có bảng tin rao riêng theo máy chủ.">
          <div className="grid gap-3 xs:grid-cols-2">
            {DEMO_GAMES.map((g) => (
              <Card key={g.code} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate">{g.name}</h3>
                    <Badge tone={g.open ? "ok" : "muted"}>{g.open ? "Đang mở" : "Chưa mở"}</Badge>
                  </div>
                  <p className="m-0 mt-1 text-[13px] text-fg-muted">
                    {g.genre} · {g.note}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!g.open}
                  onClick={() => {
                    setGame(g.code);
                    setSrv("all");
                    setPage(1);
                    document.getElementById("tin-rao")?.scrollIntoView({ block: "start" });
                  }}
                >
                  Xem tin rao
                </Button>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          id="tin-rao"
          eyebrow="Đang rao"
          title="Bảng tin rao"
          sub="Bấm một tin để xem chi tiết gói và cách tính phí."
          action={<DemoTag />}
        >
          <FilterBar
            action={
              <Button type="button" variant="ghost" onClick={reset}>
                Xoá lọc
              </Button>
            }
          >
            <SearchField
              id="f-q"
              label="Tìm"
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Mã tin hoặc tên người bán"
            />
            <SelectField
              id="f-game"
              label="Game"
              value={game}
              onChange={(v) => {
                setGame(v);
                setSrv("all");
                setPage(1);
              }}
              options={[{ value: "all", label: "Tất cả game" }, ...DEMO_GAMES.map((g) => ({ value: g.code, label: g.name }))]}
            />
            <SelectField
              id="f-sort"
              label="Sắp xếp"
              value={sort}
              onChange={(v) => {
                setSort(v);
                setPage(1);
              }}
              options={SORTS}
            />
          </FilterBar>

          <div className="mt-3">
            <QuickPick
              ariaLabel="Lọc theo máy chủ"
              value={srv}
              onChange={(v) => {
                setSrv(v);
                setPage(1);
              }}
              options={[{ value: "all", label: "Mọi máy chủ" }, ...servers]}
            />
          </div>

          <div className="my-3">
            <Msg tone="warn">
              <strong>{NOT_OPEN}.</strong> Cột thao tác đã bị khoá: nút “Mua” trong bảng dưới đây không bấm được.
              Liên kết “Chi tiết” vẫn mở được để xem cách một tin rao được trình bày.
            </Msg>
          </div>

          <DataTable<DemoListing>
            rows={slice}
            rowKey={(r) => r.id}
            empty="Không có tin rao nào khớp bộ lọc. Thử xoá lọc."
            columns={[
              {
                key: "seller",
                title: "Người bán",
                render: (r) => (
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[13px] text-fg">{r.seller}</div>
                    <div className="mt-0.5 truncate text-2xs text-fg-faint">
                      {gameName(r.game)} · {serverName(r.game, r.srv)} · {timeAgo(r.createdAt, DEMO_NOW)}
                    </div>
                  </div>
                ),
              },
              { key: "amount", title: "Số lượng", align: "right", width: "140px", render: (r) => <NB n={r.amount} /> },
              { key: "price", title: "Đơn giá", align: "right", width: "150px", render: (r) => <UnitPrice n={r.price} /> },
              {
                key: "total",
                title: "Thành tiền",
                align: "right",
                width: "140px",
                render: (r) => <Xu n={quote(r.amount, r.price).total} tone="gold" />,
              },
              {
                key: "saved",
                title: "So với cửa hàng",
                align: "right",
                width: "130px",
                hideOnMobile: true,
                render: (r) => {
                  const s = quote(r.amount, r.price).savedPct;
                  return s > 0 ? <Badge tone="ok">rẻ hơn {s}%</Badge> : <span className="text-fg-faint">bằng giá</span>;
                },
              },
              {
                key: "act",
                title: "Thao tác",
                align: "right",
                width: "170px",
                render: (r) => (
                  <div className="flex items-center justify-end gap-2">
                    <LinkButton href={to(`/tin/${r.id}`)} variant="ghost">
                      Chi tiết
                    </LinkButton>
                    <LockedButton>Mua</LockedButton>
                  </div>
                ),
              },
            ]}
          />

          <div className="mt-4">
            <Pagination page={cur} pages={pages} onChange={setPage} />
          </div>
        </Section>
      </div>
    </main>
  );
}
