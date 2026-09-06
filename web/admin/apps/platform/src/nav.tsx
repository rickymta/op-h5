import ArticleIcon from "@mui/icons-material/Article";
import BadgeIcon from "@mui/icons-material/Badge";
import BuildIcon from "@mui/icons-material/Build";
import DescriptionIcon from "@mui/icons-material/Description";
import DnsIcon from "@mui/icons-material/Dns";
import GroupIcon from "@mui/icons-material/Group";
import HistoryIcon from "@mui/icons-material/History";
import InventoryIcon from "@mui/icons-material/Inventory2";
import PersonIcon from "@mui/icons-material/Person";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import WalletIcon from "@mui/icons-material/AccountBalanceWallet";

/** Thanh điều hướng: giữ nguyên các đường của bản Go cũ để người trực không phải học lại. */
export const NAV = [
  { href: "/", label: "Đội máy chủ", icon: <DnsIcon fontSize="small" /> },
  { href: "/nguoi-choi", label: "Người chơi", icon: <GroupIcon fontSize="small" /> },
  { href: "/game", label: "Game", icon: <SportsEsportsIcon fontSize="small" /> },
  { href: "/tin-tuc", label: "Tin tức", icon: <ArticleIcon fontSize="small" /> },
  { href: "/trang-noi-dung", label: "Trang nội dung", icon: <DescriptionIcon fontSize="small" /> },
  { href: "/don-mua", label: "Đơn mua", icon: <ReceiptLongIcon fontSize="small" /> },
  { href: "/nap-tay", label: "Nạp tay", icon: <WalletIcon fontSize="small" /> },
  { href: "/goi", label: "Gói", icon: <InventoryIcon fontSize="small" /> },
  // Chỉ owner mới vào được trang nhân viên; API phía Go chặn lần nữa bằng requireOwner.
  { href: "/nhan-vien", label: "Nhân viên", icon: <BadgeIcon fontSize="small" />, roles: ["owner"] },
  { href: "/nhat-ky", label: "Nhật ký", icon: <HistoryIcon fontSize="small" /> },
  { href: "/tai-khoan", label: "Tài khoản của tôi", icon: <PersonIcon fontSize="small" /> },
  // App riêng, cùng tiến trình Go, phục vụ dưới tiền tố /gm — rời trang thật chứ không pushState.
  { href: "/gm", label: "Công cụ GM", icon: <BuildIcon fontSize="small" /> },
];

/**
 * Đăng xuất.
 *
 * `POST /dang-xuat` của Go là form thường: nó thu hồi phiên rồi trả 302 về /dang-nhap. Gửi
 * bằng fetch thì cookie mới bị xoá nhưng trang vẫn giữ dữ liệu cũ trên màn hình, nên ở đây
 * dựng một form thật và để trình duyệt rời trang — đúng như bản cũ làm.
 */
export function dangXuat() {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = "/dang-xuat";
  document.body.appendChild(f);
  f.submit();
}
