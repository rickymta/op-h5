import { useQuery } from "@tanstack/react-query";
import { Card, Empty, GameCard, Hero, LinkButton, Msg, NewsList, RichText, Section, StatCard, formatInt } from "@op/site-ui";
import { api, errText, type GamesResponse, type NewsItem } from "../api";
import { useTitle } from "../lib/title";
import { useMe, useSite } from "../lib/session";
import { Loading, Main } from "../lib/shell";
import { FAQ_ITEMS, WHY_ITEMS } from "../content/home";

/**
 * Đường tới tin: có `link_url` thì ra ngoài, không thì trang chi tiết trong cổng.
 *
 * Ưu tiên slug — `/tin-tuc/vi-xu-dung-chung` nói cho người đọc biết bài viết gì, `/tin-tuc/12`
 * thì không. Bài cũ chưa có slug vẫn đi theo id, và API nhận cả hai nên không có liên kết nào gãy.
 */
export function newsHref(n: NewsItem): string {
  return n.link_url || `/tin-tuc/${n.slug || n.id}`;
}

/**
 * Trang chính (plan 15.3): hero game nổi bật → ô số liệu (chỉ khi có số thật) → lưới game →
 * 5 tin mới → "Một tài khoản, một ví" → chân trang (ở App).
 */
export function Home() {
  useTitle();
  const site = useSite();
  const me = useMe();
  const games = useQuery({ queryKey: ["games"], queryFn: () => api.get<GamesResponse>("/api/games"), staleTime: 30_000 });
  const news = useQuery({ queryKey: ["news", "home"], queryFn: () => api.get<{ news: NewsItem[] }>("/api/news?limit=5") });

  const brand = site.data?.brand ?? "Cổng game";
  const list = games.data?.games ?? [];
  const featured = list.find((g) => g.code === games.data?.featured) ?? list.find((g) => g.featured) ?? list[0];
  const liveGames = list.filter((g) => g.live);

  return (
    <>
      {games.isPending ? (
        <Hero title={brand} lead="Đang tải danh sách game…" />
      ) : featured ? (
        <Hero
          image={featured.banner_url || undefined}
          logo={featured.logo_url || undefined}
          eyebrow={featured.genre || "Game nổi bật"}
          title={featured.name}
          lead={featured.tagline || featured.description || undefined}
          accent={featured.accent || undefined}
          actions={
            <>
              <LinkButton href={featured.play_url} size="lg">Chơi ngay</LinkButton>
              <LinkButton href={featured.servers_url} size="lg" variant="ghost">Máy chủ</LinkButton>
            </>
          }
        >
          {featured.live && featured.servers_open > 0
            ? `${formatInt(featured.online)} người đang chơi · ${formatInt(featured.servers_open)} máy chủ đang mở`
            : undefined}
        </Hero>
      ) : (
        <Hero
          eyebrow="Nền tảng phát hành"
          title={brand}
          lead="Một tài khoản, một ví Xu, chơi mọi game của chúng tôi. Game đầu tiên sẽ sớm ra mắt."
          actions={
            me.data ? (
              <LinkButton href="/tai-khoan" size="lg">Vào tài khoản</LinkButton>
            ) : (
              <>
                <LinkButton href="/dang-ky" size="lg">Tạo tài khoản</LinkButton>
                <LinkButton href="/dang-nhap" size="lg" variant="ghost">Đăng nhập</LinkButton>
              </>
            )
          }
        />
      )}

      <Main>
        {/* Số liệu: chỉ hiện số sống từ adapter (khảo sát: người chơi Việt nhạy với số ảo).
            "Game đang mở" đếm mọi game đang phát hành, không chỉ game có số liệu sống. */}
        {liveGames.length > 0 && games.data && (
          <div className="site-stat-grid pt-7">
            <StatCard label="Game đang mở" value={formatInt(list.length)} />
            <StatCard label="Đang chơi" value={formatInt(games.data.online_total)} hint="người chơi trực tuyến" />
            <StatCard label="Máy chủ đang mở" value={formatInt(games.data.servers_open_total)} />
          </div>
        )}

        <Section id="game" eyebrow="Danh sách" title="Game" sub="Mọi game dùng chung một tài khoản và một ví Xu.">
          {games.isPending && <Loading />}
          {games.isError && <Msg tone="err">{errText(games.error)}</Msg>}
          {games.isSuccess && list.length === 0 && <Empty>Chưa có game nào đang mở. Quay lại sau nhé.</Empty>}
          {list.length > 0 && (
            <div className="site-game-grid">
              {list.map((g) => (
                <GameCard
                  key={g.code}
                  name={g.name}
                  genre={g.genre || undefined}
                  cover={g.cover_url || undefined}
                  badge={g.badge}
                  href={g.badge === "soon" ? g.site_url : g.play_url}
                  cta={g.badge === "soon" ? "Xem trước" : "Chơi ngay"}
                  meta={g.live ? `${formatInt(g.online)} đang chơi · ${formatInt(g.servers_open)} máy chủ` : g.tagline || undefined}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          eyebrow="Vì sao chơi ở đây"
          title="Bốn điều làm nên khác biệt"
          sub="Không phải khẩu hiệu — đây là những thứ hệ thống đang làm được."
        >
          {/* Tự xuống hàng theo bề rộng — hai cột ở máy tính bảng, một cột ở điện thoại; không
              ép bốn cột vì tiêu đề dài sẽ vỡ chữ. */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
            {WHY_ITEMS.map((it) => (
              <Card key={it.title}>
                <h3 className="mb-1.5 text-base">{it.title}</h3>
                <p className="m-0 text-sm leading-[1.6] text-fg-muted">{it.text}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section eyebrow="Mới nhất" title="Tin tức & sự kiện" action={<a href="/tin-tuc">Xem tất cả →</a>}>
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
              empty="Chưa có tin nào."
            />
          )}
        </Section>

        <Section eyebrow="Bắt đầu" title="Ba bước bắt đầu" sub="Đăng ký một lần, nạp một chỗ, chơi game nào tuỳ bạn.">
          <div className="mb-5 grid grid-cols-1 gap-2.5 tb:grid-cols-3 tb:gap-3.5">
            <Card>
              <div className="mb-2.5 font-mono text-[13px] tracking-[0.14em] text-brand-500">BƯỚC 1</div>
              <h3 className="mb-1.5">Tạo tài khoản</h3>
              <p className="m-0 text-sm text-fg-muted">
                Một tên đăng nhập dùng cho mọi game, không phải đăng ký lại khi có game mới. Thêm email
                khôi phục để tự lấy lại mật khẩu khi cần.
              </p>
            </Card>
            <Card>
              <div className="mb-2.5 font-mono text-[13px] tracking-[0.14em] text-brand-500">BƯỚC 2</div>
              <h3 className="mb-1.5">Nạp Xu</h3>
              <p className="m-0 text-sm text-fg-muted">
                Xu nằm trong ví chung của tài khoản. Nạp một lần rồi đổi vật phẩm ở game nào tuỳ bạn;
                mọi lần nạp và quy đổi đều ghi lại trong Lịch sử.
              </p>
            </Card>
            <Card>
              <div className="mb-2.5 font-mono text-[13px] tracking-[0.14em] text-brand-500">BƯỚC 3</div>
              <h3 className="mb-1.5">Chơi game nào tuỳ bạn</h3>
              <p className="m-0 text-sm text-fg-muted">
                Bấm Chơi ngay là vào thẳng trong trình duyệt — tài khoản game tự tạo, không phải tải,
                không phải nhớ thêm mật khẩu.
              </p>
            </Card>
          </div>
          {me.data ? (
            <LinkButton href="/tai-khoan" size="lg">Vào tài khoản</LinkButton>
          ) : (
            <LinkButton href="/dang-ky" size="lg">Tạo tài khoản</LinkButton>
          )}
        </Section>

        {/* Câu hỏi thường gặp: `<details>` thật nên mở/đóng được cả khi JS chưa chạy xong, và
            Ctrl+F của trình duyệt tìm thấy chữ bên trong. Không cần thư viện accordion. */}
        <Section
          id="faq"
          eyebrow="Giải đáp"
          title="Câu hỏi thường gặp"
          sub="Tám câu hay được hỏi nhất. Chưa có câu bạn cần thì xem trang Hỗ trợ."
          action={<a href="/ho-tro">Trang hỗ trợ →</a>}
        >
          <div className="border-t border-line">
            {FAQ_ITEMS.map((it) => (
              <details className="group border-b border-line" key={it.q}>
                <summary className="relative flex min-h-[48px] cursor-pointer list-none items-center gap-2.5 py-2.5 pr-[34px] font-semibold hover:text-gold-400 [&::-webkit-details-marker]:hidden">
                  {it.q}
                  <span aria-hidden="true" className="absolute right-1.5 font-mono text-xl leading-none text-gold-400">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <div className="pb-3.5 [&>*:last-child]:mb-0 [&_p]:text-[14.5px]">
                  <RichText body={it.a} />
                </div>
              </details>
            ))}
          </div>
        </Section>
      </Main>
    </>
  );
}
