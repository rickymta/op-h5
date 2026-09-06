// Bản dựng thử: mọi thành phần của @op/admin-ui với dữ liệu mẫu tiếng Việt.
//
// Không gọi API thật, không nối react-query — chỉ để nhìn bằng mắt ở 1280px và 768px, và để
// `vite build` cho ra con số gzip mà hai app quản trị phải chia nhau.
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import ArticleIcon from "@mui/icons-material/Article";
import BadgeIcon from "@mui/icons-material/Badge";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupIcon from "@mui/icons-material/Group";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

import {
  AdminApp,
  ConfirmDialog,
  FormDialog,
  Grid,
  LoginCard,
  Money,
  Page,
  Shell,
  StatusChip,
  formatDate,
  formatInt,
  timeAgo,
  useToast,
  type AdminColDef,
  type NavItem,
} from "@op/admin-ui";

// ------------------------------------------------------------------ dữ liệu mẫu

interface Don {
  id: number;
  username: string;
  goi: string;
  srv: string;
  xu: number;
  status: string;
  created_at: string;
}

const NOW = Date.now();
const TEN = ["hoanganh", "minhduc", "thuylinh", "quangbao", "lananh", "trungkien", "myduyen", "vanhung"];
const GOI = ["Gói 60 KNB", "Gói 300 KNB", "Thẻ tháng", "Quỹ trưởng thành", "Gói 980 KNB", "Thẻ tuần"];
const TT = ["granted", "pending", "failed", "granted", "refunded", "granted", "pending", "granted"];

const DON: Don[] = Array.from({ length: 23 }, (_, i) => ({
  id: 10230 - i,
  username: TEN[i % TEN.length] ?? "khach",
  goi: GOI[i % GOI.length] ?? "Gói lạ",
  srv: `s${(i % 3) + 1}`,
  xu: (i % 5 === 4 ? -1 : 1) * (12000 + i * 3170),
  status: TT[i % TT.length] ?? "pending",
  created_at: new Date(NOW - i * 3_600_000 * 7).toISOString(),
}));

const NAV: NavItem[] = [
  { href: "/don-mua", label: "Đơn mua", icon: <ReceiptLongIcon fontSize="small" /> },
  { href: "/nguoi-choi", label: "Người chơi", icon: <GroupIcon fontSize="small" /> },
  { href: "/game", label: "Game", icon: <SportsEsportsIcon fontSize="small" /> },
  { href: "/tin-tuc", label: "Tin tức", icon: <ArticleIcon fontSize="small" /> },
  { href: "/trang", label: "Trang nội dung", icon: <DescriptionIcon fontSize="small" /> },
  { href: "/nhan-vien", label: "Nhân viên", icon: <BadgeIcon fontSize="small" />, roles: ["owner"] },
];

/**
 * Trạng thái mở sẵn theo query, để chụp ảnh lại được y hệt bằng Chrome headless (nó không
 * bấm được nút): `?hop=form`, `?hop=xoa`, `?bang=rong`, `?man=dang-nhap`, `?menu=1`.
 */
const Q = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

// ------------------------------------------------------------------ trang chính

