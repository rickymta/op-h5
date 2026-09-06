import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
  formatInt,
  useToast,
} from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams } from "@op/admin-ui";
import type { ContentPage, Game, PageInput, PagesResponse } from "../api";
import { Loi } from "../bits";
import { fmtDate } from "../time";
import { canWrite, useMe } from "../useMe";

/** Các trang thường có, gợi ý khi tạo mới. Không ép: slug nào cũng lưu được. */
const GOI_Y: { slug: string; title: string }[] = [
  { slug: "gioi-thieu", title: "Giới thiệu" },
  { slug: "huong-dan", title: "Hướng dẫn" },
  { slug: "dieu-khoan", title: "Điều khoản sử dụng" },
  { slug: "chinh-sach", title: "Chính sách bảo mật" },
  { slug: "faq", title: "Câu hỏi thường gặp" },
  { slug: "ho-tro", title: "Hỗ trợ" },
];

/** Bỏ dấu tiếng Việt rồi rút về a-z0-9 và gạch nối — cùng quy tắc máy chủ dùng cho tin tức. */
function lamSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

type FormState = PageInput & { id: number };

const RONG: FormState = { id: 0, slug: "", game_code: "", title: "", body: "" };

const dai = (s: string) => [...s].length;

/** Trang nội dung tĩnh (giới thiệu, điều khoản, FAQ…) cho nền tảng và từng game. */
export function Content() {
  const me = useMe();
  const ghi = canWrite(me.data);
  const qc = useQueryClient();
  const { show } = useToast();
  const [loc, setLoc] = useState("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [xoa, setXoa] = useState<ContentPage | null>(null);

  const gamesQ = useQuery({ queryKey: ["games"], queryFn: () => api.get<{ games: Game[] }>("/api/games") });
  const games = gamesQ.data?.games ?? [];

  const list = useQuery({
    queryKey: ["pages", loc],
    queryFn: () => api.get<PagesResponse>(`/api/pages?game=${encodeURIComponent(loc)}`),
  });
  const pages = list.data?.pages ?? [];

  const lamMoi = () => void qc.invalidateQueries({ queryKey: ["pages"] });

  const luu = useMutation({
    mutationFn: (v: PageInput) => api.post<{ id: number; slug: string }>("/api/pages", v),
    onSuccess: (d) => {
      show(`Đã lưu trang “${d.slug}”`);
      setForm(null);
      lamMoi();
    },
  });

  const del = useMutation({
    mutationFn: (p: ContentPage) => api.post<{ ok: boolean }>(`/api/pages/${p.id}/delete`),
    onSuccess: (_d, p) => {
      show(`Đã xoá trang “${p.slug}”`);
      if (form?.id === p.id) setForm(null);
      setXoa(null);
      lamMoi();
    },
  });

  const moMoi = (goi?: { slug: string; title: string }) =>
    setForm({
      ...RONG,
      // Đang lọc theo một game thì tạo luôn bản riêng của game đó — đỡ một thao tác.
      game_code: loc === "all" || loc === "common" ? "" : loc,
      slug: goi?.slug ?? "",
      title: goi?.title ?? "",
    });

  const cot: AdminColDef[] = [
    {
      field: "slug",
      headerName: "Đường dẫn",
      minWidth: 140,
      flex: 0.9,
      renderCell: (p: GridRenderCellParams) => <code>{(p.row as ContentPage).slug}</code>,
    },
    { field: "title", headerName: "Tiêu đề", minWidth: 180, flex: 1.3 },
    {
      field: "game_code",
      headerName: "Thuộc về",
      width: 130,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as ContentPage;
        return r.game_code ? (
          <StatusChip value={r.game_code} map={{ [r.game_code]: { label: r.game_name || r.game_code, color: "info" } }} />
        ) : (
          <StatusChip value="chung" map={{ chung: { label: "Chung", color: "default" } }} />
        );
      },
    },
    {
      field: "body",
      headerName: "Dài",
      width: 84,
      align: "right",
      headerAlign: "right",
      hideBelow: "lg",
      valueGetter: (_v, r: ContentPage) => dai(r.body),
      renderCell: (p: GridRenderCellParams) => formatInt(dai((p.row as ContentPage).body)),
    },
    {
      field: "updated_at",
      headerName: "Sửa lần cuối",
      width: 212,
      hideBelow: "lg",
      valueGetter: (_v, r: ContentPage) => fmtDate(r.updated_at) + (r.updated_by_name ? ` · ${r.updated_by_name}` : ""),
    },
    {
      field: "act",
      headerName: "",
      width: 140,
      sortable: false,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row as ContentPage;
        return (
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              onClick={() =>
                setForm({ id: r.id, slug: r.slug, game_code: r.game_code, title: r.title, body: r.body })
              }
            >
              Sửa
            </Button>
            <Button size="small" color="error" disabled={!ghi} onClick={() => setXoa(r)}>
              Xoá
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Page
      title="Trang nội dung"
      sub="Trang tĩnh dùng chung cho toàn hệ thống và cho từng game: giới thiệu, hướng dẫn, điều khoản, chính sách, FAQ, hỗ trợ. Trang của một game tra bản riêng trước, không có thì lui về bản chung — nên cùng một đường dẫn tồn tại được ở cả hai mức."
      maxWidth={false}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} disabled={!ghi} onClick={() => moMoi()}>
          Thêm trang
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
          <TextField
            select
            size="small"
            label="Lọc theo game"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="common">Chung của nền tảng</MenuItem>
            {games.map((g) => (
              <MenuItem key={g.code} value={g.code}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Grid
        columns={cot}
        rows={pages}
        rowId={(p) => p.id}
        loading={list.isPending}
        empty="Chưa có trang nào."
        pageSize={25}
      />

      {!list.isPending && pages.length === 0 && ghi && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Tạo nhanh một trang thường dùng:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {GOI_Y.map((g) => (
                <Button key={g.slug} size="small" variant="outlined" onClick={() => moMoi(g)}>
                  {g.title}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {form && (
        <FormTrang
          f={form}
          games={games}
          ghi={ghi}
          busy={luu.isPending}
          err={luu.error}
          onChange={setForm}
          onClose={() => setForm(null)}
          onSubmit={() =>
            luu.mutate({ slug: form.slug, game_code: form.game_code, title: form.title, body: form.body })
          }
        />
      )}
      {xoa && (
        <ConfirmDialog
          open
          danger
          title={`Xoá trang “${xoa.slug}”?`}
          message={`Bản ${xoa.game_code ? `riêng của ${xoa.game_name || xoa.game_code}` : "chung của nền tảng"} sẽ bị xoá. Trang công khai lui về bản mặc định trong React.`}
          busy={del.isPending}
          onClose={() => setXoa(null)}
          onConfirm={() => del.mutate(xoa)}
        />
      )}
    </Page>
  );
}

function FormTrang({
  f,
  games,
  ghi,
  busy,
  err,
  onChange,
  onClose,
  onSubmit,
}: {
  f: FormState;
  games: Game[];
  ghi: boolean;
  busy: boolean;
  err: unknown;
  onChange: (v: FormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const thieu = !f.slug.trim() || !f.title.trim();
  return (
    <FormDialog
      open
      maxWidth="md"
      title={f.id ? `Sửa trang #${f.id}` : "Trang mới"}
      onClose={onClose}
      onSubmit={() => !thieu && ghi && onSubmit()}
      busy={busy}
      error={err ? errText(err) : null}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="Thuộc về"
          value={f.game_code}
          onChange={(e) => onChange({ ...f, game_code: e.target.value })}
          size="small"
          fullWidth
          // Khoá sau khi tạo: cặp (slug, game_code) là khoá duy nhất, đổi nửa cặp là tạo trang khác.
          disabled={!!f.id || !ghi}
        >
          <MenuItem value="">Chung của nền tảng</MenuItem>
          {games.map((g) => (
            <MenuItem key={g.code} value={g.code}>
              {g.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Đường dẫn"
          helperText={f.id ? "Khoá, đổi thì tạo trang mới" : "Chữ thường, không dấu"}
          value={f.slug}
          onChange={(e) => onChange({ ...f, slug: lamSlug(e.target.value) })}
          placeholder="gioi-thieu"
          size="small"
          fullWidth
          disabled={!!f.id || !ghi}
          slotProps={{ htmlInput: { maxLength: 64 } }}
        />
      </Stack>

      <TextField
        label="Tiêu đề"
        value={f.title}
        onChange={(e) => {
          const title = e.target.value;
          // Trang mới và người dùng chưa tự gõ đường dẫn thì suy ra từ tiêu đề.
          const slug = !f.id && (f.slug === "" || f.slug === lamSlug(f.title)) ? lamSlug(title) : f.slug;
          onChange({ ...f, title, slug });
        }}
        size="small"
        fullWidth
        required
        disabled={!ghi}
        slotProps={{ htmlInput: { maxLength: 160 } }}
      />
      <TextField
        label="Nội dung"
        helperText={`${formatInt(dai(f.body))} ký tự · văn bản thuần, đoạn cách nhau bằng một dòng trống`}
        value={f.body}
        onChange={(e) => onChange({ ...f, body: e.target.value })}
        size="small"
        fullWidth
        multiline
        minRows={14}
        disabled={!ghi}
      />
    </FormDialog>
  );
}
