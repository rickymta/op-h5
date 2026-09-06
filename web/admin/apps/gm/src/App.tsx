// Khung công cụ GM: một thanh chọn game/máy chủ giữ nguyên qua mọi trang, bốn màn hình.
//
// Sắp xếp theo việc của ca trực chứ không theo API: mở ra là ô tìm nhân vật (việc đầu tiên
// của mọi phiếu hỗ trợ), tìm ra rồi thì mọi thao tác đều đã biết mình đang làm cho ai.

import { useQuery } from "@tanstack/react-query";
import { Redirect, Route, Switch, useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { Shell } from "@op/admin-ui";
import { canGM, type GMMeta } from "./api";
import { api } from "./api";
import { useChon } from "./chon";
import { layMe } from "./phien";
import { ThanhChon } from "./ThanhChon";
import { DangNhap } from "./pages/DangNhap";
import { TraNhanVat } from "./pages/TraNhanVat";
import { TrangNhanVat } from "./pages/TrangNhanVat";
import { NapTay } from "./pages/NapTay";
import { GuiThu } from "./pages/GuiThu";

const NAV = [
  { href: "/", label: "Tra nhân vật", icon: <PersonSearchOutlinedIcon fontSize="small" /> },
  { href: "/nhan-vat", label: "Nhân vật đang chọn", icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { href: "/nap-tay", label: "Nạp tay", icon: <PaidOutlinedIcon fontSize="small" /> },
  { href: "/gui-thu", label: "Gửi thư kèm quà", icon: <MailOutlineIcon fontSize="small" /> },
];

function Cho() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export function App() {
  const [, go] = useLocation();
  const { game, role } = useChon();

  // Hỏi một lần khi mở trang. `retry: false` vì "chưa đăng nhập" trả về null chứ không ném
  // lỗi — thử lại chẳng đổi được gì, chỉ kéo dài màn hình chờ.
  const me = useQuery({ queryKey: ["me"], queryFn: layMe, retry: false, staleTime: 60_000 });

  // Thư mục dùng chung: danh sách game, máy chủ của game đang chọn, và các loại kho đồ.
  // Chưa chọn game thì để máy chủ tự quyết (`pickGame`) rồi đồng bộ ngược lại qua ThanhChon.
  const meta = useQuery({
    queryKey: ["gm-meta", game],
    queryFn: () => api.get<GMMeta>("/api/gm/meta" + (game ? `?game=${encodeURIComponent(game)}` : "")),
    enabled: !!me.data,
    staleTime: 5 * 60_000,
  });

  if (me.isPending) return <Cho />;
  if (me.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{(me.error as Error).message}</Alert>
      </Box>
    );
  }
  if (!me.data) return <DangNhap onXong={() => void me.refetch()} />;

  const nguoi = me.data;
  const tenGame = meta.data?.games.find((g) => g.code === meta.data?.game)?.name ?? "game";
  const duocGhi = canGM(nguoi);

  return (
    <Shell
      brand={`Công cụ GM · ${tenGame}`}
      nav={NAV}
      base="/gm"
      onNavigate={go}
      user={{ username: nguoi.username, role: nguoi.role }}
      onLogout={() => {
        // Đăng xuất là form POST của Go (cookie HttpOnly, cùng phiên với trang quản trị).
        const f = document.createElement("form");
        f.method = "POST";
        f.action = "/dang-xuat";
        document.body.appendChild(f);
        f.submit();
      }}
      banner={
        <>
          {nguoi.must_change_password && (
            <Alert severity="warning" square sx={{ borderRadius: 0 }}>
              Tài khoản đang dùng mật khẩu mặc định — ai đọc mã nguồn công khai cũng biết.{" "}
              <Link href="/tai-khoan" color="inherit">
                Đổi ở trang quản trị nền tảng →
              </Link>
            </Alert>
          )}
          {!duocGhi && (
            <Alert severity="info" square sx={{ borderRadius: 0 }}>
              Vai trò <b>{nguoi.role}</b> chỉ được xem. Mọi nút tạo ra giá trị trong game đều bị tắt.
            </Alert>
          )}
          <ThanhChon meta={meta.data} dangTai={meta.isPending} />
        </>
      }
    >
      <Switch>
        <Route path="/" component={TraNhanVat} />
        <Route path="/nhan-vat">
          {() => <TrangNhanVat me={nguoi} bags={meta.data?.bags ?? []} />}
        </Route>
        <Route path="/nhan-vat/:id">
          {/* Đường sâu để dán vào phiếu hỗ trợ; nhân vật thật lấy từ lựa chọn đang giữ. */}
          {(p) => (role?.roleId === p.id ? <TrangNhanVat me={nguoi} bags={meta.data?.bags ?? []} /> : <Redirect to="/nhan-vat" />)}
        </Route>
        <Route path="/nap-tay">{() => <NapTay me={nguoi} />}</Route>
        <Route path="/gui-thu">{() => <GuiThu me={nguoi} bags={meta.data?.bags ?? []} />}</Route>
        <Route>{() => <Redirect to="/" />}</Route>
      </Switch>
    </Shell>
  );
}
