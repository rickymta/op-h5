// Plugin Vite: khi VITE_MOCK=1, tra file JSON trong src/mock/ thay cho API that.
//
// /api/games            -> src/mock/api/games.json
// POST /api/login       -> src/mock/api/login.post.json (khong co thi dung login.json)
// Query string bi bo qua. Thieu file thi tra 404 JSON noi ro duong dan de biet phai them gi.
import fs from "node:fs";
import path from "node:path";

export function mockApi(prefixes = ["/api/"]) {
  return {
    name: "op-mock-api",
    configureServer(server) {
      if (process.env.VITE_MOCK !== "1") return;
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://mock");
        if (!prefixes.some((p) => url.pathname.startsWith(p))) return next();
        const rel = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
        const base = path.join(server.config.root, "src", "mock", rel);
        const method = (req.method ?? "GET").toLowerCase();
        const candidates = method === "get" ? [base + ".json"] : [base + "." + method + ".json", base + ".json"];
        const file = candidates.find((f) => fs.existsSync(f));
        res.setHeader("content-type", "application/json; charset=utf-8");
        if (!file) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "mock_missing", error_description: "Thiếu file mock: " + candidates[0] }));
          return;
        }
        res.end(fs.readFileSync(file));
      });
    },
  };
}
