import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Msg, NewsList } from "@op/ui/publisher";
import { api, errText, NEWS_KIND_LABEL, type GamesResponse, type NewsItem, type NewsKind } from "../api";
import { useTitle } from "../lib/title";
import { newsHref } from "./Home";

const KINDS: { v: NewsKind | "all"; label: string }[] = [
  { v: "all", label: "Tất cả" },
  { v: "news", label: NEWS_KIND_LABEL.news },
  { v: "event", label: NEWS_KIND_LABEL.event },
  { v: "notice", label: NEWS_KIND_LABEL.notice },
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

  return (
    <main className="pb-main pt-page">
      <div className="pt-page__head">
        <h1>Tin tức & sự kiện</h1>
        <p className="pb-sub">Tin chung của cổng và tin của từng game.</p>
      </div>

      <div className="pt-filters">
        <div className="pt-pills" role="tablist" aria-label="Loại tin">
          {KINDS.map((k) => (
            <button key={k.v} type="button" role="tab" aria-selected={kind === k.v}
                    className={`pt-pill${kind === k.v ? " is-on" : ""}`} onClick={() => setKind(k.v)}>
              {k.label}
            </button>
          ))}
        </div>
        <label className="pb-muted" style={{ fontSize: 14 }}>
          <span className="pb-field__label" style={{ marginBottom: 4 }}>Game</span>
          <select value={game} onChange={(e) => setGame(e.target.value)} aria-label="Lọc theo game">
            <option value="all">Mọi game</option>
            {(games.data?.games ?? []).map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
          </select>
        </label>
      </div>

      {news.isPending && <p className="pt-loading">Đang tải…</p>}
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
    </main>
  );
}
