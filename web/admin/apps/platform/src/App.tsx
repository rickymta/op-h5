import { useQuery } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { Shell, api } from "@op/admin-ui";
import type { Me } from "./api";
import { NAV, dangXuat } from "./nav";
import { Account } from "./pages/Account";
import { Audit } from "./pages/Audit";
import { Content } from "./pages/Content";
import { Fleet } from "./pages/Fleet";
import { Games } from "./pages/Games";
import { Login } from "./pages/Login";
import { News } from "./pages/News";
import { Orders } from "./pages/Orders";
import { Packages } from "./pages/Packages";
import { Players } from "./pages/Players";
import { Staff } from "./pages/Staff";
import { Topup } from "./pages/Topup";
import { KhongCoTrang } from "./pages/KhongCoTrang";

/** Mọi trang trừ trang đăng nhập. Đường giữ nguyên như bản Go/ops cũ. */
function Trong() {
  return (
    <Switch>
      <Route path="/" component={Fleet} />
      <Route path="/nguoi-choi" component={Players} />
      <Route path="/game" component={Games} />
      <Route path="/tin-tuc" component={News} />
      <Route path="/trang-noi-dung" component={Content} />
      <Route path="/don-mua" component={Orders} />
      <Route path="/nap-tay" component={Topup} />
      <Route path="/goi" component={Packages} />
      <Route path="/nhan-vien" component={Staff} />
      <Route path="/nhat-ky" component={Audit} />
      <Route path="/tai-khoan" component={Account} />
      <Route component={KhongCoTrang} />
    </Switch>
  );
}

export function App() {
  const [loc, setLoc] = useLocation();

  // Hỏi một lần khi mở trang: quyết định menu nào hiện và có phải cảnh báo mật khẩu mặc định.
  // `retry: false` vì 401 đã được `api` xử lý bằng cách chuyển sang /dang-nhap — thử lại chỉ
  // làm trang treo thêm vài giây trước khi rời đi.
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/me"),
    staleTime: 60_000,
    retry: false,
    enabled: loc !== "/dang-nhap",
  });

  // Trang đăng nhập không có Shell: chưa có phiên thì menu và tên người dùng đều vô nghĩa.
  if (loc === "/dang-nhap") return <Login />;

  const banner = me.data?.must_change_password ? (
    <Alert
      severity="error"
      variant="filled"
      square
      action={
        <Button color="inherit" size="small" onClick={() => setLoc("/tai-khoan")}>
          Đổi ngay
        </Button>
      }
    >
      Tài khoản đang dùng mật khẩu mặc định, ai cũng biết vì nó nằm trong mã nguồn công khai.
    </Alert>
  ) : undefined;

  return (
    <Shell
      brand="Quản trị nền tảng"
      nav={NAV}
      user={me.data ? { username: me.data.username, role: me.data.role } : null}
      onLogout={dangXuat}
      banner={banner}
      current={loc}
      onNavigate={(href) => {
        // /gm là app khác trong cùng tiến trình Go — phải rời trang thật, không pushState.
        if (href.startsWith("/gm")) window.location.href = href;
        else setLoc(href);
      }}
    >
      <Trong />
    </Shell>
  );
}
