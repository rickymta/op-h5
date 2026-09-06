// Bảng thư đã gửi, đặt ngay cạnh biểu mẫu gửi thư.
//
// Câu hỏi thật của ca trực trước khi gửi đền bù: "người này ĐÃ nhận chưa, ai gửi, gửi gì?"
// Trả lời được ngay tại chỗ thì không có thư gửi trùng. Và mỗi dòng có "Dùng lại": thư đền
// bù cho nhóm hôm nay thường giống hệt thư hôm qua, chỉ khác người nhận.
//
// Đọc từ nhật ký quản trị chứ không từ bảng thư của game: nhật ký có cả lần THẤT BẠI và tên
// người bấm — đúng thứ cần để quyết định có gửi lại không.

import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ReplayIcon from "@mui/icons-material/Replay";
import { formatDate, timeAgo } from "@op/admin-ui";
import { useState } from "react";
import { api, type ThuDaGui } from "./api";

export function LichSuThu({
  srv,
  role,
  roleName,
  onDungLai,
}: {
  srv: string;
  /** roleId của người nhận đầu tiên; rỗng thì chỉ có tab "Gần đây". */
  role: string;
  roleName: string;
  onDungLai: (t: ThuDaGui) => void;
}) {
  const [tab, setTab] = useState<"nhan_vat" | "gan_day">(role ? "nhan_vat" : "gan_day");
  const theoNhanVat = tab === "nhan_vat" && !!role;

  const q = useQuery({
    queryKey: ["gm-mail-history", theoNhanVat ? srv : "", theoNhanVat ? role : "", 15],
    queryFn: () =>
      api.get<{ thu: ThuDaGui[] }>(
        theoNhanVat
          ? `/admin-portal/api/mail/history?srv=${encodeURIComponent(srv)}&role=${encodeURIComponent(role)}&limit=15`
          : `/admin-portal/api/mail/history?limit=15`,
      ),
    retry: false,
    staleTime: 30_000,
  });
  const thu = q.data?.thu ?? [];

  return (
    <Paper variant="outlined" sx={{ display: "flex", flexDirection: "column", minHeight: 240 }}>
      <Tabs
        value={role ? tab : "gan_day"}
        onChange={(_, v: "nhan_vat" | "gan_day") => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", px: 1, minHeight: 44 }}
      >
        <Tab value="nhan_vat" label={roleName ? `Đã gửi cho ${roleName}` : "Nhân vật này"} disabled={!role} sx={{ minHeight: 44 }} />
        <Tab value="gan_day" label="Gần đây" sx={{ minHeight: 44 }} />
      </Tabs>
      <Box sx={{ flexGrow: 1 }}>
        {q.isPending && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Đang đọc nhật ký…
          </Typography>
        )}
        {q.isError && (
          <Typography variant="body2" color="error" sx={{ p: 2 }}>
            Không đọc được lịch sử thư.
          </Typography>
        )}
        {q.isSuccess && thu.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {theoNhanVat ? `Chưa có thư nào gửi cho ${roleName} qua công cụ này.` : "Chưa có thư nào."}
          </Typography>
        )}
        {thu.map((t) => (
          <Stack
            key={t.id}
            direction="row"
            spacing={1}
            sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider", alignItems: "flex-start" }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {t.title || "(không tiêu đề)"}
                </Typography>
                {t.ok ? (
                  <Chip size="small" label={t.mail_id ? `phiếu #${t.mail_id}` : "đã gửi"} color="success" variant="outlined" />
                ) : (
                  <Tooltip title={t.loi ?? ""}>
                    <Chip size="small" label="thất bại" color="error" variant="outlined" />
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {!theoNhanVat && (t.role_name || t.role) ? `${t.role_name || t.role} · ` : ""}
                <Tooltip title={formatDate(t.luc)}>
                  <span>{timeAgo(t.luc)}</span>
                </Tooltip>
                {" · "}
                {t.nguoi || "?"}
              </Typography>
              {t.qua_ten && (
                <Typography variant="caption" sx={{ display: "block" }} noWrap title={t.qua_ten}>
                  {t.qua_ten}
                </Typography>
              )}
            </Box>
            <Tooltip title="Điền lại tiêu đề, nội dung và quà của thư này vào biểu mẫu">
              <span>
                <Button size="small" startIcon={<ReplayIcon />} onClick={() => onDungLai(t)} disabled={!t.reward}>
                  Dùng lại
                </Button>
              </span>
            </Tooltip>
          </Stack>
        ))}
      </Box>
    </Paper>
  );
}
