import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ApiError, Grid, Page, api } from "@op/admin-ui";
import type { AdminColDef, GridRenderCellParams } from "@op/admin-ui";
import type { AuditEntry, AuditResponse } from "../api";
import { Loi, ThieuAPI } from "../bits";

const CO_TRANG = 50;

/**
 * Nhật ký thao tác.
 *
 * Bản Go cũ render thẳng 200 dòng gần nhất ra HTML, không đi qua API — nên trang này gọi
 * `GET /api/audit`, thứ tiến trình `admin` chưa có. Endpoint thiếu thì hiện dải giải thích
 * thay vì một dòng "Lỗi HTTP 404" mà người trực không biết phải làm gì với nó.
 */
export function Audit() {
  const qc = useQueryClient();
  const [trang, setTrang] = useState(1);

  const q = useQuery({
    queryKey: ["audit", trang],
    queryFn: () => api.get<AuditResponse>(`/api/audit?page=${trang}&page_size=${CO_TRANG}`),
    placeholderData: (prev) => prev,
    retry: false,
  });

  const items = q.data?.items ?? [];
  const tong = (trang - 1) * CO_TRANG + items.length + (q.data?.has_more ? 1 : 0);
  const thieu = q.error instanceof ApiError && (q.error.status === 404 || q.error.code === "mock_missing");

  const cot: AdminColDef[] = [
    { field: "at", headerName: "Thời điểm", width: 168 },
    { field: "who", headerName: "Người", width: 120 },
    {
      field: "action",
      headerName: "Thao tác",
      width: 160,
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={(p.row as AuditEntry).action} size="small" variant="outlined" />
      ),
    },
    { field: "target", headerName: "Đối tượng", minWidth: 140, flex: 0.9, hideBelow: "md" },
    {
      field: "detail",
      headerName: "Chi tiết",
      minWidth: 200,
      flex: 1.6,
      hideBelow: "md",
      renderCell: (p: GridRenderCellParams) => (
        <Typography
          variant="caption"
          color="text.secondary"
          title={(p.row as AuditEntry).detail}
          sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {(p.row as AuditEntry).detail}
        </Typography>
      ),
    },
  ];

  return (
    <Page
      title="Nhật ký thao tác"
      sub="Mọi thao tác ghi của trang quản trị đều vào đây kèm người làm và thời điểm. Công cụ GM cũ chỉ được bảo vệ bằng một chuỗi tĩnh và không ghi lại ai làm gì."
      maxWidth={false}
      actions={
        <Button
          startIcon={<RefreshIcon />}
          disabled={q.isFetching}
          onClick={() => void qc.invalidateQueries({ queryKey: ["audit"] })}
        >
          Đọc lại
        </Button>
      }
    >
      {thieu ? (
        <ThieuAPI
          path="GET /api/audit"
          viec="Nhật ký hiện chỉ đọc được từ bảng admin_audit; trang Go cũ dựng sẵn HTML nên chưa ai làm endpoint JSON."
        />
      ) : (
        <Loi e={q.error} />
      )}

      <Grid
        columns={cot}
        rows={items}
        rowId={(e) => e.id}
        loading={q.isLoading}
        empty={thieu ? "Chưa đọc được nhật ký." : "Chưa có thao tác nào."}
        page={trang}
        pageSize={CO_TRANG}
        total={tong}
        onPage={setTrang}
      />

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Nhật ký không xoá được từ giao diện. Cần lấy nhiều hơn thì đọc thẳng bảng
          <code> admin_audit </code> trong MySQL <code>platform</code>.
        </Typography>
      </Box>
    </Page>
  );
}
