// Ô chọn quà: gõ tên món, chọn, đặt số lượng — thay cho việc tự gõ chuỗi `type:id:count`.
//
// VÌ SAO ĐỔI
// ----------
// Bản trước chỉ có một ô chữ và một dòng ví dụ. Muốn biết mã của một món, người trực phải mở
// một bảng tra khác rồi chép sang. Bảng đó (`gmhanglong/gm/item.txt` của bản PHP cũ) lại là
// của MỘT BẢN KHÁC của game: `3:100001` bảng đó gọi là "Tiến giai thạch" còn máy chủ đang
// chạy gọi là "Đan tiến giai", và toàn bộ tên tướng thì lệch hẳn một hệ. Nên việc "đi tìm
// rồi chép sang" không chỉ chậm — nó còn dẫn tới gửi nhầm món.
//
// Nay danh mục do máy chủ phát ra, đọc từ chính bảng cấu hình mà game nạp (xem
// platform/internal/gmops/danhmuc.go). Gõ "kim cương" hay gõ thẳng "100022" đều ra.
//
// Ô "sửa tay" vẫn còn: phiếu hỗ trợ hay kèm sẵn chuỗi quà, dán vào nhanh hơn chọn lại từng
// món. Dán xong máy chủ tra tên ngay để người trực đối chiếu trước khi gửi.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { formatInt } from "@op/admin-ui";
import { api, type MucQua, type NhomQua } from "./api";
import { REWARD_RE } from "./reward";

/** Một dòng quà đã chọn. `ten` giữ lại để hiện, không gửi đi. */
export interface DongQua {
  loai: number;
  ma: number;
  ten: string;
  nhan: string;
  soLuong: number;
}

/**
 * Đổi một chuỗi quà có sẵn thành các dòng, tên do máy chủ tra. Dùng cho "Dán chuỗi có sẵn"
 * và cho "Dùng lại" một thư trong lịch sử — một đường, không hai bản.
 */
export async function docChuoiQua(reward: string, nhom: NhomQua[]): Promise<DongQua[]> {
  const t = reward.trim();
  if (!t || !REWARD_RE.test(t)) return [];
  const r = await api.get<{ mon: { loai: number; ma: number; so_luong: number; ten: string; nhan: string }[] }>(
    `/admin-portal/api/reward?ma=${encodeURIComponent(t)}`,
  );
  return r.mon.map((m) => ({
    loai: m.loai,
    ma: m.ma,
    ten: m.ten,
    nhan: m.nhan || (nhom.find((n) => n.loai === m.loai)?.nhan ?? `Loại ${m.loai}`),
    soLuong: m.so_luong,
  }));
}

/** Ghép các dòng thành chuỗi máy chủ nhận. Dòng số lượng <= 0 bị bỏ. */
export function ghepQua(dong: DongQua[]): string {
  return dong
    .filter((d) => d.soLuong > 0)
    .map((d) => `${d.loai}:${d.ma}:${d.soLuong}`)
    .join("#");
}

/** Trì hoãn từ khoá: gõ tên dài không nên thành một lượt gọi cho mỗi phím. */
function useTre<T>(v: T, ms = 250): T {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return x;
}

function nhanCua(nhom: NhomQua[], loai: number): string {
  return nhom.find((n) => n.loai === loai)?.nhan ?? `Loại ${loai}`;
}

