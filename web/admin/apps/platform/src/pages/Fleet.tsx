import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  FormDialog,
  Grid,
  Page,
  StatusChip,
  api,
  errText,
  formatInt,
  useToast,
} from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams, StatusEntry } from "@op/admin-ui";
import type { FleetDevice, FleetGame, FleetResponse, FleetServer, SrvStatus } from "../api";
import { Loi } from "../bits";
import { canWrite, useMe } from "../useMe";

const DAI: Record<string, StatusEntry> = {
  smooth: { label: "Mượt", color: "success" },
  busy: { label: "Đông", color: "warning" },
  full: { label: "Đầy", color: "error" },
  unknown: { label: "—", color: "default" },
};

const TRANG_THAI_SRV: Record<string, StatusEntry> = {
  running: { label: "Đang chạy", color: "success" },
  maintain: { label: "Bảo trì", color: "warning" },
  closed: { label: "Đóng", color: "default" },
  merged: { label: "Đã gộp", color: "info" },
};

const CHON_TRANG_THAI: { v: SrvStatus; l: string }[] = [
  { v: "running", l: "đang chạy" },
  { v: "maintain", l: "bảo trì" },
  { v: "closed", l: "đóng" },
  { v: "merged", l: "đã gộp" },
];

/** Thanh tải nhỏ trong ô: phần trăm so với trần cứng, đổi màu theo dải. */
function Thanh({ online, tran, mau }: { online: number; tran: number; mau: "success" | "warning" | "error" }) {
  const pct = tran > 0 ? Math.min(100, Math.round((online * 100) / tran)) : 0;
  return (
    // Ô của DataGrid cắt phần tràn: khối này phải thấp hơn chiều cao dòng, nếu không thanh
    // tải bị cắt mất và cột chỉ còn con số.
    <Box sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5 }}>
      <Box component="span" sx={{ fontSize: 14, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
        {formatInt(online)}
      </Box>
      <LinearProgress variant="determinate" value={pct} color={mau} sx={{ height: 4, borderRadius: 2 }} />
    </Box>
  );
}

function mauTai(online: number, tran: number): "success" | "warning" | "error" {
  if (tran <= 0) return "success";
  const pct = (online * 100) / tran;
  return pct > 90 ? "error" : pct > 75 ? "warning" : "success";
}

type SuaServer = { game: string; row: FleetServer };
type SuaDevice = { game: string; row: FleetDevice };

/**
 * Đội máy chủ — trang chính.
 *
 * Ngưỡng ở đây chính là ngưỡng cổng giới hạn của Adapter đọc; sửa xong có tác dụng ở nhịp
 * đọc số liệu kế tiếp chứ không tức thì. Adapter không với tới được thì vẫn hiện cấu hình
 * và vẫn sửa được — mất số liệu tải không được làm mất luôn khả năng vận hành.
 */
