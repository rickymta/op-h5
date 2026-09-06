import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { FormDialog, Grid, Page, StatusChip, api, errText, useToast } from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams } from "@op/admin-ui";
import type { Badge, Game, GameInput } from "../api";
import { Cong, Loi, Muc, OAnh } from "../bits";
import { useForm } from "../useForm";
import { canWrite, useMe } from "../useMe";

const NHAN: Record<Badge, string> = { "": "— không nhãn —", new: "Mới", hot: "Hot", soon: "Sắp ra" };
const MAU_MAC_DINH = "#EE4623";
const HEX = /^#[0-9A-Fa-f]{6}$/;
const LA_URL = (v: string) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v);

/** Quản lý game trong hệ thống. Thay phần seed cứng trong docker/platform-seed.sh. */
export function Games() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const qc = useQueryClient();
  const { show } = useToast();
  const [them, setThem] = useState(false);
  const [sua, setSua] = useState("");

  const q = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = q.data?.games ?? [];
  const dangSua = games.find((g) => g.code === sua);

  const lamMoi = () => void qc.invalidateQueries({ queryKey: ["games"] });

  const cot: AdminColDef[] = [
    { field: "code", headerName: "Mã", width: 100 },
    {
      field: "name",
      headerName: "Tên",
      minWidth: 180,
      flex: 1.4,
      renderCell: (p: GridRenderCellParams) => {
        const g = p.row as Game;
        return (
          <Box sx={{ lineHeight: 1.3, py: 0.5, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box component="span" sx={{ fontWeight: 600 }}>
                {g.name}
              </Box>
              {g.featured && <StatusChip value="nb" map={{ nb: { label: "Nổi bật", color: "warning" } }} />}
            </Stack>
            {g.tagline && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {g.tagline}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: "genre",
      headerName: "Thể loại",
      minWidth: 120,
      flex: 0.8,
      hideBelow: "lg",
      valueGetter: (_v, r: Game) => r.genre || "—",
    },
    {
      field: "badge",
      headerName: "Nhãn",
      width: 92,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) => {
        const b = (p.row as Game).badge;
        return b ? (
          <StatusChip value={b} map={{ [b]: { label: NHAN[b], color: "info" } }} />
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        );
      },
    },
    { field: "servers", headerName: "Máy chủ", width: 82, align: "right", headerAlign: "right", hideBelow: "md" },
    { field: "packages", headerName: "Gói", width: 72, align: "right", headerAlign: "right", hideBelow: "md" },
    {
      field: "has_client",
      headerName: "Đăng nhập",
      width: 100,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) =>
        (p.row as Game).has_client ? (
          <StatusChip value="co" map={{ co: { label: "Có", color: "success" } }} />
        ) : (
          <StatusChip value="thieu" map={{ thieu: { label: "Thiếu", color: "error" } }} />
        ),
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 108,
      renderCell: (p: GridRenderCellParams) => (
        <StatusChip
          value={(p.row as Game).status}
          map={{ active: { label: "Đang mở", color: "success" }, hidden: { label: "Ẩn", color: "default" } }}
        />
      ),
    },
    {
      field: "act",
      headerName: "",
      width: 72,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Button size="small" onClick={() => setSua((p.row as Game).code)}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <Page
      title="Game"
      sub="Mỗi game cần bốn thứ: dòng trong games, client đăng nhập OIDC, thiết bị và ít nhất một máy chủ. Trang này ghi cả bốn; tiến trình Adapter thì vẫn phải chạy riêng."
      maxWidth={false}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} disabled={!ghi} onClick={() => setThem(true)}>
          Thêm game
        </Button>
      }
    >
      <Loi e={q.error} />
      {me.data && !ghi && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vai trò <b>{me.data.role}</b> chỉ xem. Sửa cần operator trở lên.
        </Typography>
      )}

      <Grid
        columns={cot}
        rows={games}
        rowId={(g) => g.code}
        loading={q.isLoading}
        empty="Chưa có game nào."
        pageSize={25}
        density="standard"
      />

      {dangSua && (
        <SuaGame
          key={dangSua.code}
          game={dangSua}
          ghi={ghi}
          onClose={() => setSua("")}
          onDone={() => {
            show("Đã lưu");
            setSua("");
            lamMoi();
          }}
        />
      )}
      {them && (
        <ThemGame
          onClose={() => setThem(false)}
          onDone={(msg) => {
            show(msg);
            setThem(false);
            lamMoi();
          }}
        />
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- sửa

function tuGame(g: Game): GameInput {
  return {
    name: g.name,
    adapter_url: g.adapter_url,
    site_url: g.site_url,
    status: g.status,
    tagline: g.tagline ?? "",
    genre: g.genre ?? "",
    description: g.description ?? "",
    cover_url: g.cover_url ?? "",
    banner_url: g.banner_url ?? "",
    logo_url: g.logo_url ?? "",
    accent: g.accent ?? "",
    badge: g.badge ?? "",
    featured: !!g.featured,
    fanpage_url: g.fanpage_url ?? "",
    group_url: g.group_url ?? "",
    support_url: g.support_url ?? "",
  };
}

/** Kiểm trước ở trình duyệt cho câu báo lỗi gần ô nhập; phía Go kiểm lại lần nữa. */
function loiGame(f: GameInput): string {
  if (!f.name.trim()) return "Tên game không được trống.";
  if (f.tagline.length > 120) return "Tagline tối đa 120 ký tự.";
  if (f.genre.length > 48) return "Thể loại tối đa 48 ký tự.";
  if (f.accent && !HEX.test(f.accent)) return "Màu nhấn phải dạng #RRGGBB, ví dụ #EE4623.";
  for (const [k, nhan] of [
    ["cover_url", "Ảnh bìa"],
    ["banner_url", "Key visual"],
    ["logo_url", "Logo"],
    ["fanpage_url", "Fanpage"],
    ["group_url", "Nhóm"],
    ["support_url", "Hỗ trợ"],
  ] as const) {
    if (!LA_URL(f[k].trim())) return `${nhan}: để trống, hoặc bắt đầu bằng / hoặc http(s)://.`;
  }
  return "";
}

function SuaGame({
  game,
  ghi,
  onClose,
  onDone,
}: {
  game: Game;
  ghi: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { f, set, text, reset } = useForm(() => tuGame(game));
  const goc = tuGame(game);
  const dirty = JSON.stringify(f) !== JSON.stringify(goc);
  const mauHopLe = HEX.test(f.accent);

  const luu = useMutation({
    // Gửi ĐỦ trường: phía Go đối chiếu `featured` để tắt ở game khác, nên không gửi lẻ.
    mutationFn: () =>
      api.post<{ ok: boolean }>(`/api/games/${encodeURIComponent(game.code)}`, {
        ...f,
        name: f.name.trim(),
        tagline: f.tagline.trim(),
        genre: f.genre.trim(),
        accent: f.accent.trim().toUpperCase(),
      }),
    onSuccess: onDone,
  });

  const loi = loiGame(f);

  return (
    <FormDialog
      open
      title={`Sửa ${game.name} · ${game.code}`}
      maxWidth="md"
      // Luu duoc ca khi khong doi gi: gui lai nguyen trang thai cu la vo hai, con mot nut
      // bam khong phan ung thi nguoi truc tuong trang hong.
      onClose={onClose}
      onSubmit={() => !loi && ghi && luu.mutate()}
      busy={luu.isPending}
      error={loi || (luu.error ? errText(luu.error) : null)}
    >
      <Typography variant="body2" color="text.secondary">
        URL ảnh có thể ghi tương đối so với trang game (vd <code>/assets/images/logo.png</code>); trang
        chính tự ghép thành tuyệt đối.
      </Typography>

      <Muc>Giới thiệu</Muc>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Tên hiển thị"
          value={f.name}
          onChange={text("name")}
          size="small"
          fullWidth
          required
          disabled={!ghi}
          slotProps={{ htmlInput: { maxLength: 64 } }}
        />
        <TextField
          label="Thể loại"
          helperText="vd Đấu tướng · Idle"
          value={f.genre}
          onChange={text("genre")}
          size="small"
          fullWidth
          disabled={!ghi}
          slotProps={{ htmlInput: { maxLength: 48 } }}
        />
      </Stack>
      <TextField
        label="Tagline"
        helperText="Một câu dưới tên game, tối đa 120 ký tự"
        value={f.tagline}
        onChange={text("tagline")}
        size="small"
        fullWidth
        disabled={!ghi}
        slotProps={{ htmlInput: { maxLength: 120 } }}
      />
      <TextField
        label="Mô tả"
        helperText="Văn bản thuần, hiện ở trang game"
        value={f.description}
        onChange={text("description")}
        size="small"
        fullWidth
        multiline
        minRows={4}
        disabled={!ghi}
      />

      <Muc>Ảnh</Muc>
      <OAnh
        label="Ảnh bìa"
        hint="Dọc 3:4, thẻ game ở trang chính"
        value={f.cover_url}
        site={f.site_url}
        onChange={(v) => set("cover_url", v)}
        placeholder="/assets/images/cover.png"
        disabled={!ghi}
      />
      <OAnh
        label="Key visual"
        hint="Ngang, nền hero"
        value={f.banner_url}
        site={f.site_url}
        onChange={(v) => set("banner_url", v)}
        placeholder="/assets/images/bg_pc.jpg"
        disabled={!ghi}
      />
      <OAnh
        label="Logo"
        hint="Nền trong suốt"
        value={f.logo_url}
        site={f.site_url}
        onChange={(v) => set("logo_url", v)}
        placeholder="/assets/images/logo.png"
        disabled={!ghi}
      />

      <Muc>Nhãn và màu</Muc>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
        <TextField
          label="Màu nhấn"
          helperText="#RRGGBB, để trống dùng màu mặc định"
          value={f.accent}
          onChange={text("accent")}
          placeholder={MAU_MAC_DINH}
          size="small"
          fullWidth
          disabled={!ghi}
          slotProps={{ htmlInput: { maxLength: 7, autoComplete: "off" } }}
        />
        <input
          type="color"
          aria-label="Chọn màu nhấn"
          disabled={!ghi}
          value={mauHopLe ? f.accent : MAU_MAC_DINH}
          onChange={(e) => set("accent", e.target.value.toUpperCase())}
          style={{
            width: 44,
            height: 40,
            padding: 0,
            border: 0,
            borderRadius: 6,
            background: "transparent",
            cursor: ghi ? "pointer" : "default",
            flexShrink: 0,
          }}
        />
        <TextField
          select
          label="Nhãn"
          helperText="Góc thẻ game"
          value={f.badge}
          onChange={text("badge")}
          size="small"
          fullWidth
          disabled={!ghi}
        >
          {(Object.keys(NHAN) as Badge[]).map((b) => (
            <MenuItem key={b} value={b}>
              {NHAN[b]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Cong
        label="Nổi bật — hiện ở hero trang chính"
        hint="Chỉ một game nổi bật; bật ở đây sẽ tắt ở game khác."
        checked={f.featured}
        onChange={(v) => set("featured", v)}
        disabled={!ghi}
      />

      <Muc>Liên kết cộng đồng</Muc>
      <TextField
        label="Fanpage"
        value={f.fanpage_url}
        onChange={text("fanpage_url")}
        placeholder="https://facebook.com/…"
        size="small"
        fullWidth
        disabled={!ghi}
      />
      <TextField
        label="Nhóm"
        value={f.group_url}
        onChange={text("group_url")}
        placeholder="https://facebook.com/groups/…"
        size="small"
        fullWidth
        disabled={!ghi}
      />
      <TextField
        label="Hỗ trợ"
        value={f.support_url}
        onChange={text("support_url")}
        placeholder="https://m.me/…"
        size="small"
        fullWidth
        disabled={!ghi}
      />

      <Muc>Kỹ thuật</Muc>
      <TextField
        label="Địa chỉ Adapter"
        helperText="Nơi tiến trình Adapter của game nghe"
        value={f.adapter_url}
        onChange={text("adapter_url")}
        size="small"
        fullWidth
        required
        disabled={!ghi}
      />
      <TextField
        label="Địa chỉ trang game"
        helperText="Đổi thì redirect OIDC đổi theo"
        value={f.site_url}
        onChange={text("site_url")}
        size="small"
        fullWidth
        required
        disabled={!ghi}
      />
      <TextField
        select
        label="Trạng thái"
        value={f.status}
        onChange={text("status")}
        size="small"
        fullWidth
        disabled={!ghi}
      >
        <MenuItem value="active">đang mở</MenuItem>
        <MenuItem value="hidden">ẩn</MenuItem>
      </TextField>

      <Divider />
      <Box>
        <Button size="small" disabled={!dirty} onClick={() => reset(goc)}>
          Hoàn tác thay đổi
        </Button>
        {dirty && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Có thay đổi chưa lưu.
          </Typography>
        )}
      </Box>
    </FormDialog>
  );
}

// ---------------------------------------------------------------- thêm

function ThemGame({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const { f, text } = useForm({
    code: "",
    name: "",
    tagline: "",
    genre: "",
    adapter_url: "http://127.0.0.1:8090",
    site_url: "",
    device_code: "",
    srv_code: "s1",
    ws_port: "8001",
  });

  const tao = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>("/api/games", {
        ...f,
        ws_port: Number(f.ws_port) || 0,
        // Để trống mã thiết bị thì chỉ tạo game, thêm máy chủ sau ở trang Đội máy chủ.
        device_code: f.device_code.trim(),
        srv_code: f.device_code.trim() ? f.srv_code : "",
      }),
    onSuccess: (d) => onDone(d.message),
  });

  return (
    <FormDialog
      open
      title="Thêm game"
      maxWidth="md"
      submitLabel="Tạo game"
      onClose={onClose}
      onSubmit={() => tao.mutate()}
      busy={tao.isPending}
      error={tao.error ? errText(tao.error) : null}
    >
      <Typography variant="body2" color="text.secondary">
        Địa chỉ trang game quyết định đường quay về sau khi đăng nhập, nên phải đúng ngay từ đầu.
        Ảnh và nhãn sửa sau bằng nút Sửa.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Mã game"
          helperText="Chữ thường, dùng làm client_id"
          value={f.code}
          onChange={text("code")}
          placeholder="haitac"
          size="small"
          fullWidth
          required
        />
        <TextField
          label="Tên hiển thị"
          value={f.name}
          onChange={text("name")}
          placeholder="Đại Hải Trình"
          size="small"
          fullWidth
          required
        />
      </Stack>
      <TextField
        label="Tagline"
        helperText="Tuỳ chọn, một câu dưới tên"
        value={f.tagline}
        onChange={text("tagline")}
        placeholder="Ra khơi cùng băng hải tặc của riêng bạn"
        size="small"
        fullWidth
        slotProps={{ htmlInput: { maxLength: 120 } }}
      />
      <TextField
        label="Thể loại"
        helperText="Tuỳ chọn"
        value={f.genre}
        onChange={text("genre")}
        placeholder="Đấu tướng · Idle"
        size="small"
        fullWidth
        slotProps={{ htmlInput: { maxLength: 48 } }}
      />
      <TextField
        label="Địa chỉ Adapter"
        helperText="Nơi tiến trình Adapter của game nghe"
        value={f.adapter_url}
        onChange={text("adapter_url")}
        size="small"
        fullWidth
        required
      />
      <TextField
        label="Địa chỉ trang game"
        helperText="Người chơi mở URL này"
        value={f.site_url}
        onChange={text("site_url")}
        placeholder="https://haitac.example.com"
        size="small"
        fullWidth
        required
      />

      <Muc>Máy chủ đầu tiên (bỏ trống nếu thêm sau)</Muc>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Mã thiết bị" value={f.device_code} onChange={text("device_code")} placeholder="d1" size="small" fullWidth />
        <TextField label="Mã máy chủ" value={f.srv_code} onChange={text("srv_code")} size="small" fullWidth />
        <TextField
          label="Cổng WebSocket"
          value={f.ws_port}
          onChange={text("ws_port")}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
      </Stack>
    </FormDialog>
  );
}
