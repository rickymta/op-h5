// Thanh chọn game + máy chủ, nằm ngay dưới AppBar và KHÔNG đổi khi chuyển trang.
//
// Đây là chỗ khác bản cũ nhiều nhất. Bản cũ để ô chọn máy chủ nằm trong form tìm kiếm, nên
// mỗi màn hình lại có một "máy chủ" riêng của nó. Với ca trực xử lý phiếu liên tiếp, đó là
// đường thẳng dẫn tới nạp đúng gói cho đúng tên nhưng sai máy chủ. Ở đây máy chủ là bối
// cảnh của cả phiên làm việc: chọn một lần, luôn nhìn thấy, và đổi nó thì bỏ luôn nhân vật
// đang chọn (xem `chon.tsx`).

import { useEffect } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLocation } from "wouter";
import type { GMMeta } from "./api";
import { useChon } from "./chon";

export function ThanhChon({ meta, dangTai }: { meta?: GMMeta; dangTai: boolean }) {
  const [, go] = useLocation();
  const { game, srv, role, datGame, datSrv, datRole } = useChon();

  const games = meta?.games ?? [];
  const servers = meta?.servers ?? [];
  // Chưa chọn thì lấy giá trị máy chủ đề nghị; giữ lựa chọn cũ nếu nó vẫn còn trong danh sách.
  const gameHT = games.some((g) => g.code === game) ? game : (meta?.game ?? games[0]?.code ?? "");
  const srvHT = servers.some((s) => s.code === srv) ? srv : (servers[0]?.code ?? "");

  // Ghi giá trị đã chốt trở lại bối cảnh, để mọi trang đọc đúng một chỗ thay vì trang nào
  // cũng phải tự đoán "chưa chọn thì lấy cái đầu tiên". Chỉ chạy khi meta đã về: lúc đang
  // tải, `servers` còn là của game trước, ghi vào là gán nhầm máy chủ khác game.
  useEffect(() => {
    if (dangTai || !meta) return;
    if (gameHT && game !== gameHT) datGame(gameHT);
  }, [dangTai, meta, game, gameHT, datGame]);

  useEffect(() => {
    if (dangTai || !meta || game !== gameHT) return;
    if (srv !== srvHT) datSrv(srvHT);
  }, [dangTai, meta, game, gameHT, srv, srvHT, datSrv]);

  return (
    <Box
      sx={{
        position: "sticky",
        top: { xs: 56, md: 60 },
        zIndex: 2,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1.5,
        px: { xs: 2, md: 3 },
        py: 1.25,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {dangTai ? (
        <>
          <Skeleton variant="rounded" width={180} height={40} />
          <Skeleton variant="rounded" width={200} height={40} />
        </>
      ) : (
        <>
          <TextField
            select
            // Theme đặt `fullWidth: true` cho mọi TextField — hợp với biểu mẫu, sai với thanh
            // bối cảnh này, nên tắt tại chỗ và cho bề rộng cố định.
            fullWidth={false}
            size="small"
            label="Game"
            value={gameHT}
            onChange={(e) => datGame(e.target.value)}
            sx={{ width: { xs: "100%", sm: 220 } }}
            // Một game thì không có gì để chọn — vẫn hiện để người trực biết mình đang ở đâu.
            disabled={games.length <= 1}
          >
            {games.length === 0 && <MenuItem value="">(không có game)</MenuItem>}
            {games.map((g) => (
              <MenuItem key={g.code} value={g.code}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth={false}
            size="small"
            label="Máy chủ"
            value={srvHT}
            onChange={(e) => datSrv(e.target.value)}
            sx={{ width: { xs: "100%", sm: 260 } }}
            helperText={servers.length === 0 ? "Game này chưa khai máy chủ nào." : undefined}
            error={servers.length === 0}
          >
            {servers.length === 0 && <MenuItem value="">(chưa có)</MenuItem>}
            {servers.map((s) => (
              <MenuItem key={s.code} value={s.code}>
                {s.name} · {s.code}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      {role ? (
        <Chip
          color="primary"
          variant="outlined"
          label={`${role.roleName} · ${role.srvCode}`}
          onClick={() => go("/nhan-vat")}
          onDelete={() => datRole(null)}
          sx={{ maxWidth: 320 }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          Chưa chọn nhân vật
        </Typography>
      )}
    </Box>
  );
}
