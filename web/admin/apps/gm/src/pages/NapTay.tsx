// Nạp tay: đẩy một mục nạp vào game như thể người chơi vừa trả tiền thật.
//
// Đây là thao tác TẠO RA GIÁ TRỊ, không phải sửa dữ liệu. Game chạy trọn vẹn luồng nạp: cộng
// Nguyên Bảo theo mốc, nhân đôi lần đầu, cộng điểm VIP, kích hoạt thẻ tháng và quỹ. Không có
// đường lùi — không có "huỷ đơn" ở phía game. Nên trang này bắt xem trước rồi mới xác nhận,
// dù bản cũ bấm một nhát là gửi.

import { useState } from "react";
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
import { api, canGM, loiConsole, type Me, type MessageResult } from "../api";
import { useChon } from "../chon";
import { ThieuNhanVat } from "./ThieuNhanVat";

export function NapTay({ me }: { me: Me }) {
  const [, go] = useLocation();
  const { show } = useToast();
  const { role } = useChon();
  const duocGhi = canGM(me);

  const [maGoi, setMaGoi] = useState("");
  const [soLan, setSoLan] = useState("1");
  const [ghiChu, setGhiChu] = useState("");
  const [hoi, setHoi] = useState(false);

  const lan = Number(soLan) || 0;
  const hopLe = /^\d+$/.test(maGoi) && Number(maGoi) > 0 && lan >= 1 && lan <= 100;

  const nap = useMutation({
    mutationFn: () =>
      api.post<MessageResult>("/admin-portal/api/pay", {
        srv: role!.srvCode,
        role: role!.roleId,
        account_uid: role!.accountUid,
        role_name: role!.roleName,
        pay_id: Number(maGoi),
        count: lan,
        note: ghiChu.trim(),
      }),
    onSuccess: (d) => {
      show(d.message, "success");
      setHoi(false);
      setMaGoi("");
      setSoLan("1");
      setGhiChu("");
    },
    onError: (e) => {
      const { text, nang } = loiConsole(e);
      show(text, nang ? "error" : "warning");
      setHoi(false);
    },
  });

  if (!role) return <ThieuNhanVat viec="nạp tay" onTra={() => go("/")} />;

  return (
    <Page
      title="Nạp tay"
      sub={`Cho ${role.roleName} · ${role.srvCode} · tài khoản ${role.accountUid}`}
      breadcrumb={[{ label: "Tra nhân vật", href: "/admin-portal/" }, { label: "Nạp tay" }]}
    >
      <Alert severity="warning" sx={{ mb: 2 }}>
        <b>Thao tác này tạo ra giá trị thật trong game.</b> Máy chủ xử lý y như một lần nạp có
        trả tiền: cộng Nguyên Bảo theo mốc, nhân đôi lần đầu, cộng điểm VIP, kích hoạt thẻ và
        quỹ. Game không có đường thu hồi — chỉ nạp khi đã đối chiếu xong phiếu.
      </Alert>

      <Paper
        variant="outlined"
        component="form"
        sx={{ p: 2, maxWidth: 720 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (hopLe && duocGhi) setHoi(true);
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              size="small"
              label="Mã gói"
              value={maGoi}
              onChange={(e) => setMaGoi(e.target.value.replace(/\D/g, ""))}
              placeholder="18001"
              inputMode="numeric"
              autoComplete="off"
              helperText="ID mục nạp, tra ở trang Gói của quản trị nền tảng"
              sx={{ width: { sm: 200 } }}
            />
            <TextField
              size="small"
              label="Số lần"
              value={soLan}
              onChange={(e) => setSoLan(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              error={soLan !== "" && (lan < 1 || lan > 100)}
              helperText="tối đa 100 lần"
              sx={{ width: { sm: 160 } }}
            />
          </Stack>
          <TextField
            size="small"
            label="Ghi chú"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="lý do — đi vào nhật ký và vào ghi chú đơn nạp trong game"
            fullWidth
          />

          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Xem trước
            </Typography>
            {hopLe ? (
              <Typography variant="body2">
                Nạp <b>gói #{maGoi}</b> × <b>{formatInt(lan)}</b> cho <b>{role.roleName}</b> trên{" "}
                <b>{role.srvCode}</b> (tài khoản <code>{role.accountUid}</code>).
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nhập mã gói và số lần từ 1 đến 100 để xem trước.
              </Typography>
            )}
          </Box>

          <Box>
            <Button type="submit" variant="contained" disabled={!hopLe || !duocGhi || nap.isPending}>
              Xem lại rồi nạp
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
        title="Xác nhận nạp tay"
        confirmLabel={`Nạp ×${formatInt(lan)}`}
        busy={nap.isPending}
        onClose={() => setHoi(false)}
        onConfirm={() => nap.mutate()}
        message={
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Nạp <b>gói #{maGoi}</b> × <b>{formatInt(lan)}</b> cho <b>{role.roleName}</b> —{" "}
              {role.srvCode}, tài khoản <code>{role.accountUid}</code>.
            </Typography>
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Game cộng vật phẩm ngay và không thu hồi được. Nhật ký ghi tên tài khoản của bạn.
            </Alert>
            {ghiChu.trim() && (
              <Typography variant="body2" color="text.secondary">
                Ghi chú: {ghiChu.trim()}
              </Typography>
            )}
          </Stack>
        }
      />
    </Page>
  );
}