function DonMua() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rong, setRong] = useState(Q.get("bang") === "rong");
  const [form, setForm] = useState(Q.get("hop") === "form");
  const [xoa, setXoa] = useState<Don | null>(Q.get("hop") === "xoa" ? (DON[0] ?? null) : null);
  const [busy, setBusy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const size = 8;
  const rows = useMemo(() => (rong ? [] : DON.slice((page - 1) * size, page * size)), [page, rong]);

  // Cố tình khai ngay trong thân hàm (mảng mới mỗi render) — đó là cách app sẽ viết, và
  // `Grid` phải chịu được chuyện đó.
  const cols: AdminColDef[] = [
    { field: "id", headerName: "Mã đơn", width: 90 },
    { field: "username", headerName: "Tài khoản", flex: 1, minWidth: 120 },
    { field: "goi", headerName: "Gói", flex: 1.4, minWidth: 150, hideBelow: "sm" },
    { field: "srv", headerName: "Máy chủ", width: 90, hideBelow: "md" },
    {
      field: "xu",
      headerName: "Số xu",
      width: 120,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => <Money xu={p.row.xu as number} sign />,
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 130,
      renderCell: (p) => <StatusChip value={p.row.status as string} />,
    },
    {
      field: "created_at",
      headerName: "Tạo lúc",
      width: 150,
      hideBelow: "lg",
      renderCell: (p) => (
        <span title={formatDate(p.row.created_at as string)}>{timeAgo(p.row.created_at as string)}</span>
      ),
    },
  ];

  return (
    <Page
      title="Đơn mua"
      sub={`${formatInt(DON.length)} đơn trong 7 ngày · tổng ${formatInt(1_284_000)} xu`}
      breadcrumb={[{ label: "Quản trị", href: "/" }, { label: "Đơn mua" }]}
      actions={
        <>
          <Button variant="outlined" color="inherit" onClick={() => setRong((v) => !v)}>
            {rong ? "Có dữ liệu" : "Xem bảng rỗng"}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => setLoading(false), 1200);
            }}
          >
            Nạp lại
          </Button>
          <Button variant="contained" onClick={() => setForm(true)}>
            Nạp tay
          </Button>
        </>
      }
    >
      <Stack spacing={3}>
        <Grid
          columns={cols}
          rows={rows}
          rowId={(r) => r.id}
          loading={loading}
          empty="Không có đơn nào khớp bộ lọc."
          page={page}
          pageSize={size}
          total={rong ? 0 : DON.length}
          onPage={setPage}
          onRowClick={(r) => toast.show(`Mở đơn ${r.id} của ${r.username}`, "info")}
        />

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Chip trạng thái
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {["pending", "granted", "failed", "refunded", "active", "hidden", "locked", "draft", "published", "owner", "gm", "trang_thai_la"].map(
                (s) => (
                  <StatusChip key={s} value={s} />
                ),
              )}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Số tiền
            </Typography>
            <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", gap: 2 }}>
              <Money xu={1234567} unit />
              <Money xu={98000} sign />
              <Money xu={-45500} sign />
              <Money xu={0} />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Thông báo ngắn
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button size="small" variant="outlined" color="success" onClick={() => toast.show("Đã lưu thay đổi.")}>
                Thành công
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => toast.show("Máy chủ trả về nội dung lạ (HTTP 502).", "error")}
              >
                Lỗi
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => toast.show("Đơn đã được xử lý ở phiên khác.", "warning")}
              >
                Cảnh báo
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Button color="error" variant="outlined" onClick={() => setXoa(DON[0] ?? null)}>
              Xoá đơn đầu tiên
            </Button>
          </CardContent>
        </Card>
      </Stack>

      <FormDialog
        open={form}
        title="Nạp tay cho tài khoản"
        onClose={() => {
          setForm(false);
          setLoi(null);
        }}
        onSubmit={() => {
          setBusy(true);
          setLoi(null);
          window.setTimeout(() => {
            setBusy(false);
            if (Math.random() < 0.4) {
              setLoi("Tài khoản không tồn tại trên máy chủ s1.");
              return;
            }
            setForm(false);
            toast.show("Đã tạo phiếu nạp tay.");
          }, 900);
        }}
        submitLabel="Tạo phiếu"
        busy={busy}
        error={loi}
        maxWidth="sm"
      >
        <TextField label="Tài khoản" defaultValue="hoanganh" />
        <TextField label="Máy chủ" select defaultValue="s1">
          <MenuItem value="s1">s1 · Hải Trình</MenuItem>
          <MenuItem value="s2">s2 · Phong Ba</MenuItem>
          <MenuItem value="s3">s3 · Bão Tố</MenuItem>
        </TextField>
        <TextField label="Số xu" type="number" defaultValue={60000} />
        <TextField label="Ghi chú" multiline minRows={2} placeholder="Lý do nạp tay…" />
      </FormDialog>

      <ConfirmDialog
        open={xoa !== null}
        title="Xoá đơn mua?"
        message={
          <>
            Đơn <b>{xoa?.id}</b> của <b>{xoa?.username}</b> sẽ bị xoá khỏi danh sách. Vật phẩm đã phát
            không thu lại được.
          </>
        }
        danger
        busy={busy}
        onClose={() => setXoa(null)}
        onConfirm={() => {
          setBusy(true);
          window.setTimeout(() => {
            setBusy(false);
            setXoa(null);
            toast.show("Đã xoá đơn.", "success");
          }, 700);
        }}
      />
    </Page>
  );
}

