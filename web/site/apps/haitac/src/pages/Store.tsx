import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  LinkButton,
  Pagination,
  SearchField,
  Section,
  SelectField,
  TrustRow,
  type Column,
  cx,
  formatInt,
} from "@op/site-ui";
import { api, type OrdersResponse, type Pkg } from "../api";
import { useCategories, useFeatured, useMe, useMeta, usePkgList, useStoreStats, useTitle } from "../queries";
import { CardTitle, Loading, Main, Notes, OrderRow, PageHead, PkgCard, PkgGrid, QueryError } from "../parts";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "popular", label: "Mặc định" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
];

/**
 * Cửa hàng — bảng gói theo bố cục mockup người vận hành gửi (hợp đồng đợt 3 mục 1 và 5.1).
 *
 * Hai khác biệt lớn so với bản trước:
 *
 *  1. **Khách chưa đăng nhập vẫn xem được bảng và giá.** Trước đây cả trang chỉ có một dòng
 *     "Đăng nhập để xem…", nên người mới không biết ở đây bán gì (QA đợt 3, V3).
 *  2. **Phân trang phía máy chủ.** Trước đây trang tải cả 1.900 gói rồi vẽ hết một tab
 *     (QA V4). Giờ mỗi lượt chỉ 20 dòng; bảng giá đầy đủ chỉ được kéo về một lần cho ô chọn
 *     nhóm (xem `useCategories`); hàng "Gói nổi bật" hỏi riêng qua `useFeatured`.
 *
 * Việc mua chuyển sang trang chi tiết `/cua-hang/:id` — nút ở cột cuối chỉ dẫn tới đó.
 */
