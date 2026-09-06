// Gửi thư kèm quà cho một hoặc nhiều nhân vật.
//
// Màn hình được sắp theo VIỆC của ca trực, không theo API:
//
//   1. Ai nhận — bắt đầu từ nhân vật đang chọn, thêm người bằng tìm tên hay dán danh sách từ
//      phiếu. Một đợt là một máy chủ. Vẫn không có "gửi toàn máy chủ": danh sách tên là thứ
//      đọc được và chịu trách nhiệm từng dòng; cả máy chủ thì không.
//   2. Nói gì — mẫu thư điền sẵn, `{ten}` thay bằng tên từng người nhận.
//   3. Kèm gì — ô tìm quà (ChonQua); số lượng vượt ngưỡng thì bắt tick xác nhận, và máy chủ
//      kiểm lại cùng ngưỡng đó.
//   4. Nhìn thấy gì — xem trước đúng như hòm thư người chơi, rồi mới tới hộp xác nhận.
//   5. Đã gửi gì — lịch sử ngay bên cạnh: người này hôm qua đã nhận đền bù chưa, ai gửi;
//      và "Dùng lại" để thư hôm nay giống thư hôm qua chỉ khác người nhận.
//
// Sau khi gửi, biểu mẫu KHÔNG tự xoá sạch: hiện bảng kết quả từng người, và cho chọn giữ
// nội dung để đổi người nhận, hay giữ người nhận để gửi thư khác.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import { ConfirmDialog, Page, formatInt, useToast } from "@op/admin-ui";
import {
  api,
  canGM,
  loiConsole,
  type GuiThuResult,
  type Me,
  type NguongQua,
  type NhomQua,
  type Role,
  type ThuDaGui,
} from "../api";
import { useChon } from "../chon";
import { ChonQua, docChuoiQua, ghepQua, type DongQua } from "../ChonQua";
import { LichSuThu } from "../LichSuThu";
import { MAU_THU } from "../mau-thu";
import { ThemNguoiNhan } from "../ThemNguoiNhan";

const TIEU_DE_MAC_DINH = "Thư từ quản trị";

function thayTen(s: string, ten: string): string {
  return s.replaceAll("{ten}", ten);
}

