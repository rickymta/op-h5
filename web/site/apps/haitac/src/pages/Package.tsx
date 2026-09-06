import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Breadcrumb,
  Button,
  Card,
  KeyValue,
  LinkButton,
  Msg,
  QuickPick,
  SelectField,
  StatCard,
  Steps,
  formatInt,
} from "@op/site-ui";
import {
  ApiError,
  api,
  errText,
  type ConvertResponse,
  type Me,
  type OrdersResponse,
  type PkgDetail,
  type RolesResponse,
} from "../api";
import { useCategoryInfo, useMe, useMeta, usePackage, useServers, useTitle } from "../queries";
import { Actions, CardTitle, Loading, Main, Notes, OrderRow, PageHead, QueryError } from "../parts";

const STEPS = ["Chọn gói", "Nhân vật nhận", "Xác nhận", "Nhận hàng"];

type Target = { value: string; text: string };

/**
 * Trang chi tiết một gói — nơi việc mua thật sự diễn ra (hợp đồng đợt 3 mục 5.1).
 *
 * Ba hành vi của bản cũ được giữ nguyên vì chúng bảo vệ tiền của người chơi:
 *
 *   - **Khoá chống trùng theo phút**: `idempotency_key` gắn với (gói, máy chủ, nhân vật, phút),
 *     nên bấm hai lần vì sốt ruột không bị trừ hai lần.
 *   - **Hỏi lại đơn mỗi 3 giây, tối đa 8 lần** khi còn đơn `pending`, để "Đang phát…" tự đổi
 *     thành "Đã phát" mà người chơi không phải tải lại.
 *   - **Đồng bộ số dư theo phản hồi của đơn**: game từ chối thì Xu được hoàn tự động, số dư
 *     đổi mà người chơi không bấm gì.
 */
export function Package({ id }: { id: string }) {
  const meta = useMeta();
  const me = useMe();
  const pkg = usePackage(id);
  const p = pkg.data;
  const cat = useCategoryInfo(p?.category ?? "");
  const name = meta.data?.name;
  const idBase = (meta.data?.id_base ?? "").replace(/\/+$/, "");

  const notFound = pkg.error instanceof ApiError && pkg.error.status === 404;
  const head = p ? p.name : notFound ? "Gói không còn bán" : "";
  useTitle(head ? `${head} · Cửa hàng · ${name ?? ""}`.replace(/ · $/, "") : undefined);

  return (
    <Main>
      <Breadcrumb items={[{ label: "Cửa hàng", href: "/cua-hang" }, { label: p?.name ?? "Gói" }]} />
      {pkg.isPending ? (
        <Loading text="Đang đọc thông tin gói…" />
      ) : notFound ? (
        <>
          <PageHead
            eyebrow="Cửa hàng"
            title="Gói này không còn bán"
            lead="Có thể gói đã bị gỡ hoặc chỉ mua được từ trong game. Xem các gói đang mở ở cửa hàng."
          />
          <Actions tight>
            <LinkButton href="/cua-hang">Về cửa hàng</LinkButton>
          </Actions>
        </>
      ) : pkg.isError ? (
        <QueryError error={pkg.error} prefix="Không đọc được gói" />
      ) : p ? (
        <>
          <PageHead eyebrow={cat.data?.title ?? "Cửa hàng"} title={p.name} lead={p.description || undefined} />
          <Buy pkg={p} me={me.data} idBase={idBase} />
        </>
      ) : null}
    </Main>
  );
}

/** Nhãn ngắn cho ô "Cách nhận" — chữ trong `StatCard` bị cắt nếu dài. */
function grantShort(mode: string): string {
  if (mode === "mail") return "Hòm thư";
  if (mode === "ingame") return "Trong game";
  return "Nạp thẳng";
}

