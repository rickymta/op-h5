import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import {
  FormDialog,
  Grid,
  Money,
  Page,
  StatusChip,
  api,
  errText,
  useToast,
} from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams } from "@op/admin-ui";
import type { Player, PlayerDetail } from "../api";
import { Loi } from "../bits";
import { canWrite, useMe } from "../useMe";

/** Người chơi: tìm, xem ví và nhân vật, khoá hoặc mở tài khoản. */
export function Players() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [openID, setOpenID] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ["players", term],
    queryFn: () => api.get<{ players: Player[] }>(`/api/players?q=${encodeURIComponent(term)}`),
  });
  const players = list.data?.players ?? [];

  const cot: AdminColDef[] = [
    { field: "id", headerName: "#", width: 64, align: "right", headerAlign: "right" },
    { field: "username", headerName: "Tên đăng nhập", minWidth: 140, flex: 1 },
    {
      field: "email",
      headerName: "Email",
      minWidth: 150,
      flex: 1,
      hideBelow: "md",
      valueGetter: (_v, r: Player) => r.email || "—",
    },
    {
      field: "balance",
      headerName: "Số dư",
      width: 112,
      align: "right",
      headerAlign: "right",
      renderCell: (p: GridRenderCellParams) => <Money xu={(p.row as Player).balance} />,
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 112,
      renderCell: (p: GridRenderCellParams) => {
        const s = (p.row as Player).status;
        return (
          <StatusChip
            value={s}
            map={{ active: { label: "Đang dùng", color: "success" }, locked: { label: "Bị khoá", color: "error" } }}
          />
        );
      },
    },
    {
      field: "last_login_at",
      headerName: "Đăng nhập gần nhất",
      width: 178,
      hideBelow: "lg",
      valueGetter: (_v, r: Player) => r.last_login_at || "chưa",
    },
    {
      field: "act",
      headerName: "",
      width: 96,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as Player;
        return (
          <Button size="small" onClick={() => setOpenID(openID === r.id ? null : r.id)}>
            {openID === r.id ? "Đóng" : "Xem"}
          </Button>
        );
      },
    },
  ];

  return (
    <Page
      title="Người chơi"
      sub="Không có nút xem mật khẩu và không có nút đăng nhập hộ. Khoá tài khoản sẽ cắt luôn phiên đang mở và phải ghi lý do."
    >
      <Loi e={list.error} />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(q.trim());
              setOpenID(null);
            }}
            sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}
          >
            <TextField
              size="small"
              label="Tìm theo tên đăng nhập, email hoặc số điện thoại"
              placeholder="để trống để xem người mới nhất"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              sx={{ flex: "1 1 280px" }}
            />
            <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={list.isFetching}>
              {list.isFetching ? "Đang tìm…" : "Tìm"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid
        columns={cot}
        rows={players}
        rowId={(p) => p.id}
        loading={list.isLoading}
        empty="Không có ai khớp."
        pageSize={25}
      />

      {openID !== null && <ChiTiet key={openID} id={openID} ghi={ghi} />}
    </Page>
  );
}

// ---------------------------------------------------------------- chi tiết một người

