import { LinkButton } from "@op/ui/publisher";
import { useMeta, useServers, useTitle } from "../queries";
import { BandLegend, PageHead, RecommendHint, ServerList } from "../parts";

/** Danh sách máy chủ đầy đủ — nguyên bố cục servers.html. */
export function Servers() {
  const meta = useMeta();
  const servers = useServers();
  const name = meta.data?.name;
  useTitle(name ? `Máy chủ · ${name}` : undefined);

  return (
    <main className="pb-main">
      <PageHead
        eyebrow="Danh sách máy chủ"
        title="Chọn nơi ra khơi"
        lead="Người chơi cũ luôn về đúng máy chủ có nhân vật. Người mới nên chọn máy chủ đang “Mượt”."
      >
        <RecommendHint meta={meta.data} />
      </PageHead>

      <div className="gm-stack" style={{ marginTop: 20 }}>
        <ServerList q={servers} emptyText="Chưa đọc được danh sách máy chủ." />
      </div>

      <div className="gm-actions">
        <LinkButton href="/choi-game">Chơi ngay</LinkButton>
      </div>

      <div style={{ marginTop: 30 }}>
        <BandLegend />
      </div>
    </main>
  );
}
