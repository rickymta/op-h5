import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Msg, NewsList, QuickPick, SelectField } from "@op/site-ui";
import { api, errText, NEWS_KIND_LABEL, type GamesResponse, type NewsItem, type NewsKind } from "../api";
import { useTitle } from "../lib/title";
import { Loading, Main, PageHead } from "../lib/shell";
import { newsHref } from "./Home";

const KINDS: { value: NewsKind | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "news", label: NEWS_KIND_LABEL.news },
  { value: "event", label: NEWS_KIND_LABEL.event },
  { value: "notice", label: NEWS_KIND_LABEL.notice },
];

/** Danh sách tin: tab loại tin + chọn game. `game=<code>` trả tin của game đó và tin chung. */
export function NewsPage() {
  useTitle("Tin tức");
  const [kind, setKind] = useState<NewsKind | "all">("all");
  const [game, setGame] = useState("all");

  const games = useQuery({ queryKey: ["games"], queryFn: () => api.get<GamesResponse>("/api/games"), staleTime: 30_000 });
  const news = useQuery({
    queryKey: ["news", "list", kind, game],
    queryFn: () => api.get<{ news: NewsItem[] }>(`/api/news?game=${encodeURIComponent(game)}&kind=${kind}&limit=50`),
  });

  const gameOptions = [
    { value: "all", label: "Mọi game" },
    ...(games.data?.games ?? []).map((g) => ({ value: g.code, label: g.name })),
  ];

  return (
    <Main className="pt-5 tb:pt-8">
      <PageHead title="Tin tức & sự kiện" sub="Tin chung của cổng và tin của từng game." />

      <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2.5">
        <QuickPick options={KINDS} value={kind} onChange={(v) => setKind(v as NewsKind | "all")} ariaLabel="Loại tin" />
        <div className="w-full tb:w-auto tb:min-w-[160px]">
          <SelectField label="Game" id="news-game" value={game} onChange={setGame} options={gameOptions} />
        </div>
      </div>

      {news.isPending && <Loading />}
      {news.isError && <Msg tone="err">{errText(news.error)}</Msg>}
      {news.isSuccess && (
        <NewsList
          items={news.data.news.map((n) => ({
            id: n.id,
            title: n.title,
            summary: n.summary || undefined,
            image: n.image_url || undefined,
            href: newsHref(n),
            published_at: n.published_at,
            kind: n.kind,
            game_name: n.game_name || undefined,
          }))}
          empty="Chưa có tin nào trong mục này."
        />
      )}
    </Main>
  );
}