export function Fleet() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const qc = useQueryClient();
  const { show } = useToast();
  const [suaSrv, setSuaSrv] = useState<SuaServer | null>(null);
  const [suaDev, setSuaDev] = useState<SuaDevice | null>(null);

  const q = useQuery({
    queryKey: ["fleet"],
    queryFn: () => api.get<FleetResponse>("/api/fleet"),
    // Số online là số sống; 30 giây là nhịp Adapter cache, đọc dày hơn cũng ra cùng con số.
    refetchInterval: 30_000,
  });
  const games = q.data?.games ?? [];

  return (
    <Page
      title="Đội máy chủ"
      sub="Ngưỡng ở đây chính là ngưỡng cổng giới hạn của Adapter đọc. Sửa xong có tác dụng ở nhịp đọc số liệu kế tiếp."
      actions={
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => void qc.invalidateQueries({ queryKey: ["fleet"] })}
          disabled={q.isFetching}
        >
          {q.isFetching ? "Đang đọc…" : "Đọc lại"}
        </Button>
      }
    >
      <Loi e={q.error} />
      {me.data && !ghi && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vai trò <b>{me.data.role}</b> chỉ xem. Sửa ngưỡng cần operator trở lên.
        </Typography>
      )}

      {!q.isLoading && games.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Chưa có game nào đang mở. Thêm game ở trang <b>Game</b> rồi quay lại đây.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Stack spacing={3}>
        {games.map((g) => (
          <TheGame
            key={g.code}
            g={g}
            ghi={ghi}
            onSuaSrv={(row) => setSuaSrv({ game: g.code, row })}
            onSuaDev={(row) => setSuaDev({ game: g.code, row })}
          />
        ))}
      </Stack>

      {suaSrv && (
        <SuaMayChu
          key={`${suaSrv.game}/${suaSrv.row.srv_code}`}
          game={suaSrv.game}
          row={suaSrv.row}
          onClose={() => setSuaSrv(null)}
          onDone={() => {
            show("Đã lưu. Có tác dụng ở nhịp đọc số liệu kế tiếp.");
            setSuaSrv(null);
            void qc.invalidateQueries({ queryKey: ["fleet"] });
          }}
        />
      )}
      {suaDev && (
        <SuaMay
          key={`${suaDev.game}/${suaDev.row.device_code}`}
          game={suaDev.game}
          row={suaDev.row}
          onClose={() => setSuaDev(null)}
          onDone={() => {
            show("Đã lưu trần máy.");
            setSuaDev(null);
            void qc.invalidateQueries({ queryKey: ["fleet"] });
          }}
        />
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- một game

function TheGame({
  g,
  ghi,
  onSuaSrv,
  onSuaDev,
}: {
  g: FleetGame;
  ghi: boolean;
  onSuaSrv: (r: FleetServer) => void;
  onSuaDev: (r: FleetDevice) => void;
}) {
  const cotSrv: AdminColDef[] = [
    {
      field: "srv_code",
      headerName: "Máy chủ",
      minWidth: 130,
      flex: 1,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as FleetServer;
        return (
          <Box sx={{ lineHeight: 1.3, py: 0.5 }}>
            <b>{r.srv_code}</b>
            <Typography variant="caption" color="text.secondary" display="block">
              {r.name}
            </Typography>
          </Box>
        );
      },
    },
    { field: "device_code", headerName: "Máy", width: 68, hideBelow: "lg" },
    {
      field: "band",
      headerName: "Dải",
      width: 84,
      renderCell: (p: GridRenderCellParams) => <StatusChip value={(p.row as FleetServer).band} map={DAI} />,
    },
    {
      field: "online",
      headerName: "Đang chơi",
      width: 104,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as FleetServer;
        return <Thanh online={r.online} tran={r.hard_limit} mau={mauTai(r.online, r.hard_limit)} />;
      },
    },
    {
      field: "soft_limit",
      headerName: "Ngưỡng mềm",
      width: 122,
      align: "right",
      headerAlign: "right",
      valueFormatter: (v: number) => formatInt(v),
    },
    {
      field: "overflow_pct",
      headerName: "Biên tràn",
      width: 84,
      align: "right",
      headerAlign: "right",
      hideBelow: "xl",
      valueFormatter: (v: number) => `${v}%`,
    },
    {
      field: "hard_limit",
      headerName: "Chặn ở",
      width: 82,
      align: "right",
      headerAlign: "right",
      hideBelow: "lg",
      valueFormatter: (v: number) => formatInt(v),
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 110,
      renderCell: (p: GridRenderCellParams) => (
        <StatusChip value={(p.row as FleetServer).status} map={TRANG_THAI_SRV} />
      ),
    },
    {
      field: "recommend",
      headerName: "Nhận mới",
      width: 104,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) =>
        (p.row as FleetServer).recommend ? (
          <StatusChip value="co" map={{ co: { label: "Có", color: "success" } }} />
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: "act",
      headerName: "",
      width: 72,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Button size="small" disabled={!ghi} onClick={() => onSuaSrv(p.row as FleetServer)}>
          Sửa
        </Button>
      ),
    },
  ];

  const cotDev: AdminColDef[] = [
    { field: "device_code", headerName: "Máy", width: 80 },
    { field: "name", headerName: "Tên", minWidth: 140, flex: 1 },
    {
      field: "online",
      headerName: "Đang chơi",
      width: 110,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as FleetDevice;
        return <Thanh online={r.online} tran={r.max_online} mau={mauTai(r.online, r.max_online)} />;
      },
    },
    {
      field: "max_online",
      headerName: "Trần",
      width: 96,
      align: "right",
      headerAlign: "right",
      valueFormatter: (v: number) => formatInt(v),
    },
    {
      field: "act",
      headerName: "",
      width: 72,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Button size="small" disabled={!ghi} onClick={() => onSuaDev(p.row as FleetDevice)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, alignItems: "baseline" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {g.name}{" "}
            <Typography component="span" variant="body2" color="text.secondary">
              · {g.code}
            </Typography>
          </Typography>
          {g.reachable && (
            <Typography variant="body2" color="text.secondary">
              Toàn game: {formatInt(g.online)} / {formatInt(g.soft_total)} = {g.utilization}% ngưỡng mềm
            </Typography>
          )}
        </Stack>

        {!g.reachable && (
          <Loi
            e={
              new Error(
                `Không đọc được tải trực tiếp từ Adapter: ${g.error ?? "không rõ"}. ` +
                  "Cấu hình bên dưới vẫn sửa được, nhưng cột “đang chơi” chưa có số liệu.",
              )
            }
          />
        )}

        <Grid
          columns={cotSrv}
          rows={g.servers ?? []}
          rowId={(r) => r.srv_code}
          empty="Game này chưa có máy chủ nào."
          pageSize={25}
          density="standard"
        />

        {(g.devices?.length ?? 0) > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, mb: 1.5 }}>
              Trần máy vật lý — tầng thứ hai: hai máy chủ đều còn chỗ nhưng cộng lại vượt sức máy
              thì vẫn chặn.
            </Typography>
            <Grid columns={cotDev} rows={g.devices} rowId={(r) => r.device_code} pageSize={25} density="standard" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- hộp thoại sửa

function SuaMayChu({
  game,
  row,
  onClose,
  onDone,
}: {
  game: string;
  row: FleetServer;
  onClose: () => void;
  onDone: () => void;
}) {
  const [soft, setSoft] = useState(String(row.soft_limit));
  const [ovf, setOvf] = useState(String(row.overflow_pct));
  const [rec, setRec] = useState(row.recommend);
  const [st, setSt] = useState<SrvStatus>(row.status);

  const luu = useMutation({
    mutationFn: () =>
      api.post<{ status: string }>(
        `/api/servers/${encodeURIComponent(game)}/${encodeURIComponent(row.srv_code)}`,
        {
          soft_limit: Number(soft) || 0,
          overflow_pct: Number(ovf) || 0,
          recommend: rec,
          status: st,
        },
      ),
    onSuccess: onDone,
  });

  const s = Number(soft) || 0;
  const o = Number(ovf) || 0;
  const loi =
    s < 0 || s > 100000
      ? "Ngưỡng mềm phải trong khoảng 0–100000."
      : o < 0 || o > 100
        ? "Biên tràn phải trong khoảng 0–100%."
        : "";

  return (
    <FormDialog
      open
      title={`Máy chủ ${row.srv_code} · ${row.name}`}
      onClose={onClose}
      onSubmit={() => !loi && luu.mutate()}
      busy={luu.isPending}
      error={loi || (luu.error ? errText(luu.error) : null)}
    >
      <TextField
        label="Ngưỡng mềm"
        helperText="Vượt mức này thì dải chuyển sang Đông. 0–100000."
        value={soft}
        onChange={(e) => setSoft(e.target.value)}
        inputMode="numeric"
        size="small"
      />
      <TextField
        label="Biên tràn (%)"
        helperText={`Chặn cứng ở ngưỡng mềm + biên = ${formatInt(Math.floor((s * (100 + o)) / 100))}.`}
        value={ovf}
        onChange={(e) => setOvf(e.target.value)}
        inputMode="numeric"
        size="small"
      />
      <TextField
        select
        label="Trạng thái"
        value={st}
        onChange={(e) => setSt(e.target.value as SrvStatus)}
        size="small"
      >
        {CHON_TRANG_THAI.map((x) => (
          <MenuItem key={x.v} value={x.v}>
            {x.l}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Nhận người chơi mới"
        helperText="Máy chủ được gợi ý cho người mới đăng ký."
        value={rec ? "1" : "0"}
        onChange={(e) => setRec(e.target.value === "1")}
        size="small"
      >
        <MenuItem value="1">có</MenuItem>
        <MenuItem value="0">không</MenuItem>
      </TextField>
    </FormDialog>
  );
}

function SuaMay({
  game,
  row,
  onClose,
  onDone,
}: {
  game: string;
  row: FleetDevice;
  onClose: () => void;
  onDone: () => void;
}) {
  const [max, setMax] = useState(String(row.max_online));
  const luu = useMutation({
    mutationFn: () =>
      api.post<{ status: string }>(
        `/api/devices/${encodeURIComponent(game)}/${encodeURIComponent(row.device_code)}`,
        { max_online: Number(max) || 0 },
      ),
    onSuccess: onDone,
  });
  const n = Number(max) || 0;
  const loi = n < 0 || n > 1_000_000 ? "Trần máy phải trong khoảng 0–1000000." : "";

  return (
    <FormDialog
      open
      title={`Máy ${row.device_code}${row.name ? " · " + row.name : ""}`}
      onClose={onClose}
      onSubmit={() => !loi && luu.mutate()}
      busy={luu.isPending}
      error={loi || (luu.error ? errText(luu.error) : null)}
    >
      <TextField
        label="Trần người chơi cùng lúc"
        helperText={`Tổng của mọi máy chủ chạy trên máy này. Đang chơi: ${formatInt(row.online)}.`}
        value={max}
        onChange={(e) => setMax(e.target.value)}
        inputMode="numeric"
        size="small"
      />
    </FormDialog>
  );
}
