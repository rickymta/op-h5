// Trang một nhân vật: thông tin cơ bản, rồi kho đồ theo từng loại (bagType).
//
// CƠ CHẾ AN TOÀN GIỮ NGUYÊN TỪ BẢN CŨ
// -----------------------------------
// Xoá kho đồ gửi kèm `expect` — đúng số ô mà người trực VỪA NHÌN THẤY. Máy chủ đọc lại kho
// đồ, lệch một ô là dừng và bắt xem lại. Giữa lúc người trực đọc bảng và lúc bấm nút, người
// chơi vẫn đang chơi: một món vừa rơi vào túi mà bị xoá theo là thứ không lấy lại được.
// Ở đây thêm một lớp nữa mà bản cũ chỉ làm bằng `window.confirm`: hộp xác nhận nói rõ xoá
// bao nhiêu ô của loại nào, của ai — và một ô lý do đi thẳng vào nhật ký.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ConfirmDialog, Grid, Page, formatInt, useToast, type AdminColDef } from "@op/admin-ui";
import { api, canGM, loiConsole, type BagKind, type BagSlot, type ClearResult, type Me } from "../api";
import { useChon } from "../chon";

const cotO: AdminColDef[] = [
  {
    field: "id",
    headerName: "Ô",
    width: 130,
    sortable: false,
    renderCell: (p) => (
      <span style={{ fontFamily: "ui-monospace, monospace" }}>{(p.row as BagSlot).id}</span>
    ),
  },
  {
    field: "tid",
    headerName: "Mã",
    width: 110,
    align: "right",
    headerAlign: "right",
    sortable: false,
  },
  { field: "name", headerName: "Tên", flex: 1, minWidth: 180, sortable: false },
  {
    field: "num",
    headerName: "Số lượng",
    width: 120,
    align: "right",
    headerAlign: "right",
    sortable: false,
    valueFormatter: (v: number) => formatInt(v),
  },
];

function O({ nhan, gia, mono }: { nhan: string; gia: string; mono?: boolean }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {nhan}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, fontFamily: mono ? "ui-monospace, monospace" : undefined, wordBreak: "break-all" }}
      >
        {gia}
      </Typography>
    </Box>
  );
}