/** Xem trước đúng như hòm thư trong game: tiêu đề, người gửi, nội dung, quà. */
function XemNhuTrongGame({ tieuDe, noiDung, dong, ten }: { tieuDe: string; noiDung: string; dong: DongQua[]; ten: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Người chơi sẽ thấy{ten ? ` (thư cho ${ten})` : ""}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
        {thayTen(tieuDe.trim() || TIEU_DE_MAC_DINH, ten)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Từ: Quản trị
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 1.5 }}>
        {noiDung.trim() ? thayTen(noiDung, ten) : <i style={{ opacity: 0.6 }}>(không có nội dung)</i>}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        Đính kèm
      </Typography>
      {dong.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Chưa có quà — thư không thể gửi khi không đính kèm gì.
        </Typography>
      ) : (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
          {dong.map((d) => (
            <Chip key={`${d.loai}:${d.ma}`} size="small" label={`${d.ten || `${d.loai}:${d.ma}`} × ${formatInt(d.soLuong)}`} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export function GuiThu({ me, nhomQua, nguong }: { me: Me; nhomQua: NhomQua[]; nguong?: { vi: NguongQua[]; mon_toi_da: number } }) {
  const [, go] = useLocation();
  const { show } = useToast();
  const qc = useQueryClient();
  const { srv, role } = useChon();
  const duocGhi = canGM(me);

  const [nguoiNhan, setNguoiNhan] = useState<Role[]>(() => (role ? [role] : []));
  const [moThem, setMoThem] = useState(false);
  const [mau, setMau] = useState<string>("");
  const [tieuDe, setTieuDe] = useState(TIEU_DE_MAC_DINH);
  const [noiDung, setNoiDung] = useState("");
  const [dong, setDong] = useState<DongQua[]>([]);
  const [xacNhanLon, setXacNhanLon] = useState(false);
  const [hoi, setHoi] = useState(false);
  const [ketQua, setKetQua] = useState<GuiThuResult | null>(null);

  // Nhân vật ở thanh trên đổi (mở người khác từ trang tra) thì bắt đầu lại danh sách nhận
  // từ người đó — nhưng không đụng vào nội dung đang soạn.
  useEffect(() => {
    if (role && !nguoiNhan.some((r) => r.roleId === role.roleId)) setNguoiNhan((cu) => [role, ...cu]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.roleId]);

  // Đổi máy chủ thì danh sách người nhận của máy chủ cũ vô nghĩa.
  useEffect(() => {
    setNguoiNhan((cu) => cu.filter((r) => r.srvCode === srv));
  }, [srv]);

  const qua = useMemo(() => ghepQua(dong), [dong]);
  const thieuSo = dong.some((d) => d.soLuong <= 0);

  // Ngưỡng: cùng con số máy chủ kiểm. Không có meta thì coi như không có ngưỡng ở trang —
  // máy chủ vẫn chặn và trả needs_confirm, giao diện xử lý ở onError.
  const canhBao = (d: DongQua): string | null => {
    if (!nguong) return null;
    if (d.loai === 0) {
      const n = nguong.vi.find((x) => x.ma === d.ma);
      return n && d.soLuong > n.toi_da ? `vượt ngưỡng ${formatInt(n.toi_da)} — cần xác nhận` : null;
    }
    return d.soLuong > nguong.mon_toi_da ? `vượt ngưỡng ${formatInt(nguong.mon_toi_da)} — cần xác nhận` : null;
  };
  const vuotNguong = dong.filter((d) => canhBao(d) !== null);

  const hopLe =
    nguoiNhan.length > 0 && qua !== "" && !thieuSo && tieuDe.trim().length <= 120 && noiDung.length <= 1000;

  const gui = useMutation({
    mutationFn: () =>
      api.post<GuiThuResult>("/admin-portal/api/mail", {
        recipients: nguoiNhan.map((r) => ({ srv: r.srvCode, role: r.roleId, role_name: r.roleName })),
        title: tieuDe.trim(),
        content: noiDung,
        reward: qua,
        confirm_large: vuotNguong.length > 0 && xacNhanLon,
      }),
    onSuccess: (d) => {
      show(d.message, d.failed + d.skipped > 0 ? "warning" : "success");
      setHoi(false);
      setXacNhanLon(false);
      setKetQua(d);
      void qc.invalidateQueries({ queryKey: ["gm-mail-history"] });
    },
    onError: (e) => {
      const { text, nang } = loiConsole(e);
      show(text, nang ? "error" : "warning");
      setHoi(false);
      void qc.invalidateQueries({ queryKey: ["gm-mail-history"] });
    },
  });

  const chonMau = (ma: string) => {
    setMau(ma);
    const m = MAU_THU.find((x) => x.ma === ma);
    if (!m) return;
    setTieuDe(m.tieuDe);
    setNoiDung(m.noiDung);
  };

  const dungLai = async (t: ThuDaGui) => {
    setMau("");
    setTieuDe(t.title || TIEU_DE_MAC_DINH);
    setNoiDung(t.content);
    try {
      setDong(await docChuoiQua(t.reward, nhomQua));
      show("Đã điền lại thư — soát người nhận rồi gửi.", "info");
    } catch (e) {
      show(loiConsole(e).text, "warning");
    }
  };

  const boNguoi = (id: string) => setNguoiNhan((cu) => cu.filter((r) => r.roleId !== id));

  // Sau khi gửi: hai đường đi tiếp, không tự xoá gì.
  const giuNoiDungDoiNguoi = () => {
    setKetQua(null);
    setNguoiNhan([]);
  };
  const giuNguoiGuiThuKhac = () => {
    setKetQua(null);
    setDong([]);
    setNoiDung("");
    setTieuDe(TIEU_DE_MAC_DINH);
    setMau("");
  };
  const guiLaiChuaGui = () => {
    if (!ketQua) return;
    const con = new Set(ketQua.results.filter((k) => !k.ok).map((k) => k.role));
    setNguoiNhan((cu) => cu.filter((r) => con.has(r.roleId)));
    setKetQua(null);
  };

  const nguoiDau = nguoiNhan[0];

  return (
    <Page
      title="Gửi thư kèm quà"
      sub={
        nguoiNhan.length === 0
          ? `Máy chủ ${srv || "—"} · chưa có người nhận`
          : nguoiNhan.length === 1
            ? `Cho ${nguoiDau?.roleName} · ${srv}`
            : `Cho ${nguoiNhan.length} nhân vật · ${srv}`
      }
      breadcrumb={[{ label: "Tra nhân vật", href: "/admin-portal/" }, { label: "Gửi thư kèm quà" }]}
      maxWidth={1440}
    >
      <Alert severity="warning" sx={{ mb: 2 }}>
        <b>Quà trong thư là giá trị thật trong game.</b> Thư gửi đi rồi thì phải nhờ người chơi
        không nhận mới thu hồi được. Gửi theo danh sách tên, không có đường gửi cả máy chủ.
      </Alert>

      {ketQua && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {ketQua.message}
          </Typography>
          <Table size="small" sx={{ mb: 1.5 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nhân vật</TableCell>
                <TableCell>Máy chủ</TableCell>
                <TableCell>Kết quả</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ketQua.results.map((k) => (
                <TableRow key={`${k.srv}/${k.role}`}>
                  <TableCell>{k.role_name || k.role}</TableCell>
                  <TableCell>{k.srv}</TableCell>
                  <TableCell>
                    {k.ok ? (
                      <Chip size="small" color="success" variant="outlined" label={k.mail_id ? `đã gửi · phiếu #${k.mail_id}` : "đã gửi"} />
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Chip size="small" color={k.error === "skipped" ? "default" : "error"} variant="outlined" label={k.error === "skipped" ? "chưa gửi" : "hỏng"} />
                        <Typography variant="caption" color="text.secondary">
                          {k.message}
                        </Typography>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {ketQua.failed + ketQua.skipped > 0 && (
              <Button variant="contained" onClick={guiLaiChuaGui}>
                Gửi lại {ketQua.failed + ketQua.skipped} người chưa nhận
              </Button>
            )}
            <Button variant="outlined" onClick={giuNoiDungDoiNguoi}>
              Giữ nội dung, đổi người nhận
            </Button>
            <Button variant="outlined" onClick={giuNguoiGuiThuKhac}>
              Giữ người nhận, soạn thư khác
            </Button>
          </Stack>
        </Paper>
      )}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 760px) minmax(320px, 1fr)" }, alignItems: "start" }}>
        <Paper
          variant="outlined"
          component="form"
          sx={{ p: 2 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (hopLe && duocGhi) setHoi(true);
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle2">Người nhận</Typography>
                <Chip size="small" label={`${nguoiNhan.length}`} color={nguoiNhan.length > 0 ? "primary" : "default"} variant="outlined" />
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setMoThem(true)} disabled={!srv}>
                  Thêm người nhận
                </Button>
              </Stack>
              {nguoiNhan.length === 0 ? (
                <Alert severity="info" action={<Button size="small" onClick={() => go("/")}>Tra nhân vật</Button>}>
                  Chưa có ai. Mở nhân vật từ trang tra, hoặc bấm <b>Thêm người nhận</b> để tìm tên hay dán cả danh sách.
                </Alert>
              ) : (
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  {nguoiNhan.map((r) => (
                    <Chip
                      key={r.roleId}
                      label={`${r.roleName} · cấp ${r.level}`}
                      onDelete={() => boNguoi(r.roleId)}
                      title={r.roleId}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Mẫu thư
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                {MAU_THU.map((m) => (
                  <Chip
                    key={m.ma}
                    size="small"
                    label={m.nhan}
                    color={mau === m.ma ? "primary" : "default"}
                    variant={mau === m.ma ? "filled" : "outlined"}
                    onClick={() => chonMau(m.ma)}
                  />
                ))}
              </Stack>
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  label="Tiêu đề"
                  value={tieuDe}
                  onChange={(e) => setTieuDe(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Nội dung"
                  value={noiDung}
                  onChange={(e) => setNoiDung(e.target.value)}
                  multiline
                  minRows={4}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  helperText={`${noiDung.length}/1000 · viết {ten} để máy chủ thay bằng tên từng người nhận`}
                  fullWidth
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Quà đính kèm
              </Typography>
              <ChonQua nhom={nhomQua} dong={dong} datDong={setDong} canhBao={canhBao} />
              {thieuSo && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Có món đang để số lượng 0 — điền số hoặc bỏ món đó ra.
                </Alert>
              )}
              {vuotNguong.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  Có {vuotNguong.length} món vượt ngưỡng thường ngày. Vẫn gửi được, nhưng phải tick xác nhận ở bước cuối — và máy chủ sẽ từ chối nếu thiếu tick.
                </Alert>
              )}
            </Box>

            <XemNhuTrongGame tieuDe={tieuDe} noiDung={noiDung} dong={dong} ten={nguoiDau?.roleName ?? ""} />

            <Box>
              <Button type="submit" variant="contained" disabled={!hopLe || !duocGhi || gui.isPending}>
                Xem lại rồi gửi{nguoiNhan.length > 1 ? ` cho ${nguoiNhan.length} người` : ""}
              </Button>
              {!duocGhi && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                  Vai trò của bạn chỉ được xem.
                </Typography>
              )}
            </Box>
          </Stack>
        </Paper>

        <LichSuThu srv={srv} role={nguoiNhan.length === 1 ? (nguoiDau?.roleId ?? "") : ""} roleName={nguoiNhan.length === 1 ? (nguoiDau?.roleName ?? "") : ""} onDungLai={(t) => void dungLai(t)} />
      </Box>

      <ThemNguoiNhan
        open={moThem}
        srv={srv}
        daCo={nguoiNhan}
        onClose={() => setMoThem(false)}
        onThem={(roles) => {
          setNguoiNhan((cu) => {
            const co = new Set(cu.map((r) => r.roleId));
            return [...cu, ...roles.filter((r) => !co.has(r.roleId))];
          });
          if (roles.length > 0) show(`Đã thêm ${roles.length} người nhận.`, "info");
        }}
      />

      <ConfirmDialog
        open={hoi}
        danger
        title={nguoiNhan.length > 1 ? `Gửi ${nguoiNhan.length} thư?` : "Xác nhận gửi thư"}
        confirmLabel={nguoiNhan.length > 1 ? `Gửi ${nguoiNhan.length} thư` : "Gửi thư"}
        busy={gui.isPending}
        onClose={() => setHoi(false)}
        onConfirm={() => {
          if (vuotNguong.length > 0 && !xacNhanLon) return;
          gui.mutate();
        }}
        message={
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Người nhận · {srv}
              </Typography>
              <Typography variant="body2">{nguoiNhan.map((r) => r.roleName).join(", ")}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Tiêu đề
              </Typography>
              <Typography variant="body2">
                <b>{tieuDe.trim() || TIEU_DE_MAC_DINH}</b>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Quà — mỗi người nhận đủ phần này
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {dong.map((d) => (
                  <Box component="li" key={`${d.loai}:${d.ma}`}>
                    <Typography variant="body2" component="span">
                      <b>{d.ten || `${d.loai}:${d.ma}`}</b> × {formatInt(d.soLuong)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontFamily: "ui-monospace, monospace" }}>
                {qua}
              </Typography>
            </Box>
            {vuotNguong.length > 0 && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                <FormControlLabel
                  control={<Checkbox checked={xacNhanLon} onChange={(e) => setXacNhanLon(e.target.checked)} size="small" />}
                  label={
                    <Typography variant="body2">
                      Tôi đã đối chiếu phiếu: {vuotNguong.map((d) => `${d.ten} ×${formatInt(d.soLuong)}`).join(", ")} là đúng số.
                    </Typography>
                  }
                />
              </Alert>
            )}
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Thư vào hòm thư của người chơi ngay. Nhật ký ghi tên tài khoản của bạn cho từng thư.
            </Alert>
          </Stack>
        }
      />
    </Page>
  );
}