/** Nhãn ngắn cho ô "Điều kiện"; `cond` đầy đủ nằm ở dòng phụ. */
function condShort(p: PkgDetail): string {
  if (p.daily_limit > 0) return `${p.daily_limit}/ngày`;
  if (p.vip_required > 0) return `VIP ${p.vip_required}`;
  if (p.server_days.min > 0 || p.server_days.max > 0) return "Theo ngày";
  return "Không";
}

function Buy({ pkg, me, idBase }: { pkg: PkgDetail; me?: Me; idBase: string }) {
  const qc = useQueryClient();
  const guest = me ? !me.logged_in : false;
  const balance = me?.logged_in ? me.balance : undefined;
  const setBalance = (b: number) => qc.setQueryData<Me>(["me"], (old) => (old ? { ...old, balance: b } : old));

  const servers = useServers();
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RolesResponse>("/api/game/roles"),
    staleTime: Infinity,
    retry: false,
    enabled: !guest && me !== undefined,
  });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<OrdersResponse>("/api/game/orders"),
    enabled: !guest && me !== undefined,
  });

  // Nhận ở: nhân vật thật từ masterList; chưa có nhân vật thì chọn máy chủ (gói gửi thư vẫn bị
  // chặn vì thiếu roleId — xem `blocked` bên dưới).
  let targets: Target[] = [];
  if (!guest && !roles.isPending) {
    const rs = roles.data?.roles ?? [];
    if (rs.length) {
      targets = rs.map((r) => ({
        value: `${r.srv_code}|${r.master_id_hex}`,
        text: `${r.name} · Lv${r.level} · ${r.srv_code}`,
      }));
    } else {
      targets = (servers.data?.servers ?? []).map((s) => ({
        value: `${s.code}|`,
        text: `Máy chủ ${s.name} (chưa có nhân vật)`,
      }));
    }
  }
  const [target, setTarget] = useState("");
  const sel = targets.find((t) => t.value === target) ?? targets[0];
  const [srv = "", role = ""] = (sel?.value ?? "").split("|");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [bought, setBought] = useState(false);

  // Hỏi lại đơn để thấy "Đang phát…" → "Đã phát", và để bắt Xu được hoàn tự động.
  const pollLeft = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      pollLeft.current = 0;
    },
    [],
  );
  function pollOrders(times: number) {
    if (pollLeft.current) return;
    pollLeft.current = times;
    const tick = () => {
      api
        .get<OrdersResponse>("/api/game/orders")
        .then((d) => {
          if (!pollLeft.current) return; // đã rời trang
          qc.setQueryData<OrdersResponse>(["orders"], d);
          const cur = qc.getQueryData<Me>(["me"])?.balance;
          if (typeof d.balance === "number" && d.balance !== cur) setBalance(d.balance);
          const pending = (d.orders ?? []).some((o) => o.status === "pending");
          if (--pollLeft.current > 0 && pending) timer.current = window.setTimeout(tick, 3000);
          else pollLeft.current = 0;
        })
        .catch(() => {
          pollLeft.current = 0;
        });
    };
    tick();
  }

  const short = balance !== undefined ? pkg.price_xu - balance : 0;
  const after = balance !== undefined ? balance - pkg.price_xu : undefined;

  // Vì sao chưa mua được. Thứ tự này quan trọng: thiếu Xu là lý do hay gặp nhất nên nói trước.
  let blocked = "";
  if (guest) blocked = "Đăng nhập để mua gói này.";
  else if (roles.isPending || me === undefined) blocked = "Đang đọc danh sách nhân vật…";
  else if (!sel || srv === "") blocked = "Chưa đọc được máy chủ nào. Tải lại trang rồi thử lại.";
  else if (short > 0) blocked = `Thiếu ${formatInt(short)} Xu.`;
  else if (pkg.grant_mode === "mail" && role === "")
    blocked = "Gói này gửi qua thư: cần có nhân vật. Hãy vào game tạo nhân vật trước.";
  const canBuy = blocked === "" && !busy;

  async function buy() {
    if (!canBuy) return;
    setBusy(true);
    setMsg(null);
    // Khoá chống trùng: hai lần bấm trong cùng một phút là cùng một đơn.
    const key = `${pkg.id}-${srv}-${role || "-"}-${Math.floor(Date.now() / 60000)}`;
    try {
      const d = await api.post<ConvertResponse>("/api/game/convert", {
        package_id: pkg.id,
        srv_code: srv,
        role_id: role,
        idempotency_key: key,
      });
      setBalance(Number(d.balance));
      setBought(true);
      // Câu báo do trang soạn theo `grant_mode`: câu của máy chủ luôn nói "vào hòm thư", sai
      // với gói `pay` (game xử lý như một lần nạp, không qua thư) — QA đợt 3, V1.
      setMsg({
        tone: "ok",
        text:
          `Đã trừ ${formatInt(pkg.price_xu)} Xu. ` +
          (pkg.grant_mode === "mail"
            ? "Vật phẩm sẽ vào hòm thư trong game, thường trong một phút."
            : "Game sẽ phát phần thưởng vào nhân vật như một lần nạp, thường trong một phút."),
      });
      pollOrders(8);
    } catch (e) {
      setMsg({ tone: "err", text: errText(e) });
    }
    setBusy(false);
  }

  const step = bought ? 4 : sel && srv !== "" ? 3 : 2;
  const items = pkg.reward_items ?? [];
  // Một phần thưởng thì ô "Nội dung" hiện thẳng số lượng; nhiều phần thì hiện số phần và
  // liệt kê ở dòng phụ (chữ trong `StatCard` bị cắt nếu dài).
  const only = items.length === 1 ? items[0] : undefined;
  const recent = (orders.data?.orders ?? []).slice(0, 3);

  return (
    <>
      <div className="site-stat-grid">
        <StatCard
          label="Giá (Xu)"
          value={pkg.price_fmt}
          tone="gold"
          hint={pkg.vip_points > 0 ? `+${formatInt(pkg.vip_points)} điểm VIP` : "Trừ từ ví Xu chung"}
        />
        <StatCard
          label="Nội dung"
          value={only ? formatInt(only.count) : `${items.length || 1} phần`}
          hint={only ? only.label : items.map((it) => `${it.label} × ${formatInt(it.count)}`).join(" · ") || pkg.item_name}
        />
        <StatCard label="Cách nhận" value={grantShort(pkg.grant_mode)} hint={pkg.grant_note} />
        <StatCard
          label="Điều kiện"
          value={condShort(pkg)}
          tone={pkg.cond ? "warn" : "default"}
          hint={pkg.cond || "Không có điều kiện thêm."}
        />
      </div>

      <div className="my-[22px] grid gap-4">
        <Steps steps={STEPS} current={step} />

        {guest ? (
          <Card>
            <CardTitle>Nhận ở</CardTitle>
            <p className="mb-4 mt-1.5 text-sm text-fg-muted">Đăng nhập để chọn nhân vật nhận và xem số dư ví của bạn.</p>
            <LinkButton href="/choi-game">Đăng nhập</LinkButton>
          </Card>
        ) : (
          <Card>
            <CardTitle>Nhận ở</CardTitle>
            {roles.isPending ? (
              <Loading text="Đang đọc danh sách nhân vật…" />
            ) : targets.length === 0 ? (
              <Msg tone="warn">Chưa đọc được máy chủ nào. Tải lại trang rồi thử lại.</Msg>
            ) : targets.length <= 4 ? (
              <QuickPick
                options={targets.map((t) => ({ value: t.value, label: t.text }))}
                value={sel?.value ?? ""}
                onChange={setTarget}
                ariaLabel="Nhân vật hoặc máy chủ nhận hàng"
              />
            ) : (
              <SelectField
                label="Nhân vật nhận"
                value={sel?.value ?? ""}
                onChange={setTarget}
                options={targets.map((t) => ({ value: t.value, label: t.text }))}
              />
            )}
          </Card>
        )}

        <Card>
          <CardTitle>Tóm tắt đơn</CardTitle>
          <KeyValue
            rows={[
              { k: "Gói", v: pkg.name },
              { k: "Nhận ở", v: guest ? "—" : (sel?.text ?? "—") },
              { k: "Giá", v: `${pkg.price_fmt} Xu`, tone: "gold" },
              { k: "Số dư hiện tại", v: balance === undefined ? "—" : `${formatInt(balance)} Xu` },
              {
                k: "Số dư sau",
                v: after === undefined ? "—" : `${formatInt(after)} Xu`,
                strong: true,
                tone: after !== undefined && after < 0 ? "brand" : "gold",
              },
            ]}
          />

          {msg ? (
            <div className="mt-3.5">
              <Msg tone={msg.tone}>{msg.text}</Msg>
            </div>
          ) : null}

          <div className="mt-[18px]">
            {guest ? (
              <LinkButton href="/choi-game" full size="lg">
                Đăng nhập để mua
              </LinkButton>
            ) : (
              <Button type="button" full size="lg" onClick={buy} disabled={!canBuy}>
                {busy ? "Đang mua…" : bought ? "Mua thêm một lần nữa" : "Xác nhận mua"}
              </Button>
            )}
            {blocked ? (
              <p className="m-0 mt-2.5 text-center text-sm text-warn-400">
                {blocked}
                {short > 0 ? (
                  <>
                    {" "}
                    <a href={`${idBase}/tai-khoan/vi`}>
                      Nạp thêm Xu
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </Card>

        {bought ? (
          <Card>
            <CardTitle>Trạng thái đơn</CardTitle>
            {recent.length === 0 ? (
              <Loading text="Đang đọc đơn…" />
            ) : (
              recent.map((o) => (
                <OrderRow
                  key={o.id}
                  name={o.name}
                  meta={`${o.created_at} · ${o.srv_code} · ${o.amount_fmt} Xu`}
                  status={o.status}
                  statusVi={o.status_vi}
                />
              ))
            )}
            <p className="m-0 mt-3 text-sm text-fg-muted">
              Trạng thái tự cập nhật trong ít phút.{" "}
              <a href="/cua-hang">
                Xem tất cả đơn
              </a>
            </p>
          </Card>
        ) : null}
      </div>

      <div className="mb-2 grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        <Card>
          <CardTitle>Lưu ý quan trọng</CardTitle>
          <Notes>
            <li>Phần thưởng phát về đúng nơi ghi ở dòng "Nhận ở" và không chuyển sang nhân vật khác được.</li>
            <li>{pkg.grant_note}</li>
            {pkg.cond ? <li>Điều kiện của gói: {pkg.cond}. Không thoả thì game từ chối và Xu được hoàn.</li> : null}
            <li>Giá trừ vào ví Xu chung của tài khoản, không phải Nguyên Bảo trong game.</li>
          </Notes>
        </Card>
        <Card>
          <CardTitle>Thông tin giao dịch</CardTitle>
          <Notes>
            <li>Nhận hàng: {pkg.grant_mode === "mail" ? "qua hòm thư trong game" : "game xử lý như một lần nạp"}.</li>
            <li>Thời gian thường thấy: dưới một phút kể từ lúc bấm xác nhận.</li>
            <li>Hoàn Xu: tự động vào ví khi game từ chối, không cần yêu cầu.</li>
            <li>Cần giúp: xem câu hỏi thường gặp, hoặc kiểm tra lịch sử ví ở trang tài khoản.</li>
          </Notes>
          <Actions>
            <LinkButton variant="ghost" href="/faq">
              Câu hỏi thường gặp
            </LinkButton>
            <LinkButton variant="ghost" href={`${idBase}/tai-khoan`}>
              Trang tài khoản
            </LinkButton>
          </Actions>
        </Card>
      </div>
    </>
  );
}
