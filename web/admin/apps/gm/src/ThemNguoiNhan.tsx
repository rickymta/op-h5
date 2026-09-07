// Hộp thêm người nhận: tìm từng tên, hoặc dán cả danh sách từ phiếu hỗ trợ.
//
// Việc hay gặp nhất của gửi thư là đền bù cho một NHÓM — phiếu đưa mười cái tên. Bắt người
// trực về trang tra nhân vật mười lần là mười lần có thể mở nhầm người trùng tên. Ở đây tra
// hết một lượt rồi bày ra bảng: ai thấy, ai không thấy, ai có nhiều kết quả — người trực
// nhìn toàn bộ danh sách trước khi bấm thêm, không phải từng người một.
//
// Chỉ tra trên máy chủ đang chọn ở thanh trên. Một đợt thư là một máy chủ: trộn máy chủ
// trong cùng một danh sách là cách nhanh nhất để gửi nhầm sang máy chủ khác.

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatInt } from "@op/admin-ui";
import { api, type Role } from "./api";

type TraKetQua =
  | { ten: string; trangThai: "thay"; role: Role }
  | { ten: string; trangThai: "khong_thay" }
  | { ten: string; trangThai: "nhieu"; roles: Role[] }
  | { ten: string; trangThai: "loi"; loi: string };

async function traTen(srv: string, ten: string): Promise<Role[]> {
  const r = await api.get<{ roles: Role[] }>(
    `/admin-portal/api/roles?srv=${encodeURIComponent(srv)}&name=${encodeURIComponent(ten)}`,
  );
  return r.roles;
}