export function Store() {
  const meta = useMeta();
  const me = useMe();
  const stats = useStoreStats();
  const name = meta.data?.name;
  useTitle(name ? `Cửa hàng · ${name}` : undefined);
  const idBase = (meta.data?.id_base ?? "").replace(/\/+$/, "");

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);

  // Gõ tới đâu lọc tới đó, nhưng chờ 400 ms cho ngón tay dừng lại — mỗi lượt là một truy vấn.
  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [qInput]);
  // Đổi bộ lọc thì về trang 1: giữ nguyên trang 7 của kết quả cũ sẽ ra bảng trống.
  useEffect(() => setPage(1), [q, cat, sort]);

  const cats = useCategories();
  const featuredQ = useFeatured();
  const list = usePkgList({ q, cat, sort, page, pageSize: PAGE_SIZE });
  const catList = cats.data?.categories ?? [];
  const view = list.data?.list;
  const rows = view?.packages ?? [];

  const guest = me.data ? !me.data.logged_in : false;
  // `balance` KHÔNG mặc định về 0: `/api/game/me` bỏ hẳn trường này khi đọc ví lỗi, và hiện
  // "0 Xu" cho người vừa nạp tiền là lời nói dối khó chịu nhất trang này có thể nói (QA V2).
  const balance = me.data?.logged_in ? me.data.balance : undefined;

  // Hỏi riêng thay vì duyệt `catList`: khối nhóm nay chỉ còn tên, không kèm gói.
  const featured = featuredQ.data?.list?.packages ?? [];

  const columns: Column<Pkg>[] = [
    {
      key: "name",
      title: "Gói",
      width: "34%",
      render: (p) => (
        <>
          {/* Ca o ten la lien ket: truoc day chi sau the "goi noi bat" moi mo duoc trang chi
              tiet, nen 1.927/1.933 goi khong co duong vao nao. */}
          <a href={`/cua-hang/${encodeURIComponent(p.id)}`} className="block font-medium text-fg hover:text-gold-400">
            {p.name}
            {p.badge ? (
              <span className="ml-2 inline-block whitespace-nowrap rounded bg-brand-500 px-[7px] py-0.5 align-[1px] font-mono text-[10.5px] uppercase tracking-[0.06em] text-white">
                {p.badge}
              </span>
            ) : null}
          </a>
          {p.description ? (
            <span className="mt-0.5 block text-[13px] text-fg-muted">{p.description}</span>
          ) : (
            <span className="mt-0.5 block font-mono text-[12px] text-fg-faint">mã {p.id}</span>
          )}
        </>
      ),
    },
    {
      key: "item",
      title: "Nội dung",
      width: "22%",
      render: (p) => (p.item_name ? `${p.item_name}${p.item_count > 1 ? ` × ${formatInt(p.item_count)}` : ""}` : "—"),
    },
    { key: "cond", title: "Điều kiện", width: "18%", hideOnMobile: true, render: (p) => p.cond || "—" },
    {
      key: "price",
      title: "Giá",
      align: "right",
      width: "14%",
      render: (p) => (
        <span
          className={cx("whitespace-nowrap font-mono nums", p.price_xu > (balance ?? Infinity) ? "text-danger-400" : "text-gold-400")}
        >
          {p.price_fmt} Xu
        </span>
      ),
    },
    {
      key: "act",
      title: "Thao tác",
      align: "right",
      width: "12%",
      render: (p) =>
        guest ? (
          <LinkButton variant="ghost" href="/choi-game">
            Đăng nhập
          </LinkButton>
        ) : (
          <LinkButton href={`/cua-hang/${encodeURIComponent(p.id)}`}>Mua</LinkButton>
        ),
    },
  ];

  const rate = stats.data
    ? `${stats.data.rate_note}${stats.data.first_buy_bonus ? " · mỗi mốc lần đầu mua được x2" : ""}`
    : "";

  return (
    <Main>
      <PageHead
        eyebrow="Cửa hàng"
        title="Mua bằng Xu trong ví"
        lead="Xu là tiền chung của cả hệ thống. Nạp ở trang tài khoản, dùng ở game nào tuỳ bạn."
      >
        <TrustRow
          items={[
            { icon: "↩", title: "Hoàn Xu tự động", note: "Game từ chối là Xu về ví ngay, không phải yêu cầu." },
            { icon: "⚡", title: "Thường trong một phút", note: "Lệnh phát hàng chạy ngay khi bạn xác nhận." },
            { icon: "🏷", title: "Giá niêm yết", note: "Mua thẳng từ cổng, không qua trung gian." },
          ]}
        />
      </PageHead>

      <Card className="mt-2 flex flex-col items-stretch gap-x-[22px] gap-y-3.5 xs:flex-row xs:flex-wrap xs:items-center xs:justify-between">
        <div>
          <span className="text-[13px] text-fg-muted">Số dư ví</span>
          <p className="m-0 mt-0.5 font-mono text-[26px] leading-[1.1] nums tracking-[-0.02em] text-gold-400 xs:text-[32px]">
            {guest ? "—" : balance === undefined ? "—" : formatInt(balance)}
            <small className="ml-1.5 font-sans text-sm text-fg-muted">Xu</small>
          </p>
          <p className="m-0 mt-2 max-w-[56ch] text-[13.5px] text-fg-muted">
            {guest
              ? "Đăng nhập để mua. Bảng giá dưới đây ai cũng xem được."
              : balance === undefined
                ? "Chưa đọc được số dư. Tải lại trang, hoặc xem ở trang tài khoản."
                : rate}
          </p>
        </div>
        {/* Điện thoại: nút chiếm trọn bề ngang như `.gm-storebar > .pb-btn` cũ; từ 560px trở lên
            thì co lại và nằm cùng hàng với số dư. */}
        <div className="w-full [&>a]:w-full xs:w-auto xs:[&>a]:w-auto">
          {guest ? (
            <LinkButton href="/choi-game">Đăng nhập</LinkButton>
          ) : (
            <LinkButton variant="ghost" href={`${idBase}/tai-khoan/vi`}>
              Nạp thêm Xu
            </LinkButton>
          )}
        </div>
      </Card>

      <FilterBar
        action={
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQInput("");
              setQ("");
              setCat("");
              setSort("popular");
              setPage(1);
            }}
          >
            Đặt lại
          </Button>
        }
      >
        <SearchField value={qInput} onChange={setQInput} onSubmit={() => setQ(qInput.trim())} placeholder="Tên gói, vật phẩm…" />
        <SelectField
          label="Nhóm gói"
          value={cat}
          onChange={setCat}
          options={[{ value: "", label: "Tất cả nhóm" }, ...catList.map((c) => ({ value: c.key, label: c.title }))]}
        />
        <SelectField label="Sắp xếp" value={sort} onChange={setSort} options={SORTS} />
      </FilterBar>

      {featured.length ? (
        <Section eyebrow="Nổi bật" title="Gói nổi bật">
          <PkgGrid>
            {featured.map((p) => (
              <PkgCard
                key={p.id}
                p={p}
                href={`/cua-hang/${encodeURIComponent(p.id)}`}
                poor={balance !== undefined && p.price_xu > balance}
              />
            ))}
          </PkgGrid>
        </Section>
      ) : null}

      <Section eyebrow="Bảng giá" title="Tất cả gói" sub={view ? `${formatInt(view.total)} gói đang bán` : undefined}>
        {list.isError ? (
          <QueryError error={list.error} prefix="Không đọc được bảng giá" />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(p) => p.id}
              loading={list.isPending}
              empty={q || cat ? "Không có gói nào khớp bộ lọc. Thử bỏ bớt điều kiện." : "Chưa có gói nào được mở."}
            />
            <Pagination page={page} pages={view?.pages ?? 1} onChange={setPage} />
          </>
        )}
      </Section>

      {guest ? null : <RecentOrders />}

      <Section>
        <Card>
          <CardTitle>Lưu ý</CardTitle>
          <Notes>
            <li>Phải đăng nhập mới mua được; gói gửi qua thư cần có nhân vật ở máy chủ nhận.</li>
            <li>Gói Kim Cương, thẻ, quỹ, đặc quyền được game xử lý như một lần nạp — phần thưởng vào thẳng nhân vật.</li>
            <li>Gói vật phẩm vào hòm thư trong game, thường trong một phút.</li>
            <li>Game từ chối (hết lượt, chưa tới ngày mở) thì Xu được hoàn ngay vào ví.</li>
          </Notes>
        </Card>
      </Section>
    </Main>
  );
}

/** Đơn gần đây — cùng nguồn `["orders"]` với trang chi tiết, nên mua xong quay lại là thấy ngay. */
function RecentOrders() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.get<OrdersResponse>("/api/game/orders") });
  const list = (orders.data?.orders ?? []).slice(0, 10);
  return (
    <Section eyebrow="Của bạn" title="Đơn gần đây">
      <Card>
        {orders.isPending ? (
          <Loading text="Đang đọc đơn…" />
        ) : orders.isError ? (
          <QueryError error={orders.error} prefix="Không đọc được đơn mua" />
        ) : list.length === 0 ? (
          <p className="m-0 text-sm text-fg-muted">Chưa mua gì.</p>
        ) : (
          list.map((o) => (
            <OrderRow
              key={o.id}
              name={o.name}
              meta={`${o.created_at} · ${o.srv_code} · ${o.amount_fmt} Xu`}
              status={o.status}
              statusVi={o.status_vi}
            />
          ))
        )}
      </Card>
    </Section>
  );
}
