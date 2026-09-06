import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApi } from "../../../scripts/mock-api.mjs";

// Xuat vao platform/cmd/adapter/dist-gm: giao dien GM phuc vu tai
// haitac.<domain>/admin-portal, tuc CUNG tien trinh voi API GM (internal/gmops chay trong
// Adapter cua tung game) va cung cookie `haitac_adm`. Dat o admin:8100/gm thi SPA se phai
// goi API khac origin va khac cookie — khong chay duoc.
// @types/node khong nam trong workspace nen `process` chua co kieu; khai dung truong can
// thay vi keo them mot goi types chi de doc mot bien moi truong.
declare const process: { env: Record<string, string | undefined> };
const mock = process.env.VITE_MOCK === "1";

export default defineConfig({
  // Mock phai bat tien to THAT ma app goi. Truoc day khai "/api/" trong khi moi loi goi deu
  // la "/admin-portal/api/..." — nen `npm run dev:mock` khong chan duoc gi, cac file trong
  // src/mock/ nam do khong ai dung, va nguoi phat trien ngoi doi vi sao trang trong.
  //
  // CHI "/admin-portal/api/", khong phai "/admin-portal/": duong con cua SPA (/gui-thu,
  // /nap-tay...) cung nam duoi tien to do, chan het thi vao trang nao cung ra JSON
  // "thieu file mock". Duong dang nhap khong can mock — `api/me.json` da tra ve mot nguoi
  // dang truc nen app vao thang.
  plugins: [react(), mockApi(["/admin-portal/api/"])],
  base: "/admin-portal/",
  build: {
    outDir: "../../../../platform/cmd/adapter/dist-gm",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2022",
  },
  // Che do mock KHONG duoc proxy: `/admin-portal` la ca tien to cua SPA lan cua API, nen
  // proxy se nuot luon cac duong trang (/gui-thu, /nap-tay) va tra ECONNREFUSED khi khong
  // co Adapter chay — man hinh den, khong loi nao noi vi sao.
  server: {
    port: 5274,
    proxy: mock ? undefined : { "/admin-portal": "http://127.0.0.1:8090", "/api": "http://127.0.0.1:8090" },
  },
});
