import { LinkButton } from "@op/site-ui";
import { useMeta, useServers, useTitle } from "../queries";
import { Actions, BandLegend, Main, PageHead, RecommendHint, ServerList } from "../parts";

/** Danh sách máy chủ đầy đủ — nguyên bố cục servers.html. */
export function Servers() {
  const meta = useMeta();
  const servers = useServers();
  const name = meta.data?.name;
  useTitle(name ? `Máy chủ · ${name}` : undefined);

  return (
    <Main>
      <PageHead
        eyebrow="Danh sách máy chủ"
        title="Chọn nơi ra khơi"
        lead="Người chơi cũ luôn về đúng máy chủ có nhân vật. Người mới nên chọn máy chủ đang “Mượt”."
      >
        <RecommendHint meta={meta.data} />
      </PageHead>

      <div className="mt-5">
        <ServerList q={servers} emptyText="Chưa đọc được danh sách máy chủ." />
      </div>

      <Actions>
        <LinkButton href="/choi-game">Chơi ngay</LinkButton>
      </Actions>

      <div className="mt-[30px]">
        <BandLegend />
      </div>
    </Main>
  );
}
