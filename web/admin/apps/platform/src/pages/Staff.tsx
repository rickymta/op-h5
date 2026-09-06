import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import {
  ConfirmDialog,
  FormDialog,
  Grid,
  Page,
  StatusChip,
  api,
  errText,
  useToast,
} from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams } from "@op/admin-ui";
import type { Role, Staff as StaffRow } from "../api";
import { Loi } from "../bits";

const MO_TA_VAI_TRO: Record<string, string> = {
  viewer: "chỉ xem",
  gm: "thao tác trên nhân vật trong game",
  operator: "sửa cấu hình nền tảng",
  owner: "toàn quyền, kể cả quản lý nhân viên",
};

/** Quản lý nhân viên. Chỉ owner vào được; API cũng chặn lần nữa ở phía Go. */
export function Staff() {
  const qc = useQueryClient();
  const { show } = useToast();
  const [them, setThem] = useState(false);
  const [datLai, setDatLai] = useState<StaffRow | null>(null);
  const [doiKhoa, setDoiKhoa] = useState<StaffRow | null>(null);
  // Mật khẩu chỉ hiện MỘT lần sau khi tạo hoặc đặt lại; không có chỗ nào đọc lại được.
  const [motLan, setMotLan] = useState<{ user: string; pass: string } | null>(null);

  const q = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ staff: StaffRow[]; roles: string[] }>("/api/staff"),
  });
  const staff = q.data?.staff ?? [];
  const roles = q.data?.roles ?? ["viewer", "gm", "operator", "owner"];

  const xong = (msg: string) => {
    show(msg);
    void qc.invalidateQueries({ queryKey: ["staff"] });
  };

  const sua = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.post<{ ok: boolean }>(`/api/staff/${id}`, body),
    onSuccess: () => {
      setDoiKhoa(null);
      xong("Đã lưu");
    },
    onError: (e: Error) => show(errText(e), "error"),
  });

  const dat = useMutation({
    mutationFn: (u: StaffRow) => api.post<{ password: string }>(`/api/staff/${u.id}/password`, {}),
    onSuccess: (d, u) => {
      setMotLan({ user: u.username, pass: d.password });
      setDatLai(null);
      xong("Đã đặt lại mật khẩu");
    },
    onError: (e: Error) => show(errText(e), "error"),
  });

  const cot: AdminColDef[] = [
    { field: "id", headerName: "#", width: 60, align: "right", headerAlign: "right" },
    { field: "username", headerName: "Tên đăng nhập", minWidth: 130, flex: 1 },
    {
      field: "role",
      headerName: "Vai trò",
      width: 140,
      renderCell: (p: GridRenderCellParams) => {
        const u = p.row as StaffRow;
        return (
          <Select
            value={u.role}
            size="small"
            variant="standard"
            disableUnderline
            disabled={sua.isPending}
            onChange={(e) => sua.mutate({ id: u.id, body: { role: e.target.value } })}
            sx={{ fontSize: "0.8125rem", "& .MuiSelect-select": { py: 0.5 } }}
          >
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        );
      },
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 110,
      renderCell: (p: GridRenderCellParams) => (
        <StatusChip
          value={(p.row as StaffRow).status}
          map={{ active: { label: "Đang dùng", color: "success" }, disabled: { label: "Đã khoá", color: "error" } }}
        />
      ),
    },
    {
      field: "last_login_at",
      headerName: "Đăng nhập gần nhất",
      width: 178,
      hideBelow: "lg",
      valueGetter: (_v, r: StaffRow) => r.last_login_at || "chưa",
    },
    { field: "created_at", headerName: "Tạo", width: 140, hideBelow: "xl" },
    {
      field: "act",
      headerName: "",
      width: 186,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const u = p.row as StaffRow;
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" disabled={dat.isPending} onClick={() => setDatLai(u)}>
              Đặt lại mật khẩu
            </Button>
            <Button
              size="small"
              color={u.status === "active" ? "error" : "primary"}
              disabled={sua.isPending}
              onClick={() => setDoiKhoa(u)}
            >
              {u.status === "active" ? "Khoá" : "Mở"}
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Page
      title="Nhân viên"
      sub="Mọi thay đổi ở đây vào nhật ký. Khoá tài khoản hoặc đổi mật khẩu sẽ cắt luôn phiên đang mở của người đó."
      maxWidth={false}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setThem(true)}>
          Thêm nhân viên
        </Button>
      }
    >
      {motLan && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMotLan(null)}>
          <AlertTitle>
            Mật khẩu của <b>{motLan.user}</b>
          </AlertTitle>
          <Box
            component="code"
            sx={{ fontSize: "1.05rem", letterSpacing: ".04em", userSelect: "all", wordBreak: "break-all" }}
          >
            {motLan.pass}
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Chỉ hiện một lần. Gửi cho người đó qua kênh riêng rồi đóng dải này.
          </Typography>
        </Alert>
      )}
      <Loi e={q.error} />

      <Grid
        columns={cot}
        rows={staff}
        rowId={(u) => u.id}
        loading={q.isLoading}
        empty="Chưa có tài khoản nào."
        pageSize={25}
        density="standard"
      />

      <Card sx={{ mt: 2, maxWidth: 560 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Vai trò
          </Typography>
          {roles.map((r) => (
            <Typography key={r} variant="body2" color="text.secondary">
              <code>{r}</code> — {MO_TA_VAI_TRO[r] ?? ""}
            </Typography>
          ))}
        </CardContent>
      </Card>

      {them && (
        <ThemNhanVien
          roles={roles}
          onClose={() => setThem(false)}
          onDone={(user, pass) => {
            setMotLan({ user, pass });
            setThem(false);
            xong("Đã tạo tài khoản");
          }}
        />
      )}
      {datLai && (
        <ConfirmDialog
          open
          danger
          title={`Đặt lại mật khẩu cho ${datLai.username}?`}
          message="Phiên đang mở của họ sẽ bị cắt. Mật khẩu mới hiện đúng một lần trên màn hình này."
          confirmLabel="Đặt lại"
          busy={dat.isPending}
          onClose={() => setDatLai(null)}
          onConfirm={() => dat.mutate(datLai)}
        />
      )}
      {doiKhoa && (
        <ConfirmDialog
          open
          danger={doiKhoa.status === "active"}
          title={`${doiKhoa.status === "active" ? "Khoá" : "Mở"} tài khoản ${doiKhoa.username}?`}
          message={
            doiKhoa.status === "active"
              ? "Người này không đăng nhập được nữa và phiên đang mở bị cắt ngay."
              : "Người này đăng nhập lại được bằng mật khẩu cũ."
          }
          confirmLabel={doiKhoa.status === "active" ? "Khoá" : "Mở"}
          busy={sua.isPending}
          onClose={() => setDoiKhoa(null)}
          onConfirm={() =>
            sua.mutate({
              id: doiKhoa.id,
              body: { status: doiKhoa.status === "active" ? "disabled" : "active" },
            })
          }
        />
      )}
    </Page>
  );
}