export function ChonQua({
  nhom,
  dong,
  datDong,
  canhBao,
}: {
  nhom: NhomQua[];
  dong: DongQua[];
  datDong: (d: DongQua[]) => void;
  /** Câu cảnh báo cho một dòng (số lượng vượt ngưỡng…); trả null khi không có gì. */
  canhBao?: (d: DongQua) => string | null;
}) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [loc, setLoc] = useState(0); // 0 = mọi nhóm
  const [suaTay, setSuaTay] = useState(false);
  const [tho, setTho] = useState("");
  const tre = useTre(tuKhoa);

  const tim = useQuery({
    queryKey: ["gm-catalog", tre, loc],
    queryFn: () =>
      api.get<{ muc: MucQua[] }>(
        `/admin-portal/api/catalog?q=${encodeURIComponent(tre)}&loai=${loc}&limit=40`,
      ),
    enabled: tre.trim().length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const chuoi = useMemo(() => ghepQua(dong), [dong]);

  // Chuỗi dán tay: nhờ máy chủ tra tên rồi dựng lại thành các dòng, để phần xem trước và
  // phần chọn tay đi qua đúng một đường.
  const doc = useQuery({
    queryKey: ["gm-reward", tho],
    queryFn: () =>
      api.get<{ mon: { raw: string; loai: number; ma: number; so_luong: number; ten: string; nhan: string }[] }>(
        `/admin-portal/api/reward?ma=${encodeURIComponent(tho.trim())}`,
      ),
    enabled: suaTay && REWARD_RE.test(tho.trim()),
    retry: false,
  });

  const them = (m: MucQua | null) => {
    if (!m) return;
    setTuKhoa("");
    const co = dong.findIndex((d) => d.loai === m.loai && d.ma === m.ma);
    if (co >= 0) {
      // Chọn lại món đã có thì cộng thêm một, không tạo dòng thứ hai cùng mã: máy chủ nhận
      // được hai lần cùng một mã thì chỉ một lần có hiệu lực, rất khó nhìn ra khi soát lại.
      datDong(dong.map((d, j) => (j === co ? { ...d, soLuong: d.soLuong + 1 } : d)));
      return;
    }
    datDong([...dong, { loai: m.loai, ma: m.ma, ten: m.ten, nhan: nhanCua(nhom, m.loai), soLuong: 1 }]);
  };

  const doSo = (i: number, v: string) => {
    const n = Number(v.replace(/\D/g, "")) || 0;
    datDong(dong.map((d, j) => (j === i ? { ...d, soLuong: n } : d)));
  };

  const apDungTho = () => {
    const mon = doc.data?.mon ?? [];
    datDong(
      mon.map((m) => ({
        loai: m.loai,
        ma: m.ma,
        ten: m.ten,
        nhan: m.nhan || nhanCua(nhom, m.loai),
        soLuong: m.so_luong,
      })),
    );
    setSuaTay(false);
    setTho("");
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", gap: 0.75 }}>
        <Chip
          size="small"
          label="Tất cả"
          color={loc === 0 ? "primary" : "default"}
          variant={loc === 0 ? "filled" : "outlined"}
          onClick={() => setLoc(0)}
        />
        {nhom.map((n) => (
          <Chip
            key={n.loai}
            size="small"
            label={n.nhan}
            color={loc === n.loai ? "primary" : "default"}
            variant={loc === n.loai ? "filled" : "outlined"}
            onClick={() => setLoc(loc === n.loai ? 0 : n.loai)}
          />
        ))}
      </Stack>

      <Autocomplete<MucQua>
        options={tim.data?.muc ?? []}
        filterOptions={(x) => x} // máy chủ đã lọc và xếp hạng; lọc lại ở đây sẽ giấu mất kết quả
        getOptionLabel={(o) => o.ten}
        isOptionEqualToValue={(a, b) => a.loai === b.loai && a.ma === b.ma}
        inputValue={tuKhoa}
        onInputChange={(_, v, ly) => ly !== "reset" && setTuKhoa(v)}
        value={null}
        onChange={(_, v) => them(v)}
        loading={tim.isFetching}
        noOptionsText={tuKhoa.trim() ? "Không có món nào tên hoặc mã như vậy." : "Gõ tên món hoặc mã."}
        renderOption={(props, o) => {
          const { key, ...rest } = props as { key?: string } & Record<string, unknown>;
          return (
            <Box component="li" key={`${o.loai}:${o.ma}`} {...rest} sx={{ display: "block !important", py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {o.ten}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {nhanCua(nhom, o.loai)}
                {o.phu ? ` · ${o.phu}` : ""} · mã{" "}
                <span style={{ fontFamily: "ui-monospace, monospace" }}>
                  {o.loai}:{o.ma}
                </span>
              </Typography>
            </Box>
          );
        }}
        renderInput={(p) => (
          <TextField
            {...p}
            size="small"
            label="Tìm món quà"
            placeholder="gõ tên trong game, hoặc mã — ví dụ: kim cương, 100022"
            helperText="Tên lấy từ bảng cấu hình máy chủ đang chạy, đúng thứ người chơi thấy trong game."
            slotProps={{
              input: {
                ...p.InputProps,
                endAdornment: (
                  <>
                    {tim.isFetching ? <CircularProgress size={16} /> : null}
                    {p.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />

      {dong.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1.5 }}>
          {dong.map((d, i) => (
            <Stack
              key={`${d.loai}:${d.ma}`}
              direction="row"
              spacing={1.5}
              sx={{
                px: 1.5,
                py: 1,
                alignItems: "center",
                borderTop: i === 0 ? 0 : 1,
                borderColor: "divider",
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {d.ten || `Chưa tra được tên · mã ${d.loai}:${d.ma}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {d.nhan} · <span style={{ fontFamily: "ui-monospace, monospace" }}>{d.loai}:{d.ma}</span>
                </Typography>
              </Box>
              <TextField
                size="small"
                label="Số lượng"
                value={d.soLuong === 0 ? "" : String(d.soLuong)}
                onChange={(e) => doSo(i, e.target.value)}
                error={d.soLuong <= 0 || !!canhBao?.(d)}
                // Số có dấu chấm ngay dưới ô: "50000" và "5000" nhìn gần như nhau, còn
                // "= 50.000" và "= 5.000" thì không. Đây là chỗ thừa một số 0 hay lọt nhất.
                helperText={canhBao?.(d) ?? (d.soLuong >= 1000 ? `= ${formatInt(d.soLuong)}` : " ")}
                inputMode="numeric"
                sx={{ width: 150 }}
              />
              <Tooltip title="Bỏ món này">
                <IconButton size="small" onClick={() => datDong(dong.filter((_, j) => j !== i))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Paper>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
          {chuoi || "chưa chọn món nào"}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" startIcon={<EditNoteIcon />} onClick={() => setSuaTay((v) => !v)}>
          {suaTay ? "Đóng ô dán" : "Dán chuỗi có sẵn"}
        </Button>
      </Stack>

      {suaTay && (
        <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="Chuỗi quà"
            value={tho}
            onChange={(e) => setTho(e.target.value)}
            placeholder="0:1:5000#3:100022:10"
            error={tho.trim() !== "" && !REWARD_RE.test(tho.trim())}
            helperText={
              tho.trim() !== "" && !REWARD_RE.test(tho.trim())
                ? "Sai định dạng. Phải là type:id:count, nhiều món nối bằng #."
                : "Dán chuỗi từ phiếu hỗ trợ; máy chủ sẽ tra tên rồi thay danh sách bên trên."
            }
            slotProps={{ input: { sx: { fontFamily: "ui-monospace, monospace" } } }}
          />
          {doc.data && (
            <Box component="ul" sx={{ mt: 1, mb: 1, pl: 2.5 }}>
              {doc.data.mon.map((m) => (
                <Box component="li" key={m.raw}>
                  <Typography variant="body2" component="span">
                    <b>{m.ten || `Chưa tra được tên · ${m.raw}`}</b> × {formatInt(m.so_luong)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!doc.data || doc.data.mon.length === 0}
            onClick={apDungTho}
          >
            Thay danh sách bằng chuỗi này
          </Button>
        </Paper>
      )}
    </Box>
  );
}