export function ThemNguoiNhan({
  open,
  srv,
  daCo,
  onClose,
  onThem,
}: {
  open: boolean;
  srv: string;
  daCo: Role[];
  onClose: () => void;
  onThem: (roles: Role[]) => void;
}) {
  const [tab, setTab] = useState<"tim" | "dan">("tim");
  const [ten, setTen] = useState("");
  const [ketTim, setKetTim] = useState<Role[] | null>(null);
  const [dangTim, setDangTim] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const [danhSach, setDanhSach] = useState("");
  const [ketDan, setKetDan] = useState<TraKetQua[] | null>(null);
  const [dangTra, setDangTra] = useState(false);

  const daChon = (r: Role) => daCo.some((x) => x.roleId === r.roleId);

  const tim = async () => {
    const t = ten.trim();
    if (!t) return;
    setDangTim(true);
    setLoi(null);
    try {
      setKetTim(await traTen(srv, t));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tra được.");
    } finally {
      setDangTim(false);
    }
  };

  const tra = async () => {
    // Một dòng một tên; bỏ dòng trống và dòng trùng. Cho phép "tên, ghi chú" từ bảng tính:
    // chỉ lấy phần trước dấu phẩy hoặc tab.
    const ds = Array.from(
      new Set(
        danhSach
          .split(/\r?\n/)
          .map((l) => l.split(/[,\t]/)[0]?.trim() ?? "")
          .filter(Boolean),
      ),
    );
    if (ds.length === 0) return;
    setDangTra(true);
    const ra: TraKetQua[] = [];
    for (const t of ds) {
      try {
        const roles = await traTen(srv, t);
        // Dịch vụ tra tên trả về cả tên GẦN GIỐNG; chỉ nhận đúng tên (không phân biệt hoa
        // thường). Một tên đúng → thấy; nhiều tên đúng → để người trực chọn, không tự đoán.
        const dung = roles.filter(
          (r) => r.roleName.toLowerCase() === t.toLowerCase() || (r.idUsername ?? "").toLowerCase() === t.toLowerCase(),
        );
        if (dung.length === 1) ra.push({ ten: t, trangThai: "thay", role: dung[0]! });
        else if (dung.length > 1) ra.push({ ten: t, trangThai: "nhieu", roles: dung });
        else ra.push({ ten: t, trangThai: "khong_thay" });
      } catch (e) {
        ra.push({ ten: t, trangThai: "loi", loi: e instanceof Error ? e.message : "lỗi" });
      }
    }
    setKetDan(ra);
    setDangTra(false);
  };

  const themTatCaThay = () => {
    const roles = (ketDan ?? [])
      .filter((k): k is Extract<TraKetQua, { trangThai: "thay" }> => k.trangThai === "thay")
      .map((k) => k.role)
      .filter((r) => !daChon(r));
    onThem(roles);
    setKetDan(null);
    setDanhSach("");
    onClose();
  };

  const soThay = (ketDan ?? []).filter((k) => k.trangThai === "thay").length;
  const soKhong = (ketDan ?? []).filter((k) => k.trangThai !== "thay").length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>Thêm người nhận · máy chủ {srv}</DialogTitle>
      <Tabs value={tab} onChange={(_, v: "tim" | "dan") => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab value="tim" label="Tìm từng tên" />
        <Tab value="dan" label="Dán danh sách" />
      </Tabs>
      <DialogContent>
        {tab === "tim" && (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Tên nhân vật hoặc tài khoản ID"
                value={ten}
                onChange={(e) => setTen(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void tim();
                  }
                }}
                autoFocus
                fullWidth
              />
              <Button variant="contained" onClick={() => void tim()} disabled={!ten.trim() || dangTim} sx={{ minWidth: 96 }}>
                {dangTim ? <CircularProgress size={18} color="inherit" /> : "Tìm"}
              </Button>
            </Stack>
            {loi && <Alert severity="error">{loi}</Alert>}
            {ketTim && ketTim.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Không có nhân vật nào tên như vậy trên {srv}.
              </Typography>
            )}
            {ketTim && ketTim.length > 0 && (
              <List dense disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
                {ketTim.map((r) => (
                  <ListItemButton
                    key={r.roleId}
                    disabled={daChon(r)}
                    onClick={() => {
                      onThem([r]);
                      setKetTim(null);
                      setTen("");
                    }}
                  >
                    <ListItemText
                      primary={r.roleName}
                      secondary={`tài khoản ID: ${r.idUsername ?? "?"} · cấp ${r.level} · VIP ${r.vipLevel} · lực chiến ${formatInt(r.power)} · ${r.roleId}`}
                    />
                    {daChon(r) && <Chip size="small" label="đã có" />}
                  </ListItemButton>
                ))}
              </List>
            )}
          </Stack>
        )}

        {tab === "dan" && (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              size="small"
              label="Mỗi dòng một tên"
              value={danhSach}
              onChange={(e) => setDanhSach(e.target.value)}
              multiline
              minRows={5}
              placeholder={"Duyen\nquandh\n…"}
              helperText="Dán từ phiếu hỗ trợ hay bảng tính; có dấu phẩy hoặc tab thì chỉ lấy cột đầu."
              fullWidth
            />
            <Box>
              <Button variant="contained" onClick={() => void tra()} disabled={!danhSach.trim() || dangTra}>
                {dangTra ? "Đang tra…" : "Tra tên trên máy chủ"}
              </Button>
            </Box>
            {ketDan && (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
                {ketDan.map((k) => (
                  <Stack
                    key={k.ten}
                    direction="row"
                    spacing={1}
                    sx={{ px: 1.5, py: 0.75, alignItems: "center", borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 140 }}>
                      {k.ten}
                    </Typography>
                    {k.trangThai === "thay" && (
                      <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                        cấp {k.role.level} · VIP {k.role.vipLevel} · {k.role.roleId}
                        {daChon(k.role) ? " · đã có trong danh sách" : ""}
                      </Typography>
                    )}
                    {k.trangThai === "khong_thay" && <Chip size="small" color="warning" label="không thấy" />}
                    {k.trangThai === "nhieu" && (
                      <Chip size="small" color="warning" label={`${k.roles.length} nhân vật cùng tên — tìm từng tên để chọn`} />
                    )}
                    {k.trangThai === "loi" && <Chip size="small" color="error" label={k.loi} />}
                    {k.trangThai === "thay" && <Chip size="small" color="success" label="thấy" />}
                  </Stack>
                ))}
              </Box>
            )}
            {ketDan && soKhong > 0 && (
              <Alert severity="warning">
                {soKhong} tên chưa tra được sẽ KHÔNG được thêm. Sửa tên rồi tra lại, hoặc thêm {soThay} tên đã thấy trước.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>
        {tab === "dan" && (
          <Button variant="contained" onClick={themTatCaThay} disabled={soThay === 0}>
            Thêm {soThay} người đã thấy
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
