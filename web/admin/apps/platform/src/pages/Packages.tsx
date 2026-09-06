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
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import {
  ApiError,
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
import { NHOM_GOI } from "../api";
import type { PackageRow, PackagesResponse } from "../api";
import { Loi, Muc, ThieuAPI } from "../bits";
import { useForm } from "../useForm";
import { canWrite, useMe } from "../useMe";

const QUA = /^\d+:\d+:\d+(#\d+:\d+:\d+)*$/;

/**
 * Gói cửa hàng.
 *
 * Giá, nhóm và nội dung do `tools/gen-game-packages.py` sinh; tên và trạng thái sửa ở đây
 * được giữ khi sinh lại. Ẩn gói = không hiện trên web, nhưng vẫn mua được từ trong game.
 *
 * Bản Go cũ render bảng thẳng ra HTML nên tiến trình `admin` chỉ có POST tạo/sửa, chưa có
 * `GET /api/packages`. Thiếu endpoint thì bảng trống kèm dải giải thích; hai nút ghi vẫn chạy.
 */
export function Packages() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const qc = useQueryClient();
  const { show } = useToast();
  const [game, setGame] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [sua, setSua] = useState<PackageRow | null>(null);
  const [them, setThem] = useState(false);

  const list = useQuery({
    queryKey: ["packages", game, cat, status, term],
    queryFn: () =>
      api.get<PackagesResponse>(
        `/api/packages?game=${encodeURIComponent(game)}&category=${encodeURIComponent(cat)}` +
          `&status=${encodeURIComponent(status)}&q=${encodeURIComponent(term)}`,
      ),
    placeholderData: (prev) => prev,
    retry: false,
  });

  const data = list.data;
  const games = data?.games ?? [];
  const rows = data?.packages ?? [];
  const gameHienTai = game || data?.game || "";
  const thieu = list.error instanceof ApiError && (list.error.status === 404 || list.error.code === "mock_missing");

  const lamMoi = () => void qc.invalidateQueries({ queryKey: ["packages"] });

  const cot: AdminColDef[] = [
    {
      field: "package_id",
      headerName: "Mã gói",
      minWidth: 140,
      flex: 0.9,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as PackageRow;
        return (
          <Box sx={{ lineHeight: 1.3, py: 0.5, minWidth: 0 }}>
            <Box component="code" sx={{ fontSize: "0.78rem" }}>
              {r.package_id}
            </Box>
            {r.item_tid > 0 && (
              <Typography variant="caption" color="text.secondary" display="block">
                tid {r.item_tid}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: "name",
      headerName: "Tên",
      minWidth: 170,
      flex: 1.3,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as PackageRow;
        return (
          <Box sx={{ lineHeight: 1.3, py: 0.5, minWidth: 0 }}>
            <Box sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</Box>
            {r.description && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {r.description}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: "category",
      headerName: "Nhóm · phát",
      width: 130,
      hideBelow: "lg",
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as PackageRow;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip label={r.category} size="small" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {r.grant_mode}
            </Typography>
          </Stack>
        );
      },
    },
    {
      field: "price_xu",
      headerName: "Giá Xu",
      width: 106,
      align: "right",
      headerAlign: "right",
      renderCell: (p: GridRenderCellParams) => <Money xu={(p.row as PackageRow).price_xu} />,
    },
    {
      field: "badge",
      headerName: "Nhãn",
      width: 88,
      hideBelow: "xl",
      valueGetter: (_v, r: PackageRow) => r.badge || "—",
    },
    {
      field: "reward",
      headerName: "Quà",
      minWidth: 140,
      flex: 1,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) => (
        <Typography
          variant="caption"
          color="text.secondary"
          title={(p.row as PackageRow).reward}
          sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {(p.row as PackageRow).reward || "—"}
        </Typography>
      ),
    },
    { field: "sort_order", headerName: "Thứ tự", width: 80, align: "right", headerAlign: "right", hideBelow: "xl" },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 108,
      renderCell: (p: GridRenderCellParams) => (
        <StatusChip
          value={(p.row as PackageRow).status}
          map={{ active: { label: "Đang bán", color: "success" }, hidden: { label: "Ẩn", color: "default" } }}
        />
      ),
    },
    {
      field: "act",
      headerName: "",
      width: 68,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Button size="small" disabled={!ghi} onClick={() => setSua(p.row as PackageRow)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <Page
      title="Gói cửa hàng"
      sub="Giá, nhóm, nội dung do tools/gen-game-packages.py sinh; tên và trạng thái sửa ở đây được giữ khi sinh lại. Ẩn gói = không hiện trên web, nhưng vẫn mua được từ trong game."
      maxWidth={false}
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!ghi || !gameHienTai}
          onClick={() => setThem(true)}
        >
          Thêm gói
        </Button>
      }
    >
      {thieu ? (
        <ThieuAPI
          path="GET /api/packages"
          viec="Danh sách gói trước đây do trang Go dựng sẵn ra HTML nên chưa có endpoint JSON."
        />
      ) : (
        <Loi e={list.error} />
      )}
      {me.data && !ghi && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vai trò <b>{me.data.role}</b> chỉ xem. Thêm và sửa gói cần operator trở lên.
        </Typography>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            component="form"
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "center" }}
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(q.trim());
            }}
          >
            <TextField
              select
              size="small"
              label="Game"
              value={gameHienTai}
              onChange={(e) => setGame(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {games.length === 0 && <MenuItem value="">(đang tải)</MenuItem>}
              {games.map((x) => (
                <MenuItem key={x.code} value={x.code}>
                  {x.name} ({x.code})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Trạng thái"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            >
              <MenuItem value="">tất cả</MenuItem>
              <MenuItem value="active">đang bán</MenuItem>
              <MenuItem value="hidden">ẩn</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="Tìm"
              placeholder="tên hoặc mã gói"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ flex: "1 1 200px" }}
            />
            <Button type="submit" startIcon={<SearchIcon />} variant="outlined">
              Lọc
            </Button>
          </Stack>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            <Chip
              label="tất cả"
              onClick={() => setCat("")}
              color={cat === "" ? "primary" : "default"}
              variant={cat === "" ? "filled" : "outlined"}
              sx={{ height: 30 }}
            />
            {(data?.cats ?? NHOM_GOI.map((c) => ({ category: c, active: 0, total: 0 }))).map((c) => (
              <Chip
                key={c.category}
                label={c.total ? `${c.category} ${c.active}/${c.total}` : c.category}
                onClick={() => setCat(c.category)}
                color={cat === c.category ? "primary" : "default"}
                variant={cat === c.category ? "filled" : "outlined"}
                sx={{ height: 30 }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Grid
        columns={cot}
        rows={rows}
        rowId={(r) => r.package_id}
        loading={list.isLoading}
        empty={thieu ? "Chưa đọc được danh mục gói." : "Không có gói nào khớp bộ lọc."}
        pageSize={50}
        density="standard"
      />
      {data?.has_more && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Máy chủ chỉ trả tối đa 400 gói đầu — dùng ô tìm hoặc chọn nhóm để thu hẹp.
        </Typography>
      )}

      {sua && (
        <SuaGoi
          key={sua.package_id}
          game={gameHienTai}
          row={sua}
          onClose={() => setSua(null)}
          onDone={() => {
            show(`Đã lưu ${sua.package_id}`);
            setSua(null);
            lamMoi();
          }}
        />
      )}
      {them && (
        <ThemGoi
          game={gameHienTai}
          onClose={() => setThem(false)}
          onDone={(id) => {
            show(`Đã thêm gói ${id}`);
            setThem(false);
            lamMoi();
          }}
        />
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- sửa một gói

function SuaGoi({
  game,
  row,
  onClose,
  onDone,
}: {
  game: string;
  row: PackageRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { f, text } = useForm({
    name: row.name,
    description: row.description,
    badge: row.badge,
    reward: row.reward,
    price_xu: String(row.price_xu),
    status: row.status as string,
    category: row.category,
    sort_order: String(row.sort_order),
  });

  const luu = useMutation({
    mutationFn: () =>
      api.post<{ ok: boolean }>(
        `/api/packages/${encodeURIComponent(game)}/${encodeURIComponent(row.package_id)}`,
        {
          name: f.name.trim(),
          description: f.description,
          badge: f.badge,
          // Gói phát qua console (`pay`/`ingame`) có phần thưởng do game quyết, không gửi lên.
          ...(row.grant_mode === "mail" ? { reward: f.reward.trim() } : null),
          price_xu: Number(f.price_xu) || 0,
          status: f.status,
          category: f.category,
          sort_order: Number(f.sort_order) || 0,
        },
      ),
    onSuccess: onDone,
  });

  const gia = Number(f.price_xu) || 0;
  const loi = !f.name.trim()
    ? "Tên gói không được trống."
    : f.name.length > 128
      ? "Tên gói tối đa 128 ký tự."
      : gia <= 0
        ? "Giá phải lớn hơn 0."
        : row.grant_mode === "mail" && f.reward.trim() && !QUA.test(f.reward.trim())
          ? "Quà phải dạng type:id:count, nhiều món nối bằng #."
          : "";

  return (
    <FormDialog
      open
      maxWidth="md"
      title={`Sửa gói ${row.package_id}`}
      onClose={onClose}
      onSubmit={() => !loi && luu.mutate()}
      busy={luu.isPending}
      error={loi || (luu.error ? errText(luu.error) : null)}
    >
      <TextField
        label="Tên"
        value={f.name}
        onChange={text("name")}
        size="small"
        fullWidth
        required
        slotProps={{ htmlInput: { maxLength: 128 } }}
      />
      <TextField
        label="Mô tả"
        helperText="Hiện dưới tên gói ở cửa hàng"
        value={f.description}
        onChange={text("description")}
        size="small"
        fullWidth
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 512 } }}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Giá Xu"
          value={f.price_xu}
          onChange={(e) => text("price_xu")({ target: { value: e.target.value.replace(/[^\d]/g, "") } })}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
        <TextField
          label="Nhãn"
          helperText="Hot, Mới… để trống là không nhãn"
          value={f.badge}
          onChange={text("badge")}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 48 } }}
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField select label="Nhóm" value={f.category} onChange={text("category")} size="small" fullWidth>
          {NHOM_GOI.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Trạng thái" value={f.status} onChange={text("status")} size="small" fullWidth>
          <MenuItem value="active">đang bán</MenuItem>
          <MenuItem value="hidden">ẩn</MenuItem>
        </TextField>
        <TextField
          label="Thứ tự"
          value={f.sort_order}
          onChange={text("sort_order")}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
      </Stack>

      <Muc>Quà</Muc>
      {row.grant_mode === "mail" ? (
        <TextField
          label="Quà gửi qua thư"
          helperText="type:id:count, nhiều món nối bằng #. 0:1:N = N Nguyên Bảo · 0:0:N = Kim tệ · 3:id:N = vật phẩm."
          value={f.reward}
          onChange={text("reward")}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 512 } }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Gói phát kiểu <b>{row.grant_mode}</b> — nội dung do game quyết, không sửa ở đây.
          {row.reward ? ` Hiện là: ${row.reward}` : ""}
        </Typography>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------- thêm gói

function ThemGoi({
  game,
  onClose,
  onDone,
}: {
  game: string;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const { f, text } = useForm({
    id: "",
    name: "",
    price_xu: "",
    reward: "",
    description: "",
    category: "item" as string,
  });

  const tao = useMutation({
    mutationFn: () =>
      api.post<{ ok: boolean }>(`/api/packages/${encodeURIComponent(game)}`, {
        id: f.id.trim().toLowerCase(),
        name: f.name.trim(),
        price_xu: Number(f.price_xu) || 0,
        reward: f.reward.trim(),
        description: f.description,
        category: f.category,
      }),
    onSuccess: () => onDone(f.id.trim().toLowerCase()),
  });

  const gia = Number(f.price_xu) || 0;
  const loi = !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(f.id.trim().toLowerCase())
    ? "Mã gói: chữ thường, số, gạch; tối đa 64 ký tự."
    : !f.name.trim() || f.name.length > 128
      ? "Tên gói 1–128 ký tự."
      : gia <= 0
        ? "Giá phải lớn hơn 0."
        : !QUA.test(f.reward.trim())
          ? "Quà phải dạng type:id:count#… (0:1:5000 = 5.000 Nguyên Bảo)."
          : "";

  return (
    <FormDialog
      open
      maxWidth="md"
      title="Thêm gói vật phẩm (gửi qua thư)"
      submitLabel="Thêm"
      onClose={onClose}
      onSubmit={() => !loi && tao.mutate()}
      busy={tao.isPending}
      error={loi || (tao.error ? errText(tao.error) : null)}
    >
      <Typography variant="body2" color="text.secondary">
        Gói thêm ở đây luôn phát qua thư (<code>grant_mode = mail</code>) cho game <b>{game}</b>.
        Quà dạng <code>type:id:count</code>, nhiều món nối bằng <code>#</code>. <code>0:1:N</code> = N
        Nguyên Bảo, <code>0:0:N</code> = Kim tệ, <code>0:4:N</code> = EXP anh hùng,{" "}
        <code>3:id:N</code> = vật phẩm (tra <code>gmhanglong/gm/item.txt</code>).
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Mã gói"
          value={f.id}
          onChange={text("id")}
          placeholder="web-knb-500k"
          size="small"
          fullWidth
          required
          autoFocus
        />
        <TextField
          label="Tên"
          value={f.name}
          onChange={text("name")}
          placeholder="500 vạn Nguyên Bảo"
          size="small"
          fullWidth
          required
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Giá Xu"
          value={f.price_xu}
          onChange={(e) => text("price_xu")({ target: { value: e.target.value.replace(/[^\d]/g, "") } })}
          size="small"
          fullWidth
          required
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
        <TextField select label="Nhóm" value={f.category} onChange={text("category")} size="small" fullWidth>
          {NHOM_GOI.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField
        label="Quà"
        value={f.reward}
        onChange={text("reward")}
        placeholder="0:1:5000000"
        size="small"
        fullWidth
        required
      />
      <TextField
        label="Mô tả"
        helperText="Hiện dưới tên gói"
        value={f.description}
        onChange={text("description")}
        size="small"
        fullWidth
      />
    </FormDialog>
  );
}
