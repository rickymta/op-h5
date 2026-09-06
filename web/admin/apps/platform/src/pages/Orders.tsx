import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  ConfirmDialog,
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
import type { Order, OrdersResponse } from "../api";
import { Loi } from "../bits";
import { canWrite, useMe } from "../useMe";

const LOC: { v: string; l: string }[] = [
  { v: "", l: "tất cả" },
  { v: "pending", l: "chờ phát" },
  { v: "granted", l: "đã phát" },
  { v: "failed", l: "thất bại" },
  { v: "refunded", l: "đã hoàn" },
];

/** Đơn mua: mỗi dòng là một lần trừ Xu. Phát lại và hoàn Xu đều vào nhật ký. */
export function Orders() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const qc = useQueryClient();
  const { show } = useToast();
  const [game, setGame] = useState("");
  const [status, setStatus] = useState("");
  const [hoan, setHoan] = useState<Order | null>(null);
  const [phatLai, setPhatLai] = useState<Order | null>(null);

  const q = useQuery({
    queryKey: ["orders", game, status],
    queryFn: () =>
      api.get<OrdersResponse>(
        `/api/orders?game=${encodeURIComponent(game)}&status=${encodeURIComponent(status)}`,
      ),
    // Đơn 'pending' đổi trạng thái do worker nền, không do thao tác trên trang này.
    refetchInterval: (query) => (query.state.data?.orders.some((o) => o.status === "pending") ? 5_000 : false),
  });

  const data = q.data;
  const games = data?.games ?? [];
  const orders = data?.orders ?? [];

  const xong = (msg: string) => {
    show(msg);
    setHoan(null);
    setPhatLai(null);
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const lam = useMutation({
    mutationFn: ({ id, what, reason }: { id: number; what: "retry" | "refund"; reason?: string }) =>
      api.post<{ ok: boolean; refund_txn?: number }>(`/api/orders/${id}/${what}`, { reason }),
    onSuccess: (d, v) =>
      xong(v.what === "retry" ? `Đã đưa đơn #${v.id} về hàng đợi` : `Đã hoàn Xu, giao dịch #${d.refund_txn}`),
  });

  const cot: AdminColDef[] = [
    { field: "id", headerName: "#", width: 62, align: "right", headerAlign: "right" },
    { field: "created_at", headerName: "Lúc", width: 118, hideBelow: "lg" },
    {
      field: "username",
      headerName: "Người chơi",
      minWidth: 110,
      flex: 0.7,
      valueGetter: (_v, r: Order) => r.username || `#${r.user_id}`,
    },
    {
      field: "name",
      headerName: "Gói",
      minWidth: 160,
      flex: 1.2,
      renderCell: (p: GridRenderCellParams) => {
        const o = p.row as Order;
        return (
          <Box sx={{ lineHeight: 1.3, py: 0.5, minWidth: 0 }}>
            <Box sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {o.package_id}
            </Typography>
          </Box>
        );
      },
    },
    { field: "srv_code", headerName: "Máy chủ", width: 78, hideBelow: "lg" },
    {
      field: "amount_xu",
      headerName: "Xu",
      width: 100,
      align: "right",
      headerAlign: "right",
      renderCell: (p: GridRenderCellParams) => <Money xu={(p.row as Order).amount_xu} />,
    },
    {
      field: "grant_mode",
      headerName: "Phát",
      width: 78,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={(p.row as Order).grant_mode} size="small" variant="outlined" />
      ),
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 112,
      renderCell: (p: GridRenderCellParams) => {
        const o = p.row as Order;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <StatusChip value={o.status} />
            {(o.status === "pending" || o.status === "failed") && (
              <Typography variant="caption" color="text.secondary">
                ×{o.attempts}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      field: "last_error",
      headerName: "Lỗi",
      minWidth: 130,
      flex: 1,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) => (
        <Typography
          variant="caption"
          color="error.light"
          title={(p.row as Order).last_error}
          sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {(p.row as Order).last_error}
        </Typography>
      ),
    },
    {
      field: "act",
      headerName: "",
      width: 150,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const o = p.row as Order;
        return (
          <Stack direction="row" spacing={0.5}>
            {o.status === "failed" && (
              <Button size="small" disabled={!ghi || lam.isPending} onClick={() => setPhatLai(o)}>
                Phát lại
              </Button>
            )}
            {(o.status === "failed" || o.status === "pending") && (
              <Button
                size="small"
                color="warning"
                disabled={!ghi || lam.isPending}
                onClick={() => setHoan(o)}
              >
                {o.status === "pending" ? "Huỷ & hoàn" : "Hoàn Xu"}
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Page
      title="Đơn mua"
      sub="Mỗi dòng là một lần trừ Xu. chờ phát = đang chờ · đã phát = xong · thất bại = console từ chối hoặc hết lần thử (Xu hoàn tự động) · ingame = mua bằng nút trong game, game tự phát."
      maxWidth={false}
    >
      <Loi e={q.error} />
      {me.data && !ghi && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vai trò <b>{me.data.role}</b> chỉ xem. Phát lại và hoàn Xu cần operator trở lên.
        </Typography>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              select
              size="small"
              label="Game"
              // Chưa chọn thì theo game mà API trả về (mặc định đầu tiên), không để ô trống.
              value={game || data?.game || ""}
              onChange={(e) => setGame(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {games.length === 0 && <MenuItem value="">(đang tải)</MenuItem>}
              {games.map((x) => (
                <MenuItem key={x.code} value={x.code}>
                  {x.name} ({x.code})
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {LOC.map((s) => (
                <Chip
                  key={s.v || "all"}
                  label={s.v && data?.counts[s.v] ? `${s.l} ${data.counts[s.v]}` : s.l}
                  onClick={() => setStatus(s.v)}
                  color={status === s.v ? "primary" : "default"}
                  variant={status === s.v ? "filled" : "outlined"}
                  sx={{ height: 32 }}
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid
        columns={cot}
        rows={orders}
        rowId={(o) => o.id}
        loading={q.isLoading}
        empty="Chưa có đơn nào."
        pageSize={25}
        density="standard"
      />

      {phatLai && (
        <ConfirmDialog
          open
          title={`Phát lại đơn #${phatLai.id}?`}
          message={`Đưa đơn "${phatLai.name}" của ${phatLai.username || "#" + phatLai.user_id} về hàng đợi để worker thử phát lại.`}
          busy={lam.isPending}
          onClose={() => setPhatLai(null)}
          onConfirm={() => lam.mutate({ id: phatLai.id, what: "retry" })}
          confirmLabel="Phát lại"
        />
      )}
      {hoan && <HoanXu order={hoan} busy={lam.isPending} err={lam.error} onClose={() => setHoan(null)}
                       onSubmit={(reason) => lam.mutate({ id: hoan.id, what: "refund", reason })} />}
    </Page>
  );
}

function HoanXu({
  order,
  busy,
  err,
  onClose,
  onSubmit,
}: {
  order: Order;
  busy: boolean;
  err: unknown;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <FormDialog
      open
      title={`Hoàn Xu cho đơn #${order.id}`}
      onClose={onClose}
      onSubmit={() => onSubmit(reason.trim())}
      submitLabel="Hoàn Xu"
      busy={busy}
      error={err ? errText(err) : null}
    >
      <Typography variant="body2" color="text.secondary">
        Trả lại <Money xu={order.amount_xu} /> Xu cho <b>{order.username || `#${order.user_id}`}</b> và
        đóng đơn “{order.name}”.
      </Typography>
      <TextField
        label="Lý do"
        helperText="Vào nhật ký cùng số tiền và người thao tác."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        size="small"
        autoFocus
        multiline
        minRows={2}
      />
    </FormDialog>
  );
}
