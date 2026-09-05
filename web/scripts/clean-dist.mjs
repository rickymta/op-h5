// Xoa noi dung thu muc build NHUNG giu .gitkeep.
//
// Vi sao khong dung emptyOutDir cua Vite: no xoa ca .gitkeep, ma file do la thu duy nhat
// giu cho thu muc dist/ ton tai trong git — thieu no thi `//go:embed all:dist` khong
// bien dich duoc tren may chua chay npm build.
import { readdirSync, rmSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "");
if (!process.argv[2]) {
  console.error("dung: node clean-dist.mjs <thu-muc>");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
for (const name of readdirSync(dir)) {
  if (name === ".gitkeep") continue;
  rmSync(join(dir, name), { recursive: true, force: true });
}
