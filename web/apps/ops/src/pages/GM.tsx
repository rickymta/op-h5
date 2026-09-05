import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Toast, formatInt, useToast } from "@op/ui";
import { api, type BagSlot, type GMMeta, type Role } from "../api";

/** Công cụ GM: tra nhân vật rồi thao tác trên đúng nhân vật đó. Thay gmhanglong/gm/*.php. */
export function GM() {
  const { toast, show } = useToast();
  const [srv, setSrv] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);

  const meta = useQuery({ queryKey: ["gm-meta"], queryFn: () => api.get<GMMeta>("/api/gm/meta") });
  const servers = meta.data?.servers ?? [];
  const chosenSrv = srv || servers[0]?.code || "";

  const search = useMutation({
    mutationFn: () =>
      api.get<{ roles: Role[] }>(`/api/gm/roles?srv=${encodeURIComponent(chosenSrv)}&name=${encodeURIComponent(name.trim())}`),
    onError: (e: Error) => show(e.message, true),
  });

  const roles = search.data?.roles ?? [];

  return (
    <main>
      <h2>Công cụ GM</h2>
      <p className="sub">
        Mọi thao tác ghi vào nhật ký kèm tên tài khoản và kết quả. Tìm nhân vật trước, rồi
        thao tác trên đúng nhân vật đã chọn.
      </p>

      <div className="card">
        <form
          style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}
          onSubmit={(e) => {
            e.preventDefault();
            setRole(null);
            if (name.trim()) search.mutate();
          }}
        >
          <div>
            <label htmlFor="srv">Máy chủ</label>
            <select id="srv" value={chosenSrv} onChange={(e) => setSrv(e.target.value)}>
              {servers.length === 0 && <option value="">(đang tải)</option>}
              {servers.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <label htmlFor="nv">Tên nhân vật</label>
            <input id="nv" style={{ width: "100%" }} value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="gõ đúng tên trong game" autoComplete="off" />
          </div>
          <button type="submit" disabled={search.isPending || !name.trim()}>
            {search.isPending ? "Đang tìm…" : "Tìm"}
          </button>
        </form>

        {search.isSuccess && roles.length === 0 && (
          <p className="sub" style={{ marginTop: 14 }}>Không có nhân vật nào tên như vậy trên {chosenSrv}.</p>
        )}
        {roles.length > 0 && (
          <div className="bang-cuon" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr><th>Nhân vật</th><th>Cấp</th><th>VIP</th><th>Lực chiến</th><th>Tài khoản</th><th /></tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.roleId} style={role?.roleId === r.roleId ? { background: "var(--surface2)" } : undefined}>
                    <td>{r.roleName}<div className="muted" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{r.roleId}</div></td>
                    <td className="num">{r.level}</td>
                    <td className="num">{r.vipLevel}</td>
                    <td className="num">{formatInt(r.power)}</td>
                    <td className="num">{r.accountUid}</td>
                    <td><button className={role?.roleId === r.roleId ? "" : "ghost"} onClick={() => setRole(r)}>Chọn</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {role && (
        <>
          <p className="sub">
            Đang thao tác trên <b>{role.roleName}</b> · {role.srvCode} · cấp {role.level} · VIP {role.vipLevel}
          </p>
          <BagPanel role={role} bags={meta.data?.bags ?? []} show={show} />
          <PayPanel role={role} show={show} />
          <MailPanel role={role} show={show} />
        </>
      )}
      <Toast toast={toast} />
    </main>
  );
}

type ShowFn = (text: string, bad?: boolean) => void;

// ---------------------------------------------------------------- kho đồ

