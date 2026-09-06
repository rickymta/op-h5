// Bộ thành phần "publisher" cho hai trang công khai (portal + trang game). Kiểu dáng nằm ở
// publisher.css — app nạp `import "@op/ui/publisher.css"` một lần trong main.tsx.
//
// Vài điều app cần biết:
//   - Liên kết trong TopBar/SideNav/GameCard/NewsList/Footer là `<a href>` thường (tải lại
//     trang) để `/choi-game`, `/auth/logout`… là redirect phía Go chạy đúng.
//   - Lớp bố cục có sẵn: `.pb-main` (khung nội dung), `.pb-layout` (SideNav + nội dung),
//     `.pb-game-grid` (lưới thẻ game, 2 cột ở điện thoại).
//   - Số/giờ đưa vào thành phần đã định dạng sẵn bằng formatInt/formatDate/timeAgo.
//   - Bố cục "bảng dày" theo mockup người vận hành: FilterBar (+SelectField/SearchField) trên
//     cùng, DataTable ở giữa, Pagination dưới; trang chi tiết dùng Breadcrumb → StatCard →
//     Steps → QuickPick → KeyValue.
export { Button, type ButtonVariant, type ButtonSize } from "./Button";
export { LinkButton } from "./LinkButton";
export { TopBar, type TopBarLink } from "./TopBar";
export { Hero } from "./Hero";
export { StatTiles } from "./StatTiles";
export { GameCard } from "./GameCard";
export { NewsList, type NewsItem } from "./NewsList";
export { ServerRow } from "./ServerRow";
export { BandPill } from "./BandPill";
export { SideNav } from "./SideNav";
export { Section } from "./Section";
export { Card } from "./Card";
export { Msg } from "./Msg";
export { Empty } from "./Empty";
export { Footer } from "./Footer";
export { Modal } from "./Modal";
export { Field } from "./Field";
export { Toast, useToast, type ToastMsg } from "./Toast";
export { Breadcrumb } from "./Breadcrumb";
export { DataTable, type Column } from "./DataTable";
export { FilterBar } from "./FilterBar";
export { SelectField } from "./SelectField";
export { SearchField } from "./SearchField";
export { QuickPick } from "./QuickPick";
export { StatCard, type StatTone } from "./StatCard";
export { TrustRow } from "./TrustRow";
export { KeyValue } from "./KeyValue";
export { Steps } from "./Steps";
export { Pagination } from "./Pagination";
export { timeAgo, formatInt, formatDate } from "./format";
export { BADGE_LABEL, type Band, type Badge } from "./types";
