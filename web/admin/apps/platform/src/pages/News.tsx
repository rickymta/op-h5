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
import {
  ConfirmDialog,
  FormDialog,
  Grid,
  Page,
  StatusChip,
  api,
  errText,
  useToast,
} from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams } from "@op/admin-ui";
import type { Game, News as NewsRow, NewsInput, NewsKind, NewsResponse } from "../api";
import { Cong, Loi, Muc, OAnh } from "../bits";
import { fmtDate, localToRFC3339, rfc3339ToLocal } from "../time";
import { useForm } from "../useForm";
import { canWrite, useMe } from "../useMe";

const LOAI: Record<NewsKind, string> = { news: "Tin", event: "Sự kiện", notice: "Thông báo" };
const TRANG_THAI = [
  ["all", "tất cả"],
  ["draft", "nháp"],
  ["published", "đã đăng"],
] as const;
type TrangThai = (typeof TRANG_THAI)[number][0];

const CO_TRANG = 20;

/** Tin tức, sự kiện, thông báo — hiện ở trang chính và trang của từng game. */
export function News() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const qc = useQueryClient();
  const { show } = useToast();
  const [game, setGame] = useState("all");
  const [status, setStatus] = useState<TrangThai>("all");
  const [trang, setTrang] = useState(1);
  // form: null đóng · "new" thêm · một dòng tin đang sửa.
  const [form, setForm] = useState<"new" | NewsRow | null>(null);
  const [xoa, setXoa] = useState<NewsRow | null>(null);

  const gamesQ = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = gamesQ.data?.games ?? [];

  const list = useQuery({
    queryKey: ["news", game, status, trang],
    queryFn: () =>
      api.get<NewsResponse>(
        `/api/news?game=${encodeURIComponent(game)}&status=${status}&page=${trang}&page_size=${CO_TRANG}`,
      ),
    placeholderData: (prev) => prev,
  });
  const items = list.data?.news ?? [];

  // API chỉ báo `has_more`, không trả tổng. DataGrid cần một con số để bật nút trang sau:
  // "đủ trang này + 1" là mức nhỏ nhất đúng, và trang cuối thì đếm chính xác.
  const tong = (trang - 1) * CO_TRANG + items.length + (list.data?.has_more ? 1 : 0);

  const lamMoi = () => void qc.invalidateQueries({ queryKey: ["news"] });

  const del = useMutation({
    mutationFn: (n: NewsRow) => api.post<{ ok: boolean }>(`/api/news/${n.id}/delete`),
    onSuccess: (_d, n) => {
      show(`Đã xoá tin #${n.id}`);
      if (form && form !== "new" && form.id === n.id) setForm(null);
      setXoa(null);
      lamMoi();
    },
  });

  const cot: AdminColDef[] = [
    {
      field: "title",
      headerName: "Tiêu đề",
      minWidth: 220,
      flex: 1.6,
      renderCell: (p: GridRenderCellParams) => {
        const n = p.row as NewsRow;
        return (
          <Box sx={{ lineHeight: 1.3, py: 0.5, minWidth: 0 }}>
            <Box sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</Box>
            {n.summary && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {n.summary}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: "kind",
      headerName: "Loại",
      width: 104,
      renderCell: (p: GridRenderCellParams) => {
        const k = (p.row as NewsRow).kind;
        return (
          <StatusChip
            value={k}
            map={{
              news: { label: "Tin", color: "default" },
              event: { label: "Sự kiện", color: "success" },
              notice: { label: "Thông báo", color: "warning" },
            }}
          />
        );
      },
    },
    {
      field: "game_code",
      headerName: "Game",
      width: 120,
      hideBelow: "md",
      valueGetter: (_v, r: NewsRow) => (r.game_code ? r.game_name || r.game_code : "Chung"),
    },
    {
      field: "pinned",
      headerName: "Ghim",
      width: 80,
      hideBelow: "xl",
      renderCell: (p: GridRenderCellParams) =>
        (p.row as NewsRow).pinned ? (
          <StatusChip value="g" map={{ g: { label: "Ghim", color: "warning" } }} />
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: "status",
      headerName: "Trạng thái",
      width: 110,
      renderCell: (p: GridRenderCellParams) => <StatusChip value={(p.row as NewsRow).status} />,
    },
    {
      field: "published_at",
      headerName: "Đăng lúc",
      width: 130,
      hideBelow: "lg",
      valueGetter: (_v, r: NewsRow) => fmtDate(r.published_at),
    },
    {
      field: "created_by_name",
      headerName: "Người tạo",
      width: 110,
      hideBelow: "xl",
      valueGetter: (_v, r: NewsRow) => r.created_by_name || "—",
    },
    {
      field: "act",
      headerName: "",
      width: 140,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const n = p.row as NewsRow;
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" onClick={() => setForm(n)}>
              Sửa
            </Button>
            <Button size="small" color="error" disabled={!ghi} onClick={() => setXoa(n)}>
              Xoá
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Page
      title="Tin tức"
      sub="Tin Chung hiện ở trang chính và mọi trang game; tin của một game chỉ hiện ở game đó. Thông báo được ghim mới nhất thành dải báo trên đầu trang chính. Chỉ tin đã đăng mới lộ ra ngoài."
      maxWidth={false}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} disabled={!ghi} onClick={() => setForm("new")}>
          Thêm tin
        </Button>
      }
    >
      <Loi e={list.error} />
      {me.data && !ghi && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vai trò <b>{me.data.role}</b> chỉ xem. Thêm, sửa, xoá cần operator trở lên.
        </Typography>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <TextField
              select
              size="small"
              label="Game"
              value={game}
              onChange={(e) => {
                setGame(e.target.value);
                setTrang(1);
              }}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              {games.map((g) => (
                <MenuItem key={g.code} value={g.code}>
                  {g.name} ({g.code})
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {TRANG_THAI.map(([s, nhan]) => (
                <Chip
                  key={s}
                  label={nhan}
                  onClick={() => {
                    setStatus(s);
                    setTrang(1);
                  }}
                  color={status === s ? "primary" : "default"}
                  variant={status === s ? "filled" : "outlined"}
                  sx={{ height: 32 }}
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid
        columns={cot}
        rows={items}
        rowId={(n) => n.id}
        loading={list.isLoading}
        empty="Chưa có tin nào."
        density="standard"
        page={trang}
        pageSize={CO_TRANG}
        total={tong}
        onPage={setTrang}
      />

      {form && (
        <FormTin
          key={form === "new" ? "new" : form.id}
          initial={form === "new" ? undefined : form}
          games={games}
          ghi={ghi}
          onClose={() => setForm(null)}
          onDone={(msg) => {
            show(msg);
            setForm(null);
            lamMoi();
          }}
        />
      )}
      {xoa && (
        <ConfirmDialog
          open
          danger
          title={`Xoá tin #${xoa.id}?`}
          message={`“${xoa.title}” sẽ biến mất khỏi trang công khai. Không khôi phục được.`}
          busy={del.isPending}
          onClose={() => setXoa(null)}
          onConfirm={() => del.mutate(xoa)}
        />
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- form thêm / sửa

function FormTin({
  initial,
  games,
  ghi,
  onClose,
  onDone,
}: {
  initial?: NewsRow;
  games: Game[];
  ghi: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { f, set, text } = useForm({
    game_code: initial?.game_code ?? "",
    slug: initial?.slug ?? "",
    kind: initial?.kind ?? ("news" as NewsKind),
    title: initial?.title ?? "",
    summary: initial?.summary ?? "",
    body: initial?.body ?? "",
    image_url: initial?.image_url ?? "",
    link_url: initial?.link_url ?? "",
    pinned: initial?.pinned ?? false,
    status: initial?.status ?? ("draft" as NewsRow["status"]),
    published_at: rfc3339ToLocal(initial?.published_at),
  });
  const site = games.find((g) => g.code === f.game_code)?.site_url ?? "";

  const luu = useMutation({
    mutationFn: () => {
      const body: NewsInput = {
        game_code: f.game_code || null,
        slug: f.slug.trim(),
        kind: f.kind,
        title: f.title.trim(),
        summary: f.summary.trim(),
        body: f.body,
        image_url: f.image_url.trim(),
        link_url: f.link_url.trim(),
        pinned: f.pinned,
        status: f.status,
      };
      // Bỏ trống thì không gửi: đăng mà chưa có giờ, phía Go lấy lúc lưu.
      const luc = localToRFC3339(f.published_at);
      if (luc) body.published_at = luc;
      // Tạo trả { id }, sửa trả { ok }; ở đây chỉ cần id khi tạo.
      return api.post<{ id?: number }>(initial ? `/api/news/${initial.id}` : "/api/news", body);
    },
    onSuccess: (d) => onDone(initial ? `Đã lưu tin #${initial.id}` : `Đã tạo tin #${d.id ?? "?"}`),
  });

  const loi = !f.title.trim()
    ? "Tiêu đề không được trống."
    : f.title.length > 160
      ? "Tiêu đề tối đa 160 ký tự."
      : f.summary.length > 300
        ? "Tóm tắt tối đa 300 ký tự."
        : f.published_at && !localToRFC3339(f.published_at)
          ? "Giờ đăng không hợp lệ."
          : "";

  return (
    <FormDialog
      open
      maxWidth="md"
      title={initial ? `Sửa tin #${initial.id}` : "Thêm tin"}
      submitLabel={initial ? "Lưu" : "Tạo tin"}
      onClose={onClose}
      onSubmit={() => !loi && ghi && luu.mutate()}
      busy={luu.isPending}
      error={loi || (luu.error ? errText(luu.error) : null)}
    >
      <Typography variant="body2" color="text.secondary">
        {initial
          ? `Tạo ${fmtDate(initial.created_at)}${initial.created_by_name ? " bởi " + initial.created_by_name : ""} · sửa ${fmtDate(initial.updated_at)}`
          : "Lưu dạng nháp trước, đọc lại rồi mới chuyển sang đã đăng."}
      </Typography>

      <TextField
        label="Tiêu đề"
        helperText="Tối đa 160 ký tự"
        value={f.title}
        onChange={text("title")}
        size="small"
        fullWidth
        required
        disabled={!ghi}
        slotProps={{ htmlInput: { maxLength: 160 } }}
      />
      <TextField
        label="Tóm tắt"
        helperText="Một hai câu hiện ở danh sách, tối đa 300 ký tự"
        value={f.summary}
        onChange={text("summary")}
        size="small"
        fullWidth
        disabled={!ghi}
        slotProps={{ htmlInput: { maxLength: 300 } }}
      />
      <TextField
        label="Nội dung"
        helperText="Văn bản thuần, đoạn cách nhau bằng dòng trống"
        value={f.body}
        onChange={text("body")}
        size="small"
        fullWidth
        multiline
        minRows={10}
        disabled={!ghi}
      />
      <TextField
        label="Đường dẫn"
        helperText="Phần chữ trong /tin-tuc/…; để trống thì tự sinh từ tiêu đề"
        value={f.slug}
        onChange={text("slug")}
        placeholder="vi-du-duong-dan"
        size="small"
        fullWidth
        disabled={!ghi}
        slotProps={{ htmlInput: { maxLength: 96 } }}
      />

      <Muc>Phân loại</Muc>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField select label="Loại" value={f.kind} onChange={text("kind")} size="small" fullWidth disabled={!ghi}>
          {(Object.keys(LOAI) as NewsKind[]).map((k) => (
            <MenuItem key={k} value={k}>
              {LOAI[k]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Game"
          helperText="Chung = hiện ở mọi nơi"
          value={f.game_code ?? ""}
          onChange={text("game_code")}
          size="small"
          fullWidth
          disabled={!ghi}
        >
          <MenuItem value="">— Chung —</MenuItem>
          {games.map((g) => (
            <MenuItem key={g.code} value={g.code}>
              {g.name} ({g.code})
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Muc>Ảnh và liên kết</Muc>
      <OAnh
        label="Ảnh"
        hint="Ngang, hiện cạnh tin"
        value={f.image_url}
        site={site}
        onChange={(v) => set("image_url", v)}
        placeholder="https://… hoặc /brand/…"
        disabled={!ghi}
      />
      <TextField
        label="Liên kết"
        helperText="Bấm vào tin thì mở đường này thay vì trang tin"
        value={f.link_url}
        onChange={text("link_url")}
        placeholder="https://…"
        size="small"
        fullWidth
        disabled={!ghi}
      />

      <Muc>Đăng</Muc>
      <Cong
        label="Ghim — luôn lên đầu danh sách"
        hint="Thông báo ghim mới nhất thành dải báo ở trang chính."
        checked={f.pinned}
        onChange={(v) => set("pinned", v)}
        disabled={!ghi}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField select label="Trạng thái" value={f.status} onChange={text("status")} size="small" fullWidth disabled={!ghi}>
          <MenuItem value="draft">nháp</MenuItem>
          <MenuItem value="published">đã đăng</MenuItem>
        </TextField>
        <TextField
          label="Đăng lúc"
          type="datetime-local"
          helperText="Để trống: lấy lúc lưu khi đã đăng"
          value={f.published_at}
          onChange={text("published_at")}
          size="small"
          fullWidth
          disabled={!ghi}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
    </FormDialog>
  );
}
