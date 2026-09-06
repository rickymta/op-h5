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
  formatInt,
  type Column,
} from "@op/ui/publisher";
import { api, type OrdersResponse, type Pkg } from "../api";
import { useCategories, useFeatured, useMe, useMeta, usePkgList, useStoreStats, useTitle } from "../queries";
import { Loading, PageHead, PkgCard, QueryError } from "../parts";

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
          <span className="pb-tbl__title">
            {p.name}
            {p.badge ? <span className="gm-chip">{p.badge}</span> : null}
          </span>
          {p.description ? <span className="pb-tbl__sub">{p.description}</span> : null}
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
        <span className={p.price_xu > (balance ?? Infinity) ? "gm-price is-poor" : "gm-price"}>{p.price_fmt} Xu</span>
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
    <main className="pb-main">
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

      <Card className="gm-storebar">
        <div>
          <span className="pb-muted gm-storebar__k">Số dư ví</span>
          <p className="gm-bal">
            {guest ? "—" : balance === undefined ? "—" : formatInt(balance)}
            <small>Xu</small>
          </p>
          <p className="gm-storebar__note">
            {guest
              ? "Đăng nhập để mua. Bảng giá dưới đây ai cũng xem được."
              : balance === undefined
                ? "Chưa đọc được số dư. Tải lại trang, hoặc xem ở trang tài khoản."
                : rate}
          </p>
        </div>
        {guest ? (
          <LinkButton href="/choi-game">Đăng nhập</LinkButton>
        ) : (
          <LinkButton variant="ghost" href={`${idBase}/tai-khoan/vi`}>
            Nạp thêm Xu
          </LinkButton>
        )}
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
          <div className="gm-pkgs">
            {featured.map((p) => (
              <PkgCard
                key={p.id}
                p={p}
                href={`/cua-hang/${encodeURIComponent(p.id)}`}
                poor={balance !== undefined && p.price_xu > balance}
              />
            ))}
          </div>
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
          <h3>Lưu ý</h3>
          <ul className="gm-notes">
            <li>Phải đăng nhập mới mua được; gói gửi qua thư cần có nhân vật ở máy chủ nhận.</li>
            <li>Gói Nguyên Bảo, thẻ, quỹ, đặc quyền được game xử lý như một lần nạp — phần thưởng vào thẳng nhân vật.</li>
            <li>Gói vật phẩm vào hòm thư trong game, thường trong một phút.</li>
            <li>Game từ chối (hết lượt, chưa tới ngày mở) thì Xu được hoàn ngay vào ví.</li>
          </ul>
        </Card>
      </Section>
    </main>
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
          <p className="pb-muted" style={{ margin: 0, fontSize: 14 }}>
            Chưa mua gì.
          </p>
        ) : (
          list.map((o) => (
            <div className="gm-order" key={o.id}>
              <div>
                {o.name}
                <div className="gm-order__meta">
                  {o.created_at} · {o.srv_code} · {o.amount_fmt} Xu
                </div>
              </div>
              <span className={`gm-st gm-st--${o.status}`}>{o.status_vi}</span>
            </div>
          ))
        )}
      </Card>
    </Section>
  );
}
