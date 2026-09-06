// Nạp tay: đẩy một mục nạp vào game như thể người chơi vừa trả tiền thật.
//
// Đây là thao tác TẠO RA GIÁ TRỊ, không phải sửa dữ liệu. Game chạy trọn vẹn luồng nạp: cộng
// Nguyên Bảo theo mốc, nhân đôi lần đầu, cộng điểm VIP, kích hoạt thẻ tháng và quỹ. Không có
// đường lùi — không có "huỷ đơn" ở phía game. Nên trang này bắt xem trước rồi mới xác nhận,
// dù bản cũ bấm một nhát là gửi.
//
// Gói chọn bằng ô tìm, đọc từ bảng `game_packages` của chính hệ thống. Bản trước bắt gõ tay
// mã gói kèm câu "tra ở trang Gói của quản trị nền tảng" — tức là mở một trang khác, tìm, rồi
// chép số sang. Danh sách còn hiện cả gói đang ẩn trên web, vì ẩn là quyết định bán hàng cho
// người chơi tự mua, không phải lệnh cấm phát tay khi có phiếu hỗ trợ.

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ConfirmDialog, Page, formatInt, useToast } from "@op/admin-ui";
import { api, canGM, loiConsole, type GoiNap, type Me, type MessageResult } from "../api";
import { useChon } from "../chon";
import { ThieuNhanVat } from "./ThieuNhanVat";

function useTre<T>(v: T, ms = 250): T {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return x;
}

export function NapTay({ me }: { me: Me }) {
  const [, go] = useLocation();
  const { show } = useToast();
  const { role } = useChon();
  const duocGhi = canGM(me);

  const [goi, setGoi] = useState<GoiNap | null>(null);
  const [tuKhoa, setTuKhoa] = useState("");
  const [soLan, setSoLan] = useState("1");
  const [ghiChu, setGhiChu] = useState("");
  const [hoi, setHoi] = useState(false);
  const tre = useTre(tuKhoa);

  // Tải sẵn một trang gói lúc mở, để bấm vào ô là có danh sách ngay — người trực thường
  // không nhớ tên gói, chỉ nhận ra khi nhìn thấy.
  const dsGoi = useQuery({
    queryKey: ["gm-packages", tre],
    queryFn: () => api.get<{ goi: GoiNap[] }>(`/admin-portal/api/packages?q=${encodeURIComponent(tre)}`),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const lan = Number(soLan) || 0;
  const hopLe = !!goi && lan >= 1 && lan <= 100;

  const nap = useMutation({
    mutationFn: () =>
      api.post<MessageResult>("/admin-portal/api/pay", {
        srv: role!.srvCode,
        role: role!.roleId,
        account_uid: role!.accountUid,
        role_name: role!.roleName,
        pay_id: Number(goi!.ma),
        count: lan,
        note: ghiChu.trim(),
      }),
    onSuccess: (d) => {
      show(d.message, "success");
      setHoi(false);
      setGoi(null);
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
        sx={{ p: 2, maxWidth: 760 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (hopLe && duocGhi) setHoi(true);
        }}
      >
        <Stack spacing={2}>
          <Autocomplete<GoiNap>
            options={dsGoi.data?.goi ?? []}
            filterOptions={(x) => x} // máy chủ đã lọc; lọc lại ở đây sẽ giấu mất kết quả
            getOptionLabel={(o) => `${o.ten} · mã ${o.ma}`}
            isOptionEqualToValue={(a, b) => a.ma === b.ma}
            value={goi}
            onChange={(_, v) => setGoi(v)}
            inputValue={goi ? `${goi.ten} · mã ${goi.ma}` : tuKhoa}
            onInputChange={(_, v, ly) => {
              if (ly === "input") {
                setTuKhoa(v);
                if (goi) setGoi(null);
              }
            }}
            loading={dsGoi.isFetching}
            noOptionsText="Không có gói nào tên hoặc mã như vậy."
            renderOption={(props, o) => {
              const { key, ...rest } = props as { key?: string } & Record<string, unknown>;
              return (
                <Box component="li" key={o.ma} {...rest} sx={{ display: "block !important", py: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                      {o.ten}
                    </Typography>
                    {o.an_tren_web && <Chip size="small" label="ẩn trên web" variant="outlined" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    mã <span style={{ fontFamily: "ui-monospace, monospace" }}>{o.ma}</span> ·{" "}
                    {formatInt(o.gia_xu)} xu · {o.nhom}
                  </Typography>
                </Box>
              );
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                size="small"
                label="Gói nạp"
                placeholder="gõ tên gói hoặc mã — ví dụ: nạp 50K, 18003"
                helperText="Danh sách lấy từ bảng gói của hệ thống, gồm cả gói đang ẩn trên web."
                slotProps={{
                  input: {
                    ...p.InputProps,
                    endAdornment: (
                      <>
                        {dsGoi.isFetching ? <CircularProgress size={16} /> : null}
                        {p.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
            <TextField
              size="small"
              label="Ghi chú"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="lý do — đi vào nhật ký và vào ghi chú đơn nạp trong game"
              fullWidth
            />
          </Stack>

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
            {hopLe && goi ? (
              <Typography variant="body2">
                Nạp <b>{goi.ten}</b> (mã <code>{goi.ma}</code>, {formatInt(goi.gia_xu)} xu) ×{" "}
                <b>{formatInt(lan)}</b> cho <b>{role.roleName}</b> trên <b>{role.srvCode}</b> (tài
                khoản <code>{role.accountUid}</code>).
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Chọn gói và nhập số lần từ 1 đến 100 để xem trước.
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
              Nạp <b>{goi?.ten}</b> (mã <code>{goi?.ma}</code>) × <b>{formatInt(lan)}</b> cho{" "}
              <b>{role.roleName}</b> — {role.srvCode}, tài khoản <code>{role.accountUid}</code>.
            </Typography>
            {goi?.an_tren_web && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Gói này đang ẩn trên web — người chơi không tự mua được, chỉ nhận qua nạp tay.
              </Alert>
            )}
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