function ThemNhanVien({
  roles,
  onClose,
  onDone,
}: {
  roles: string[];
  onClose: () => void;
  onDone: (user: string, pass: string) => void;
}) {
  const [user, setUser] = useState("");
  const [role, setRole] = useState<Role | string>("gm");

  const tao = useMutation({
    mutationFn: () => api.post<{ password: string }>("/api/staff", { username: user.trim(), role }),
    onSuccess: (d) => onDone(user.trim(), d.password),
  });

  return (
    <FormDialog
      open
      title="Thêm nhân viên"
      submitLabel="Tạo"
      onClose={onClose}
      onSubmit={() => user.trim() && tao.mutate()}
      busy={tao.isPending}
      error={tao.error ? errText(tao.error) : null}
    >
      <Typography variant="body2" color="text.secondary">
        Mật khẩu do hệ thống sinh và hiện một lần. Người tạo không đặt mật khẩu hộ.
      </Typography>
      <TextField
        label="Tên đăng nhập"
        placeholder="vd: an.nguyen"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        size="small"
        autoFocus
        required
        slotProps={{ htmlInput: { autoComplete: "off" } }}
      />
      <TextField select label="Vai trò" value={role} onChange={(e) => setRole(e.target.value)} size="small">
        {roles.map((r) => (
          <MenuItem key={r} value={r}>
            {r} — {MO_TA_VAI_TRO[r] ?? ""}
          </MenuItem>
        ))}
      </TextField>
    </FormDialog>
  );
}
