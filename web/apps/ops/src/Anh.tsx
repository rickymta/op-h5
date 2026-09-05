import { useState } from "react";
import { Field } from "@op/ui";

/** Ảnh có thể ghi tương đối so với trang game (vd `/assets/images/logo.png`). Trang quản trị
 *  chạy ở gốc khác nên phải ghép với `site_url` mới xem trước được; đường khác thì không thử. */
export function anhTuyetDoi(url: string, site: string): string {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/") && site) return site.replace(/\/+$/, "") + u;
  return "";
}

/** Ô 48px: ảnh nếu tải được, "—" khi chưa có, "lỗi" khi URL không tải được. */
export function XemTruoc({ src }: { src: string }) {
  const [hong, setHong] = useState("");
  if (!src || hong === src) {
    return <div className="xem-truoc trong" aria-hidden="true">{src ? "lỗi" : "—"}</div>;
  }
  return <img className="xem-truoc" src={src} alt="" onError={() => setHong(src)} />;
}

/** Nhãn + ô nhập URL ảnh + xem trước. `site` để ghép URL tương đối. */
export function OAnh({ id, label, hint, value, site, onChange, placeholder }: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  site: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
               style={{ flex: 1, minWidth: 0 }} autoComplete="off" />
        <XemTruoc src={anhTuyetDoi(value, site)} />
      </div>
    </Field>
  );
}