function ChiTiet({ id, ghi }: { id: number; ghi: boolean }) {
  const qc = useQueryClient();
  const { show } = useToast();
  const [hoiKhoa, setHoiKhoa] = useState(false);

  const d = useQuery({ queryKey: ["player", id], queryFn: () => api.get<PlayerDetail>(`/api/players/${id}`) });

  const doiTrangThai = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason: string }) =>
      api.post<{ ok: boolean }>(`/api/players/${id}`, { status, reason }),
    onSuccess: () => {
      show("Đã lưu");
      setHoiKhoa(false);
      void qc.invalidateQueries({ queryKey: ["player", id] });
      void qc.invalidateQueries({ queryKey: ["players"] });
    },
  });

  if (d.isLoading)
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Đang tải…
          </Typography>
        </CardContent>
      </Card>
    );
  if (d.isError)
    return (
      <Box sx={{ mt: 2 }}>
        <Loi e={d.error} />
      </Box>
    );

  const dt = d.data!;
  const p = dt.player;
  const khoa = p.status === "active";

  const cotNV: AdminColDef[] = [
    { field: "game_code", headerName: "Game", width: 120 },
    { field: "game_username", headerName: "Tài khoản game", minWidth: 150, flex: 1 },
    {
      field: "account_uid",
      headerName: "accountUid",
      minWidth: 140,
      flex: 1,
      valueGetter: (_v, r: { account_uid: string }) => r.account_uid || "chưa vào game",
    },
    { field: "created_at", headerName: "Tạo", width: 168, hideBelow: "md" },
  ];

  const cotVi: AdminColDef[] = [
    { field: "at", headerName: "Lúc", width: 168 },
    {
      field: "kind",
      headerName: "Loại",
      width: 120,
      renderCell: (x: GridRenderCellParams) => {
        const e = x.row as { kind: string; amount: number };
        return <Chip label={e.kind} size="small" variant="outlined" color={e.amount > 0 ? "success" : "default"} />;
      },
    },
    {
      field: "amount",
      headerName: "Số Xu",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (x: GridRenderCellParams) => <Money xu={(x.row as { amount: number }).amount} sign />,
    },
    { field: "memo", headerName: "Ghi chú", minWidth: 180, flex: 1, hideBelow: "md" },
  ];

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{p.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              Số dư <Money xu={p.balance} /> Xu · tạo {p.created_at}
              {p.phone ? ` · ${p.phone}` : ""}
              {p.email ? ` · ${p.email}` : ""}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color={khoa ? "error" : "primary"}
            disabled={!ghi || doiTrangThai.isPending}
            onClick={() => setHoiKhoa(true)}
          >
            {khoa ? "Khoá tài khoản" : "Mở tài khoản"}
          </Button>
        </Stack>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Nhân vật trong game
        </Typography>
        <Grid
          columns={cotNV}
          rows={dt.identities}
          rowId={(r) => r.game_code}
          empty="Chưa vào game nào."
          pageSize={10}
        />

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          Ví gần đây
        </Typography>
        <Grid
          columns={cotVi}
          rows={dt.history}
          rowId={(r) => `${r.txn_id}-${r.at}-${r.amount}`}
          empty="Chưa có giao dịch nào."
          pageSize={10}
        />
      </CardContent>

      {hoiKhoa && (
        <LyDo
          title={`${khoa ? "Khoá" : "Mở"} tài khoản ${p.username}`}
          note={
            khoa
              ? "Khoá sẽ cắt luôn phiên đang mở của người này. Lý do vào nhật ký."
              : "Mở lại tài khoản. Lý do vào nhật ký."
          }
          busy={doiTrangThai.isPending}
          err={doiTrangThai.error}
          onClose={() => setHoiKhoa(false)}
          onSubmit={(reason) => doiTrangThai.mutate({ status: khoa ? "locked" : "active", reason })}
        />
      )}
    </Card>
  );
}

/** Hộp thoại một ô: lý do bắt buộc cho thao tác vào nhật ký. */
export function LyDo({
  title,
  note,
  busy,
  err,
  onClose,
  onSubmit,
  submitLabel = "Xác nhận",
}: {
  title: string;
  note: string;
  busy: boolean;
  err: unknown;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitLabel?: string;
}) {
  const [reason, setReason] = useState("");
  return (
    <FormDialog
      open
      title={title}
      onClose={onClose}
      onSubmit={() => reason.trim() && onSubmit(reason.trim())}
      submitLabel={submitLabel}
      busy={busy}
      error={err ? errText(err) : null}
    >
      <Typography variant="body2" color="text.secondary">
        {note}
      </Typography>
      <TextField
        label="Lý do"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        size="small"
        autoFocus
        multiline
        minRows={2}
        required
      />
    </FormDialog>
  );
}
