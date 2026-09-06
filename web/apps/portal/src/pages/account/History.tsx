import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, Card, FilterBar, Msg, SelectField } from "@op/ui/publisher";
import { api, errText, HISTORY_KIND_LABEL, type HistoryResponse } from "../../api";
import { HistoryTable, withKeys } from "./parts";

const KINDS = ["all", "topup", "convert", "refund", "adjust"] as const;
type Kind = (typeof KINDS)[number];
const PAGE = 20;

const KIND_OPTIONS = KINDS.map((k) => ({
  value: k,
  label: k === "all" ? "Tất cả" : (HISTORY_KIND_LABEL[k] ?? k),
}));

/**
 * Lịch sử ví: `FilterBar` (lọc theo loại) + `DataTable`, "Xem thêm" nối trang theo `has_more`.
 *
 * Chỉ có một bộ lọc vì `GET /api/wallet/history` chỉ nhận `kind`, `page`, `page_size` — không
 * có tìm theo nội dung, không có đảo thứ tự. Dựng thêm ô tìm rồi lọc phía client thì nó chỉ
 * lọc mấy trang đã tải, tức là một ô tìm nói dối; thà không có.
 */
export function History() {
  const [kind, setKind] = useState<Kind>("all");
  const q = useInfiniteQuery({
    queryKey: ["history", kind],
    queryFn: ({ pageParam }) =>
      api.get<HistoryResponse>(`/api/wallet/history?kind=${kind}&page=${pageParam}&page_size=${PAGE}`),
    initialPageParam: 1,
    // Đếm theo số trang đã nạp chứ không tin `page` server trả (mock luôn trả 1).
    getNextPageParam: (last, all) => (last.has_more ? all.length + 1 : undefined),
  });
  const pages = q.data?.pages ?? [];
  // Khoá theo (trang, dòng): "Xem thêm" nối nhiều trang nên `txn` có thể trùng.
  const rows = pages.flatMap((p, i) => withKeys(p.items, `${kind}-${i}-`));

  return (
    <>
      <div className="pt-account__head">
        <h1>Lịch sử giao dịch</h1>
        <p className="pb-sub">Nạp, quy đổi vật phẩm, hoàn Xu khi game từ chối, điều chỉnh do hỗ trợ.</p>
      </div>

      <FilterBar
        action={
          kind !== "all" ? (
            <Button type="button" variant="ghost" onClick={() => setKind("all")}>Đặt lại</Button>
          ) : undefined
        }
      >
        <SelectField
          label="Loại giao dịch"
          id="hist-kind"
          value={kind}
          onChange={(v) => setKind(v as Kind)}
          options={KIND_OPTIONS}
        />
      </FilterBar>

      <Card>
        {q.isError ? (
          <Msg tone="err">{errText(q.error)}</Msg>
        ) : (
          <>
            <HistoryTable rows={rows} loading={q.isPending} />
            {q.hasNextPage && (
              <div className="pt-actions">
                <Button variant="ghost" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                  {q.isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
