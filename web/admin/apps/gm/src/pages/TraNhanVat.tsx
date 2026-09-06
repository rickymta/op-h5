// Màn hình đầu tiên: tìm nhân vật theo tên.
//
// Mọi phiếu hỗ trợ đều bắt đầu bằng một cái tên người chơi tự gõ vào ô liên hệ, và tên là
// thứ DUY NHẤT đổi ra `roleId` được (qua dịch vụ statistic). Nên đây là cửa vào của cả công
// cụ: chưa có nhân vật thì không có thao tác nào có nghĩa.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { Grid, Page, formatInt, useToast, type AdminColDef } from "@op/admin-ui";
import { api, loiConsole, type Role } from "../api";
import { useChon } from "../chon";

export function TraNhanVat() {
  const [, go] = useLocation();
  const { show } = useToast();
  const { srv, role, datRole } = useChon();
  const [ten, setTen] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");

  // Đổi máy chủ thì kết quả cũ không còn nghĩa — xoá đi thay vì để một bảng của máy chủ khác
  // nằm đó chờ người trực bấm nhầm.
  useEffect(() => setTuKhoa(""), [srv]);

  const tim = useQuery({
    queryKey: ["gm-roles", srv, tuKhoa],
    queryFn: () =>
      api.get<{ roles: Role[] }>(
        `/admin-portal/api/roles?srv=${encodeURIComponent(srv)}&name=${encodeURIComponent(tuKhoa)}`,
      ),
    enabled: !!srv && !!tuKhoa,
    retry: false,
  });

  useEffect(() => {
    if (tim.isError) {
      const { text, nang } = loiConsole(tim.error);
      show(text, nang ? "error" : "warning");
    }
  }, [tim.isError, tim.error, show]);

  const roles = tim.data?.roles ?? [];

  const mo = (r: Role) => {
    datRole(r);
    go(`/nhan-vat/${encodeURIComponent(r.roleId)}`);
  };

  const cols: AdminColDef[] = [
    {
      field: "roleName",
      headerName: "Nhân vật",
      flex: 1.6,
      minWidth: 190,
      sortable: false,
      renderCell: (p) => {
        const r = p.row as Role;
        return (
          <Box sx={{ py: 0.5, lineHeight: 1.3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {r.roleName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "ui-monospace, monospace" }}
            >
              {r.roleId}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "accountUid",
      headerName: "Mã tài khoản",
      flex: 1,
      minWidth: 140,
      sortable: false,
      hideBelow: "md",
      renderCell: (p) => (
        <span style={{ fontFamily: "ui-monospace, monospace" }}>{(p.row as Role).accountUid}</span>
      ),
    },
    { field: "srvCode", headerName: "Máy chủ", width: 96, sortable: false },
    { field: "level", headerName: "Cấp", width: 74, align: "right", headerAlign: "right", sortable: false },
    { field: "vipLevel", headerName: "VIP", width: 74, align: "right", headerAlign: "right", sortable: false },
    {
      field: "power",
      headerName: "Lực chiến",
      width: 124,
      align: "right",
      headerAlign: "right",
      sortable: false,
      hideBelow: "sm",
      valueFormatter: (v: number) => formatInt(v),
    },
    {
      field: "mo",
      headerName: "",
      width: 92,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => {
        const r = p.row as Role;
        return (
          <Button size="small" variant={role?.roleId === r.roleId ? "contained" : "outlined"}>
            Mở
          </Button>
        );
      },
    },
  ];

  return (
    <Page
      title="Tra nhân vật"
      sub="Gõ đúng tên trong game. Mọi thao tác sau đó đều gắn với nhân vật mở từ bảng này, và đều vào nhật ký kèm tên tài khoản của bạn."
    >
      <Paper
        variant="outlined"
        component="form"
        sx={{ p: 2, mb: 2 }}
        onSubmit={(e) => {
          e.preventDefault();
          setTuKhoa(ten.trim());
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            label="Tên nhân vật"
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            placeholder="ví dụ: Râu Trắng"
            autoComplete="off"
            autoFocus
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!srv || !ten.trim() || tim.isFetching}
            sx={{ minWidth: 120, minHeight: 40 }}
          >
            {tim.isFetching ? "Đang tìm…" : "Tìm"}
          </Button>
        </Stack>
        {!srv && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Chọn máy chủ ở thanh trên trước đã.
          </Alert>
        )}
      </Paper>

      <Grid<Role>
        columns={cols}
        rows={roles}
        rowId={(r) => r.roleId}
        loading={tim.isFetching}
        onRowClick={mo}
        density="standard"
        empty={
          tuKhoa
            ? `Không có nhân vật nào tên như vậy trên ${srv}.`
            : "Nhập tên rồi bấm Tìm để bắt đầu."
        }
        sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
      />
    </Page>
  );
}
