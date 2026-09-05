import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, Card, Msg } from "@op/ui/publisher";
import { api, errText, HISTORY_KIND_LABEL, type HistoryResponse } from "../../api";
import { HistoryTable } from "./parts";

const KINDS = ["all", "topup", "convert", "refund", "adjust"] as const;
type Kind = (typeof KINDS)[number];
const PAGE = 20;

/** Lịch sử ví: pill lọc theo loại, "Xem thêm" nối trang theo `has_more`. */
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

  return (
    <>
      <div className="pt-account__head">
        <h1>Lịch sử giao dịch</h1>
        <p className="pb-sub">Nạp, quy đổi vật phẩm, hoàn Xu khi game từ chối, điều chỉnh do hỗ trợ.</p>
      </div>

      <div className="pt-pills" role="tablist" aria-label="Loại giao dịch">
        {KINDS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k}
                  className={`pt-pill${kind === k ? " is-on" : ""}`} onClick={() => setKind(k)}>
            {k === "all" ? "Tất cả" : HISTORY_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <Card>
        {q.isPending && <p className="pt-loading">Đang tải…</p>}
        {q.isError && <Msg tone="err">{errText(q.error)}</Msg>}
        {q.isSuccess && (
          <>
            {/* Các trang gộp vào một bảng để đọc liền mạch; khoá dòng theo vị trí vì mock trả trùng txn. */}
            <HistoryTable items={pages.flatMap((p) => p.items)} keyPrefix={kind} />
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
