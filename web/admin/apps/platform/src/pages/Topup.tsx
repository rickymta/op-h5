import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Money, Page, api, errText, formatInt } from "@op/admin-ui";
import { canWrite, useMe } from "../useMe";

/**
 * Nạp Xu thủ công.
 *
 * Đây là đường duy nhất tạo Xu mà không qua cổng thanh toán, nên lý do là bắt buộc và mọi
 * lần nạp đều vào nhật ký kèm số tiền, người thao tác và tài khoản nhận.
 */
export function Topup() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const [user, setUser] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [xong, setXong] = useState<{ user: string; txn: number; balance: number } | null>(null);

  const nap = useMutation({
    mutationFn: () =>
      api.post<{ txn: number; balance: number }>("/api/wallet/topup", {
        username: user.trim(),
        amount: Number(amount) || 0,
        reason: reason.trim(),
      }),
    onSuccess: (d) => {
      setXong({ user: user.trim(), txn: d.txn, balance: d.balance });
      setUser("");
      setAmount("");
      setReason("");
    },
  });

  const so = Number(amount) || 0;
  const duoc = ghi && user.trim() !== "" && so > 0 && reason.trim() !== "";

  return (
    <Page
      title="Nạp Xu thủ công"
      sub="Đây là đường duy nhất tạo Xu mà không qua cổng thanh toán. Mọi lần nạp đều vào nhật ký kèm số tiền và lý do."
      maxWidth={720}
    >
      {me.data && !ghi && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vai trò <b>{me.data.role}</b> chỉ xem. Nạp tay cần operator trở lên.
        </Alert>
      )}

      {xong && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setXong(null)}>
          <AlertTitle>Đã nạp cho {xong.user}</AlertTitle>
          Số dư mới <Money xu={xong.balance} /> Xu · giao dịch #{xong.txn}.
        </Alert>
      )}
      {nap.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errText(nap.error)}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (duoc) nap.mutate();
            }}
          >
            <Stack spacing={2.5}>
              <TextField
                label="Tài khoản người chơi"
                helperText="Tên đăng nhập ở hệ thống ID, không phải tên nhân vật."
                value={user}
                onChange={(e) => setUser(e.target.value)}
                size="small"
                required
                disabled={!ghi}
                slotProps={{ htmlInput: { autoCapitalize: "none", spellCheck: false, autoComplete: "off" } }}
              />
              <TextField
                label="Số Xu"
                helperText={so > 0 ? `${formatInt(so)} Xu` : "Phải lớn hơn 0."}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                size="small"
                required
                disabled={!ghi}
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
              />
              <TextField
                label="Lý do"
                helperText="Bắt buộc, sẽ vào nhật ký."
                placeholder="ví dụ: đền bù sự cố mất kết nối 04/09"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                size="small"
                required
                multiline
                minRows={2}
                disabled={!ghi}
              />
              <Box>
                <Button type="submit" variant="contained" disabled={!duoc || nap.isPending}>
                  {nap.isPending ? "Đang nạp…" : "Nạp"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Bấm hai lần trong cùng một giây không cộng hai lần (khoá theo người thao tác và thời
        điểm); cố ý nạp lại vào giây sau thì vẫn được.
      </Typography>
    </Page>
  );
}