function BagPanel({ role, bags, show }: { role: Role; bags: GMMeta["bags"]; show: ShowFn }) {
  const [type, setType] = useState<number>(bags[0]?.type ?? 3);
  const qc = useQueryClient();
  const key = ["gm-bag", role.srvCode, role.roleId, type];

  const bag = useQuery({
    queryKey: key,
    queryFn: () =>
      api.get<{ slots: BagSlot[] }>(
        `/api/gm/bag?srv=${encodeURIComponent(role.srvCode)}&role=${encodeURIComponent(role.roleId)}&type=${type}`),
  });
  const slots = bag.data?.slots ?? [];
  const kind = bags.find((b) => b.type === type);

  const clear = useMutation({
    mutationFn: () =>
      api.post<{ cleared: number; failed: number; message: string }>("/api/gm/bag/clear", {
        srv: role.srvCode, role: role.roleId, type, expect: slots.length,
      }),
    onSuccess: (d) => {
      show(d.message, d.failed > 0);
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => show(e.message, true),
  });

  return (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>Kho đồ</h2>
      <p className="sub">Xoá theo từng ô, không xoá theo mã vật phẩm. Không lùi lại được.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginBottom: 12 }}>
        <div>
          <label htmlFor="bag">Loại</label>
          <select id="bag" value={type} onChange={(e) => setType(Number(e.target.value))}>
            {bags.map((b) => <option key={b.type} value={b.type}>{b.label}</option>)}
          </select>
        </div>
        <button className="ghost" onClick={() => void qc.invalidateQueries({ queryKey: key })} disabled={bag.isFetching}>
          {bag.isFetching ? "Đang đọc…" : "Đọc lại"}
        </button>
        <button
          disabled={clear.isPending || slots.length === 0}
          onClick={() => {
            if (!window.confirm(`Xoá toàn bộ ${slots.length} ô "${kind?.label}" của ${role.roleName}? Không lùi lại được.`)) return;
            clear.mutate();
          }}
        >
          {clear.isPending ? "Đang xoá…" : `Xoá tất cả (${slots.length})`}
        </button>
        {kind?.note && <span className="muted" style={{ fontSize: 13 }}>{kind.note}</span>}
      </div>

      {bag.isError && <p className="err">{(bag.error as Error).message}</p>}
      <div className="bang-cuon">
        <table>
          <thead><tr><th>Ô</th><th>Mã</th><th>Tên</th><th>Số lượng</th></tr></thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td className="num">{s.id}</td>
                <td className="num">{s.tid}</td>
                <td>{s.name}</td>
                <td className="num">{formatInt(s.num)}</td>
              </tr>
            ))}
            {!bag.isLoading && slots.length === 0 && (
              <tr><td colSpan={4} className="muted">Kho đồ loại này đang trống.</td></tr>
            )}
            {bag.isLoading && <tr><td colSpan={4} className="muted">Đang đọc…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- nạp tay

function PayPanel({ role, show }: { role: Role; show: ShowFn }) {
  const [payID, setPayID] = useState("");
  const [count, setCount] = useState("1");
  const [note, setNote] = useState("");

  const pay = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>("/api/gm/pay", {
        srv: role.srvCode, role: role.roleId, account_uid: role.accountUid, role_name: role.roleName,
        pay_id: Number(payID), count: Number(count) || 1, note,
      }),
    onSuccess: (d) => { show(d.message); setPayID(""); setNote(""); },
    onError: (e: Error) => show(e.message, true),
  });

  return (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>Nạp tay</h2>
      <p className="sub">
        Game xử lý như một lần nạp thật: cộng Nguyên Bảo theo mốc, x2 lần đầu, cộng điểm VIP,
        kích hoạt thẻ và quỹ. Mã gói là ID mục nạp, tra ở trang Gói.
      </p>
      <form
        style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}
        onSubmit={(e) => { e.preventDefault(); if (payID.trim()) pay.mutate(); }}
      >
        <div><label htmlFor="pid">Mã gói</label>
          <input id="pid" inputMode="numeric" value={payID} onChange={(e) => setPayID(e.target.value.replace(/\D/g, ""))} placeholder="18001" style={{ width: 110 }} /></div>
        <div><label htmlFor="cnt">Số lần</label>
          <input id="cnt" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} style={{ width: 70 }} /></div>
        <div style={{ flex: "1 1 200px" }}><label htmlFor="pn">Ghi chú</label>
          <input id="pn" style={{ width: "100%" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="lý do, vào nhật ký" /></div>
        <button type="submit" disabled={pay.isPending || !payID.trim()}>{pay.isPending ? "Đang nạp…" : "Nạp"}</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- gửi thư

function MailPanel({ role, show }: { role: Role; show: ShowFn }) {
  const [title, setTitle] = useState("Thư từ quản trị");
  const [content, setContent] = useState("");
  const [reward, setReward] = useState("");

  const send = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>("/api/gm/mail", {
        srv: role.srvCode, role: role.roleId, role_name: role.roleName, title, content, reward: reward.trim(),
      }),
    onSuccess: (d) => { show(d.message); setReward(""); setContent(""); },
    onError: (e: Error) => show(e.message, true),
  });

  const ok = /^\d+:\d+:\d+(#\d+:\d+:\d+)*$/.test(reward.trim());

  return (
    <div className="card">
      <h2 style={{ fontSize: 16 }}>Gửi thư kèm quà</h2>
      <p className="sub">
        Chỉ gửi cho một nhân vật. Quà dạng <code>type:id:count</code>, nhiều món nối bằng <code>#</code>.
        <code>0:1:N</code> Nguyên Bảo · <code>0:0:N</code> Kim tệ · <code>0:4:N</code> EXP anh hùng · <code>3:id:N</code> vật phẩm.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) send.mutate(); }} style={{ maxWidth: 560 }}>
        <Field label="Tiêu đề" htmlFor="mt">
          <input id="mt" style={{ width: "100%" }} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Nội dung" htmlFor="mc">
          <textarea id="mc" style={{ width: "100%" }} rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} />
        </Field>
        <Field label="Quà" htmlFor="mr" hint={reward.trim() && !ok ? "— sai định dạng" : undefined}>
          <input id="mr" style={{ width: "100%", fontFamily: "var(--mono)" }} value={reward}
                 onChange={(e) => setReward(e.target.value)} placeholder="0:1:5000#3:100022:10" />
        </Field>
        <button type="submit" disabled={send.isPending || !ok}>{send.isPending ? "Đang gửi…" : "Gửi thư"}</button>
      </form>
    </div>
  );
}