function TrangKhac({ ten }: { ten: string }) {
  return (
    <Page title={ten} sub="Trang mẫu — agent phụ trách app sẽ thay bằng nội dung thật.">
      <Card>
        <CardContent>
          <Typography color="text.secondary">
            Khung <code>Page</code> chỉ lo tiêu đề, đường dẫn phụ và hàng nút; phần thân là của app.
          </Typography>
        </CardContent>
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ vỏ ngoài

function Demo() {
  const [path, setPath] = useState("/don-mua");
  const [dangNhap, setDangNhap] = useState(Q.get("man") === "dang-nhap");
  const [busy, setBusy] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  // Ngăn điều hướng do Shell tự quản; chỉ có đường bấm nút mới mở được. Với `?menu=1` thì
  // bấm hộ để ảnh chụp có ngăn kéo đang mở.
  useEffect(() => {
    if (Q.get("menu") !== "1") return;
    const t = window.setTimeout(
      () => document.querySelector<HTMLElement>('[aria-label="Mở menu"]')?.click(),
      120,
    );
    return () => window.clearTimeout(t);
  }, []);

  if (dangNhap) {
    return (
      <LoginCard
        title="Quản trị nền tảng"
        sub="Tài khoản nhân viên do chủ hệ thống cấp."
        busy={busy}
        error={loi}
        onSubmit={(u) => {
          setBusy(true);
          setLoi(null);
          window.setTimeout(() => {
            setBusy(false);
            if (u === "admin") {
              setDangNhap(false);
              return;
            }
            setLoi("Sai tên đăng nhập hoặc mật khẩu.");
          }, 800);
        }}
        footer={
          <>
            Quên mật khẩu thì nhờ tài khoản <b>chủ</b> đặt lại — không có luồng tự phục hồi.{" "}
            <Link component="button" type="button" onClick={() => setDangNhap(false)}>
              Quay lại bản dựng thử
            </Link>
          </>
        }
      />
    );
  }

  return (
    <Shell
      brand="Quản trị nền tảng"
      nav={NAV}
      user={{ username: "admin", role: "owner" }}
      current={path}
      onNavigate={setPath}
      onLogout={() => setDangNhap(true)}
      banner={
        <Alert severity="warning" square sx={{ borderRadius: 0 }}>
          Tài khoản đang dùng mật khẩu mặc định, ai cũng biết vì nó nằm trong mã nguồn công khai.{" "}
          <Link component="button" type="button" onClick={() => setPath("/tai-khoan")}>
            Đổi ngay →
          </Link>
        </Alert>
      }
    >
      {path === "/don-mua" ? (
        <DonMua />
      ) : (
        <TrangKhac ten={NAV.find((n) => n.href === path)?.label ?? "Tài khoản"} />
      )}
      <Box sx={{ px: 3, pb: 4 }}>
        <Button size="small" color="inherit" onClick={() => setDangNhap(true)}>
          Xem thẻ đăng nhập →
        </Button>
      </Box>
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(
  <AdminApp>
    <Demo />
  </AdminApp>,
);
