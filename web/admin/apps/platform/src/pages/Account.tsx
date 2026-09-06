import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Page, StatusChip, api, errText, useToast } from "@op/admin-ui";
import { useMe } from "../useMe";

const TOI_THIEU = 10;

/** Tài khoản của chính người đang đăng nhập: xem thông tin và đổi mật khẩu. */
export function Account() {
  const me = useMe();
  const qc = useQueryClient();
  const { show } = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");

  const doi = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/api/me/password", { current: cur, new: next }),
    onSuccess: () => {
      show("Đã đổi mật khẩu. Các phiên khác của bạn đã bị cắt.");
      setCur("");
      setNext("");
      setAgain("");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const khop = next.length >= TOI_THIEU && next === again;

  return (
    <Page
      title="Tài khoản của tôi"
      sub={me.data ? `${me.data.username}${me.data.email ? " · " + me.data.email : ""}` : "Đang tải…"}
      maxWidth={720}
      actions={me.data ? <StatusChip value={me.data.role} /> : undefined}
    >
      {me.data?.must_change_password && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Tài khoản này vẫn dùng mật khẩu mặc định. Mật khẩu đó nằm trong mã nguồn của một kho
          công khai, nghĩa là ai cũng biết. Hãy đổi ngay bên dưới.
        </Alert>
      )}
      {doi.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errText(doi.error)}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Đổi mật khẩu
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Tối thiểu {TOI_THIEU} ký tự. Đổi xong, mọi phiên khác của bạn bị cắt, phiên này giữ nguyên.
          </Typography>

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (khop && cur) doi.mutate();
            }}
          >
            <Stack spacing={2.5} sx={{ maxWidth: 420 }}>
              <TextField
                label="Mật khẩu hiện tại"
                type="password"
                value={cur}
                onChange={(e) => setCur(e.target.value)}
                size="small"
                required
                slotProps={{ htmlInput: { autoComplete: "current-password" } }}
              />
              <TextField
                label="Mật khẩu mới"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                size="small"
                required
                error={next.length > 0 && next.length < TOI_THIEU}
                helperText={next.length > 0 && next.length < TOI_THIEU ? `Cần ít nhất ${TOI_THIEU} ký tự.` : " "}
                slotProps={{ htmlInput: { autoComplete: "new-password" } }}
              />
              <TextField
                label="Nhập lại mật khẩu mới"
                type="password"
                value={again}
                onChange={(e) => setAgain(e.target.value)}
                size="small"
                required
                error={again.length > 0 && next !== again}
                helperText={again.length > 0 && next !== again ? "Chưa khớp." : " "}
                slotProps={{ htmlInput: { autoComplete: "new-password" } }}
              />
              <Box>
                <Button type="submit" variant="contained" disabled={doi.isPending || !khop || !cur}>
                  {doi.isPending ? "Đang đổi…" : "Đổi mật khẩu"}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Page>
  );
}
