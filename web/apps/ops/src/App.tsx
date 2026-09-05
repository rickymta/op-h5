import { useQuery } from "@tanstack/react-query";
import { Link, Route, Switch, useLocation } from "wouter";
import { api, type Me } from "./api";
import { Account } from "./pages/Account";
import { Games } from "./pages/Games";
import { GM } from "./pages/GM";
import { News } from "./pages/News";
import { Orders } from "./pages/Orders";
import { Players } from "./pages/Players";
import { Staff } from "./pages/Staff";

/** Thanh điều hướng: giữ nguyên các đường của bản Go để người trực không phải học lại. */
function Nav({ me }: { me?: Me }) {
  const [loc] = useLocation();
  const item = (href: string, label: string) => (
    <Link href={href} style={loc === href ? { color: "var(--text)" } : undefined}>
      {label}
    </Link>
  );
  return (
    <header>
      <h1>Quản trị nền tảng</h1>
      <nav>
        {item("/", "Đội máy chủ")}
        {item("/gm", "Công cụ GM")}
        {item("/nguoi-choi", "Người chơi")}
        {item("/game", "Game")}
        {item("/tin-tuc", "Tin tức")}
        {item("/nap-tay", "Nạp tay")}
        {item("/goi", "Gói")}
        {item("/don-mua", "Đơn mua")}
        {me?.role === "owner" && item("/nhan-vien", "Nhân viên")}
        {item("/nhat-ky", "Nhật ký")}
        {item("/tai-khoan", me ? `${me.username} · ${me.role}` : "Tài khoản")}
        <form method="POST" action="/dang-xuat" style={{ margin: 0 }}>
          <button className="ghost" type="submit">Thoát</button>
        </form>
      </nav>
    </header>
  );
}

/** Trang chưa chuyển sang React thì trả về bản Go (cùng đường, khác tiền tố). */
function ChuaChuyen({ title, goPath }: { title: string; goPath: string }) {
  return (
    <main>
      <h2>{title}</h2>
      <p className="sub">Trang này vẫn dùng bản cũ trong khi chuyển dần sang giao diện mới.</p>
      <div className="card">
        <a href={goPath}>Mở bản cũ →</a>
      </div>
    </main>
  );
}

export function App() {
  // Hỏi một lần khi mở trang: quyết định menu nào hiện và có phải cảnh báo mật khẩu mặc định.
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/me"), staleTime: 60_000 });

  return (
    <>
      <Nav me={me.data} />
      {me.data?.must_change_password && (
        <div className="err" style={{ margin: 0, borderRadius: 0, textAlign: "center" }}>
          Tài khoản đang dùng mật khẩu mặc định, ai cũng biết vì nó nằm trong mã nguồn công khai.{" "}
          <Link href="/tai-khoan">Đổi ngay →</Link>
        </div>
      )}
      <Switch>
        <Route path="/gm" component={GM} />
        <Route path="/nguoi-choi" component={Players} />
        <Route path="/game" component={Games} />
        <Route path="/tin-tuc" component={News} />
        <Route path="/nhan-vien" component={Staff} />
        <Route path="/tai-khoan" component={Account} />
        <Route path="/don-mua" component={Orders} />
        <Route path="/">{() => <ChuaChuyen title="Đội máy chủ" goPath="/cu/" />}</Route>
        <Route path="/nap-tay">{() => <ChuaChuyen title="Nạp tay" goPath="/cu/nap-tay" />}</Route>
        <Route path="/goi">{() => <ChuaChuyen title="Gói cửa hàng" goPath="/cu/goi" />}</Route>
        <Route path="/nhat-ky">{() => <ChuaChuyen title="Nhật ký" goPath="/cu/nhat-ky" />}</Route>
        <Route>{() => <ChuaChuyen title="Không có trang này" goPath="/cu/" />}</Route>
      </Switch>
    </>
  );
}
