// Gửi thư kèm quà cho MỘT nhân vật.
//
// Cố ý không có "gửi toàn máy chủ" ở đây, y như phía Go: gửi nhầm một người thì thu hồi được
// bằng tay, gửi nhầm cả máy chủ thì không.
//
// Phần quà chọn bằng ô tìm (ChonQua) thay vì gõ chuỗi `type:id:count`. Danh mục do máy chủ
// phát ra từ chính bảng cấu hình game đang chạy, nên tên ở đây đúng thứ người chơi thấy —
// khác với bảng tra của bản PHP cũ, vốn là của một bản game khác.

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ConfirmDialog, Page, formatInt, useToast } from "@op/admin-ui";
import { api, canGM, loiConsole, type Me, type MessageResult, type NhomQua } from "../api";
import { useChon } from "../chon";
import { ChonQua, ghepQua, type DongQua } from "../ChonQua";
import { ThieuNhanVat } from "./ThieuNhanVat";

function XemQua({ dong }: { dong: DongQua[] }) {
  if (dong.length === 0) return null;
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5, display: "grid", gap: 0.5 }}>
      {dong.map((d) => (
        <Box component="li" key={`${d.loai}:${d.ma}`}>
          <Typography variant="body2" component="span">
            <b>{d.ten || `Chưa tra được tên · mã ${d.loai}:${d.ma}`}</b> × {formatInt(d.soLuong)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {d.nhan}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function GuiThu({ me, nhomQua }: { me: Me; nhomQua: NhomQua[] }) {
  const [, go] = useLocation();
  const { show } = useToast();
  const { role } = useChon();
  const duocGhi = canGM(me);

  const [tieuDe, setTieuDe] = useState("Thư từ quản trị");
  const [noiDung, setNoiDung] = useState("");
  const [dong, setDong] = useState<DongQua[]>([]);
  const [hoi, setHoi] = useState(false);

  const qua = useMemo(() => ghepQua(dong), [dong]);
  const thieuSo = dong.some((d) => d.soLuong <= 0);
  const hopLe = qua !== "" && !thieuSo && tieuDe.trim().length <= 120 && noiDung.length <= 1000;

  const gui = useMutation({
    mutationFn: () =>
      api.post<MessageResult>("/admin-portal/api/mail", {
        srv: role!.srvCode,
        role: role!.roleId,
        role_name: role!.roleName,
        title: tieuDe.trim(),
        content: noiDung,
        reward: qua,
      }),
    onSuccess: (d) => {
      show(d.message, "success");
      setHoi(false);
      setDong([]);
      setNoiDung("");
    },
    onError: (e) => {
      const { text, nang } = loiConsole(e);
      show(text, nang ? "error" : "warning");
      setHoi(false);
    },
  });

  if (!role) return <ThieuNhanVat viec="gửi thư" onTra={() => go("/")} />;

  return (
    <Page
      title="Gửi thư kèm quà"
      sub={`Cho ${role.roleName} · ${role.srvCode}`}
      breadcrumb={[{ label: "Tra nhân vật", href: "/admin-portal/" }, { label: "Gửi thư kèm quà" }]}
    >
      <Alert severity="warning" sx={{ mb: 2 }}>
        <b>Quà trong thư là giá trị thật trong game.</b> Thư gửi đi rồi thì phải nhờ người chơi
        không nhận mới thu hồi được. Chỉ gửi cho một nhân vật — không có đường gửi cả máy chủ ở
        công cụ này.
      </Alert>

      <Paper
        variant="outlined"
        component="form"
        sx={{ p: 2, maxWidth: 760 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (hopLe && duocGhi) setHoi(true);
        }}
      >
        <Stack spacing={2}>
          <TextField
            size="small"
            label="Tiêu đề"
            value={tieuDe}
            onChange={(e) => setTieuDe(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            fullWidth
          />
          <TextField
            size="small"
            label="Nội dung"
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            multiline
            rows={3}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            helperText={`${noiDung.length}/1000`}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Quà đính kèm
            </Typography>
            <ChonQua nhom={nhomQua} dong={dong} datDong={setDong} />
            {thieuSo && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Có món đang để số lượng 0 — điền số hoặc bỏ món đó ra.
              </Alert>
            )}
          </Box>

          <Box>
            <Button type="submit" variant="contained" disabled={!hopLe || !duocGhi || gui.isPending}>
              Xem lại rồi gửi
            </Button>
            {!duocGhi && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                Vai trò của bạn chỉ được xem.
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={hoi}
        danger
        title="Xác nhận gửi thư"
        confirmLabel="Gửi thư"
        busy={gui.isPending}
        onClose={() => setHoi(false)}
        onConfirm={() => gui.mutate()}
        message={
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Gửi cho <b>{role.roleName}</b> — {role.srvCode}. Tiêu đề:{" "}
              <b>{tieuDe.trim() || "Thư từ quản trị"}</b>
            </Typography>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Quà đính kèm
              </Typography>
              <XemQua dong={dong} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75, fontFamily: "ui-monospace, monospace" }}
              >
                {qua}
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Thư vào hòm thư của người chơi ngay. Nhật ký ghi tên tài khoản của bạn.
            </Alert>
          </Stack>
        }
      />
    </Page>
  );
}
