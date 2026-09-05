import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, LinkButton, Modal, Msg, formatInt } from "@op/ui/publisher";
import {
  api,
  errText,
  type ConvertResponse,
  type Me,
  type OrdersResponse,
  type Pkg,
  type RolesResponse,
} from "../api";
import { useMe, useMeta, usePackages, useServers, useTitle } from "../queries";
import { Loading, PageHead, PkgCard, QueryError } from "../parts";

/**
 * Cửa hàng: chuyển nguyên hành vi của platform/cmd/adapter/templates/store.html sang React —
 * tab thể loại, chọn nhân vật/máy chủ nhận, hộp xác nhận, khoá chống trùng theo phút, hỏi lại
 * đơn 3 s (tối đa 8 lần) khi còn `pending`, và đổi số dư khi Xu được hoàn tự động.
 */
export function Store() {
  const meta = useMeta();
  const me = useMe();
  const name = meta.data?.name;
  useTitle(name ? `Cửa hàng · ${name}` : undefined);
  const idBase = (meta.data?.id_base ?? "").replace(/\/+$/, "");

  return (
    <main className="pb-main">
      <PageHead
        eyebrow="Cửa hàng"
        title="Mua bằng Xu trong ví"
        lead="Xu là tiền chung của cả hệ thống. Nạp ở trang tài khoản, dùng ở game nào tuỳ bạn."
      />

      {me.isPending ? (
        <Card>
          <Loading text="Đang kiểm tra phiên đăng nhập…" />
        </Card>
      ) : me.isError ? (
        <QueryError error={me.error} prefix="Không kiểm tra được phiên đăng nhập" />
      ) : !me.data.logged_in ? (
        <Card>
          <p style={{ margin: "0 0 16px" }}>Đăng nhập để xem số dư và mua gói.</p>
          <LinkButton href="/choi-game">Đăng nhập</LinkButton>
        </Card>
      ) : (
        <StoreBody me={me.data} idBase={idBase} />
      )}

      <div style={{ marginTop: 28 }}>
        <Card>
          <h3>Lưu ý</h3>
          <ul className="gm-notes">
            <li>Phải đăng nhập mới mua được; gói gửi qua thư cần có nhân vật ở máy chủ nhận.</li>
            <li>Vật phẩm về hòm thư trong game, thường trong một phút.</li>
            <li>Game từ chối (hết lượt, chưa tới ngày mở) thì Xu được hoàn ngay vào ví.</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}

type Target = { value: string; text: string };

function StoreBody({ me, idBase }: { me: Me; idBase: string }) {
  const qc = useQueryClient();
  const balance = me.balance ?? 0;
  // Số dư sống ở cache ["me"]: đổi ở đây thì "tên · số dư Xu" trên thanh trên đổi theo.
  const setBalance = (b: number) => qc.setQueryData<Me>(["me"], (old) => (old ? { ...old, balance: b } : old));

  const servers = useServers();
  const packages = usePackages();
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RolesResponse>("/api/game/roles"),
    staleTime: Infinity,
    retry: false,
  });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.get<OrdersResponse>("/api/game/orders") });

  // Nhận ở: nhân vật từ masterList; không có (hoặc không đọc được) thì để chọn máy chủ.
  let targets: Target[] = [];
  if (!roles.isPending) {
    const rs = roles.data?.roles ?? [];
    if (rs.length) {
      targets = rs.map((r) => ({ value: `${r.srv_code}|${r.master_id_hex}`, text: `${r.name} · Lv${r.level} · ${r.srv_code}` }));
    } else {
      targets = (servers.data?.servers ?? []).map((s) => ({ value: `${s.code}|`, text: `Máy chủ ${s.name} (chưa có nhân vật)` }));
      if (!targets.length) targets = [{ value: "", text: "Chưa đọc được máy chủ" }];
    }
  }
  const [target, setTarget] = useState("");
  const sel = targets.find((t) => t.value === target) ?? targets[0];

  const cats = packages.data?.categories ?? [];
  const [cat, setCat] = useState("");
  const cur = cats.find((c) => c.key === cat) ?? cats[0];

  const [chosen, setChosen] = useState<Pkg | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // Đơn gần đây: hỏi lại vài lần sau khi mua để thấy "Đang phát…" → "Đã phát"; Xu hoàn tự động
  // (game từ chối) làm số dư đổi mà không qua tay người chơi.
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

  // Hộp xác nhận: giá, nơi nhận, số dư sau; chặn khi thiếu Xu hoặc gói gửi thư mà chưa có nhân vật.
  const after = chosen ? balance - chosen.price_xu : 0;
  const parts = (sel?.value ?? "").split("|");
  let note = "";
  let canBuy = false;
  if (chosen) {
    if (after < 0) note = `Thiếu ${formatInt(-after)} Xu. Nạp thêm ở trang tài khoản.`;
    else if (chosen.grant_mode === "mail" && parts[1] === "") note = "Gói này gửi qua thư: cần có nhân vật. Hãy vào game tạo nhân vật trước.";
    else {
      canBuy = true;
      note =
        chosen.grant_mode === "mail"
          ? "Vật phẩm vào hòm thư trong game, thường trong một phút."
          : "Game xử lý như một lần nạp. Game từ chối (hết lượt, chưa tới ngày) thì Xu được hoàn ngay.";
    }
  }

  async function buy() {
    if (!chosen || busy) return;
    const pkg = chosen;
    setBusy(true);
    setMsg(null);
    const srv = parts[0] ?? "";
    const role = parts[1] ?? "";
    // Khoá chống trùng: bấm hai lần vì sốt ruột không bị trừ hai lần.
    const key = `${pkg.id}-${srv}-${role || "-"}-${Math.floor(Date.now() / 60000)}`;
    try {
      const d = await api.post<ConvertResponse>("/api/game/convert", {
        package_id: pkg.id,
        srv_code: srv,
        role_id: role,
        idempotency_key: key,
      });
      setChosen(null);
      setBalance(Number(d.balance));
      setMsg({ tone: "ok", text: `Đã trừ ${formatInt(pkg.price_xu)} Xu cho ${pkg.name}. ${d.message ?? ""}` });
      pollOrders(8);
    } catch (e) {
      setChosen(null);
      setMsg({ tone: "err", text: errText(e) });
    }
    setBusy(false);
  }

  const list = (orders.data?.orders ?? []).slice(0, 10);

  return (
    <>
      <Card className="gm-wallet">
        <div>
          <span className="pb-muted gm-wallet__k">Số dư ví</span>
          <p className="gm-bal" data-xu={balance}>
            {formatInt(balance)}
            <small>Xu</small>
          </p>
          <p className="gm-target">
            <label htmlFor="gm-role">Nhận ở:</label>
            <select id="gm-role" value={sel?.value ?? ""} onChange={(e) => setTarget(e.target.value)} disabled={roles.isPending}>
              {roles.isPending ? (
                <option value="">đang tải nhân vật…</option>
              ) : (
                targets.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.text}
                  </option>
                ))
              )}
            </select>
          </p>
        </div>
        <LinkButton variant="ghost" href={`${idBase}/tai-khoan/vi`}>
          Nạp thêm Xu
        </LinkButton>
      </Card>

      {msg ? (
        <div style={{ marginTop: 14 }}>
          <Msg tone={msg.tone}>{msg.text}</Msg>
        </div>
      ) : null}

      {packages.isPending ? (
        <Loading text="Đang đọc bảng giá…" />
      ) : packages.isError ? (
        <div style={{ marginTop: 14 }}>
          <QueryError error={packages.error} prefix="Không đọc được bảng giá" />
        </div>
      ) : !cur ? (
        <div style={{ marginTop: 22 }}>
          <Card>
            <Empty>Chưa có gói nào được mở.</Empty>
          </Card>
        </div>
      ) : (
        <>
          <div className="gm-tabs" role="tablist" aria-label="Thể loại gói">
            {cats.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                className="gm-tab"
                aria-selected={c.key === cur.key}
                onClick={() => setCat(c.key)}
              >
                {c.title}
              </button>
            ))}
          </div>
          <p className="gm-cat-hint">{cur.hint}</p>
          <div className="gm-pkgs">
            {cur.packages.map((p) => (
              <PkgCard key={p.id} p={p} poor={p.price_xu > balance} onPick={setChosen} />
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 28 }}>
        <Card>
          <h3 style={{ marginBottom: 8 }}>Đơn gần đây</h3>
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
      </div>

      <Modal
        open={chosen !== null}
        onClose={() => {
          if (!busy) setChosen(null);
        }}
        title={chosen?.name ?? "Xác nhận"}
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setChosen(null)} disabled={busy}>
              Để sau
            </Button>
            <Button type="button" onClick={buy} disabled={!canBuy || busy}>
              {busy ? "Đang mua…" : "Mua"}
            </Button>
          </>
        }
      >
        {chosen ? (
          <>
            <div className="gm-kv">
              <b>Giá</b>
              <span>{formatInt(chosen.price_xu)} Xu</span>
              <b>Nhận ở</b>
              <span>{sel?.text ?? "—"}</span>
              <b>Số dư sau</b>
              <span>{formatInt(after)} Xu</span>
            </div>
            <p className="pb-sub">{note}</p>
          </>
        ) : null}
      </Modal>
    </>
  );
}