export function TrangNhanVat({ me, bags }: { me: Me; bags: BagKind[] }) {
  const [, go] = useLocation();
  const { show } = useToast();
  const qc = useQueryClient();
  const { role } = useChon();
  const duocGhi = canGM(me);

  const [loai, setLoai] = useState<number | null>(null);
  const [hoi, setHoi] = useState(false);
  const [lyDo, setLyDo] = useState("");

  const type = loai ?? bags[0]?.type ?? 3;
  const kind = bags.find((b) => b.type === type);

  const key = ["gm-bag", role?.srvCode, role?.roleId, type];
  const kho = useQuery({
    queryKey: key,
    queryFn: () =>
      api.get<{ slots: BagSlot[] }>(
        `/admin-portal/api/bag?srv=${encodeURIComponent(role!.srvCode)}&role=${encodeURIComponent(role!.roleId)}&type=${type}`,
      ),
    enabled: !!role,
    retry: false,
  });

  const slots = kho.data?.slots ?? [];

  const xoa = useMutation({
    mutationFn: (expect: number) =>
      api.post<ClearResult>("/admin-portal/api/bag/clear", {
        srv: role!.srvCode,
        role: role!.roleId,
        type,
        expect,
        note: lyDo.trim(),
      }),
    onSuccess: (d) => {
      show(d.message, d.failed > 0 ? "warning" : "success");
      setHoi(false);
      setLyDo("");
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => {
      const { text, nang } = loiConsole(e);
      show(text, nang ? "error" : "warning");
      setHoi(false);
      // Máy chủ báo kho đồ vừa đổi thì bảng đang hiện đã cũ — đọc lại ngay để lần bấm sau
      // so đúng con số mới.
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  useEffect(() => {
    if (kho.isError) {
      const { text, nang } = loiConsole(kho.error);
      show(text, nang ? "error" : "warning");
    }
  }, [kho.isError, kho.error, show]);

  if (!role) {
    return (
      <Page title="Nhân vật" sub="Chưa chọn ai.">
        <Alert severity="info" action={<Button onClick={() => go("/")}>Tra nhân vật</Button>}>
          Tìm nhân vật trước rồi mở từ bảng kết quả — công cụ chỉ thao tác trên nhân vật đã chọn.
        </Alert>
      </Page>
    );
  }

  return (
    <Page
      title={role.roleName}
      sub={`Máy chủ ${role.srvCode} · cấp ${role.level} · VIP ${role.vipLevel} · lực chiến ${formatInt(role.power)}`}
      breadcrumb={[{ label: "Tra nhân vật", href: "/admin-portal/" }, { label: role.roleName }]}
      actions={
        <>
          <Button
            variant="outlined"
            startIcon={<PaidOutlinedIcon />}
            disabled={!duocGhi}
            onClick={() => go("/nap-tay")}
          >
            Nạp tay
          </Button>
          <Button
            variant="outlined"
            startIcon={<MailOutlineIcon />}
            disabled={!duocGhi}
            onClick={() => go("/gui-thu")}
          >
            Gửi thư
          </Button>
        </>
      }
    >
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" },
          }}
        >
          <O nhan="Mã nhân vật" gia={role.roleId} mono />
          <O nhan="Mã tài khoản" gia={role.accountUid} mono />
          <O nhan="Nền tảng" gia={role.platformCode || "—"} mono />
          <O nhan="Máy chủ" gia={role.srvCode} mono />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={type}
          onChange={(_, v: number) => setLoai(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
        >
          {bags.map((b) => (
            <Tab key={b.type} value={b.type} label={b.label} sx={{ minHeight: 48 }} />
          ))}
        </Tabs>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ p: 2, alignItems: { sm: "center" }, flexWrap: "wrap" }}
        >
          <Chip
            size="small"
            label={kho.isFetching ? "đang đọc…" : `${formatInt(slots.length)} ô`}
            color={slots.length > 0 ? "primary" : "default"}
            variant="outlined"
          />
          {kind?.note && (
            <Typography variant="caption" color="warning.main">
              {kind.note}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void qc.invalidateQueries({ queryKey: key })}
            disabled={kho.isFetching}
          >
            Đọc lại
          </Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            startIcon={<DeleteSweepIcon />}
            disabled={!duocGhi || xoa.isPending || kho.isFetching || slots.length === 0}
            onClick={() => setHoi(true)}
          >
            Xoá tất cả ({formatInt(slots.length)})
          </Button>
        </Stack>

        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Xoá theo từng ô, không theo mã vật phẩm. Không lùi lại được.
          </Typography>
          <Grid<BagSlot>
            columns={cotO}
            rows={slots}
            rowId={(s) => s.id}
            loading={kho.isFetching}
            empty="Kho đồ loại này đang trống."
          />
        </Box>
      </Paper>

      <ConfirmDialog
        open={hoi}
        danger
        title={`Xoá toàn bộ "${kind?.label ?? type}"?`}
        confirmLabel={`Xoá ${formatInt(slots.length)} ô`}
        busy={xoa.isPending}
        onClose={() => setHoi(false)}
        onConfirm={() => xoa.mutate(slots.length)}
        message={
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Xoá <b>{formatInt(slots.length)} ô</b> loại <b>{kind?.label ?? type}</b> của{" "}
              <b>{role.roleName}</b> ({role.srvCode}). Không lùi lại được.
            </Typography>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Máy chủ sẽ đọc lại kho đồ và chỉ xoá nếu vẫn đúng {formatInt(slots.length)} ô. Lệch
              một ô là dừng — người chơi có thể vừa nhặt thêm đồ trong lúc bạn đọc bảng.
            </Alert>
            <TextField
              size="small"
              label="Lý do (vào nhật ký)"
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              placeholder="ví dụ: phiếu #4821, thu hồi đồ nhân bản"
              fullWidth
            />
          </Stack>
        }
      />
    </Page>
  );
}
