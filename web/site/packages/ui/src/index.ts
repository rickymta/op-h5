// @op/site-ui — bộ thành phần Tailwind cho ba app công khai (portal, chợ, trang game).
//
// Cách dùng trong app:
//   1. `main.tsx`: `import "@op/site-ui/base.css";` một lần duy nhất.
//   2. `tailwind.config.cjs`: `presets: [require("@op/site-ui/tailwind-preset")]` và `content`
//      PHẢI liệt kê cả `../../packages/ui/src/**/*.{ts,tsx}` — class nằm trong mã của gói này,
//      Tailwind không quét thì trang ra trắng trơn không báo lỗi.
//
// Vài điều app cần biết:
//   - Liên kết trong TopBar/GameCard/NewsList/Footer là `<a href>` thường (tải lại trang) để
//     `/choi-game`, `/auth/logout`… là redirect phía Go chạy đúng.
//   - Lớp bố cục có sẵn trong base.css: `.site-main` (khung nội dung), `.site-layout`
//     (cột trái + nội dung), `.site-game-grid`, `.site-stat-grid`.
//   - Số/giờ đưa vào thành phần đã định dạng sẵn bằng formatInt/formatDate/timeAgo.
//   - Bố cục "bảng dày": FilterBar (+SelectField/SearchField) trên cùng, DataTable ở giữa,
//     Pagination dưới; trang chi tiết dùng Breadcrumb → StatCard → Steps → QuickPick → KeyValue.

export { Button, LinkButton, btnClass, type ButtonVariant, type ButtonSize } from "./Button";
export { TopBar, type TopBarLink } from "./TopBar";
export { Footer } from "./Footer";
export { Hero } from "./Hero";
export { Section } from "./Section";
export { Card } from "./Card";
export { Msg, Empty } from "./Msg";
export { Badge, BandPill } from "./Badge";
export { ServerRow } from "./ServerRow";
export { GameCard } from "./GameCard";
export { NewsList, type NewsItem } from "./NewsList";
export { DataTable, type Column } from "./DataTable";
export { FilterBar, SelectField, SearchField } from "./FilterBar";
export { QuickPick } from "./QuickPick";
export { StatCard, KeyValue, type StatTone } from "./StatCard";
export { Steps } from "./Steps";
export { Pagination } from "./Pagination";
export { Breadcrumb, TrustRow, Field } from "./Breadcrumb";
export { Modal } from "./Modal";
export { Toast, useToast, type ToastMsg } from "./Toast";
export { RichText, parseBlocks } from "./RichText";
export { api, ApiError, errText } from "./api";
export { formatInt, formatDate, timeAgo } from "./format";
export { cx } from "./cx";
export { BADGE_LABEL, type Band, type GameBadge, type Tone } from "./types";
