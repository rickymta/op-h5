// Gửi thư kèm quà cho MỘT nhân vật.
//
// Cố ý không có "gửi toàn máy chủ" ở đây, y như phía Go: gửi nhầm một người thì thu hồi được
// bằng tay, gửi nhầm cả máy chủ thì không.
//
// Quà là chuỗi `type:id:count` nối bằng `#` — thứ người trực chép từ bảng cấu hình, rất dễ
// lệch một dấu hai chấm. Nên trang tách chuỗi ra thành từng dòng ĐỌC ĐƯỢC trước khi gửi:
// nhìn "Nguyên Bảo × 5.000" thì phát hiện thừa một số 0 ngay, nhìn `0:1:50000` thì không.

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
import { api, canGM, loiConsole, type BagKind, type Me, type MessageResult } from "../api";
import { useChon } from "../chon";
import { docReward, rewardHopLe } from "../reward";
import { ThieuNhanVat } from "./ThieuNhanVat";

const MAU = "0:1:5000#3:100022:10";

function XemQua({ reward, bags }: { reward: string; bags: BagKind[] }) {
  const mon = docReward(reward, bags);
  if (mon.length === 0) return null;
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5, display: "grid", gap: 0.5 }}>
      {mon.map((m, i) => (
        <Box component="li" key={`${m.raw}-${i}`}>
          <Typography variant="body2" component="span">
            <b>{m.label}</b> × {formatInt(m.count)}
          </Typography>
          {m.mo && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (<code>{m.raw}</code> — tên món tra ở bảng cấu hình)
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function GuiThu({ me, bags }: { me: Me; bags: BagKind[] }) {
  const [, go] = useLocation();
  const { show } = useToast();
  const { role } = useChon();
  const duocGhi = canGM(me);

  const [tieuDe, setTieuDe] = useState("Thư từ quản trị");
  const [noiDung, setNoiDung] = useState("");
  const [qua, setQua] = useState("");
  const [hoi, setHoi] = useState(false);

  const quaOK = rewardHopLe(qua);
  const hopLe = quaOK && tieuDe.trim().length <= 120 && noiDung.length <= 1000;

  const gui = useMutation({
    mutationFn: () =>
      api.post<MessageResult>("/admin-portal/api/mail", {
        srv: role!.srvCode,
        role: role!.roleId,
        role_name: role!.roleName,
        title: tieuDe.trim(),
        content: noiDung,
        reward: qua.trim(),
      }),
    onSuccess: (d) => {
      show(d.message, "success");
      setHoi(false);
      setQua("");
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
        sx={{ p: 2, maxWidth: 720 }}
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
          <TextField
            size="small"
            label="Quà"
            value={qua}
            onChange={(e) => setQua(e.target.value)}
            placeholder={MAU}
            error={qua.trim() !== "" && !quaOK}
            helperText={
              qua.trim() !== "" && !quaOK
                ? "Sai định dạng. Phải là type:id:count, nhiều món nối bằng #."
                : "0:1:N Nguyên Bảo · 0:0:N Kim tệ · 0:4:N EXP anh hùng · 3:id:N vật phẩm"
            }
            slotProps={{ input: { sx: { fontFamily: "ui-monospace, monospace" } } }}
            fullWidth
          />

          <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "action.hover", border: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Xem trước phần quà
            </Typography>
            {quaOK ? (
              <XemQua reward={qua} bags={bags} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nhập chuỗi quà đúng định dạng để xem nó thành cái gì trong game.
              </Typography>
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
              Gửi cho <b>{role.roleName}</b> — {role.srvCode}. Tiêu đề: <b>{tieuDe.trim() || "Thư từ quản trị"}</b>
            </Typography>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Quà đính kèm
              </Typography>
              <XemQua reward={qua} bags={bags} />
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
