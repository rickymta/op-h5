import { Card, Empty, Hero, LinkButton, NewsList, Section } from "@op/ui/publisher";
import { useImg, useMe, useMeta, useNews, usePackages, useServers, useTitle } from "../queries";
import { BandLegend, Loading, PkgCard, QueryError, RecommendHint, ServerList } from "../parts";

/** Trang chủ của game (docs/plan-go-react.md 15.4): hero → máy chủ → cửa hàng rút gọn → tin → tài khoản. */
export function Home() {
  const meta = useMeta();
  const me = useMe();
  const servers = useServers();
  const pkgs = usePackages();
  const news = useNews(4);

  const m = meta.data;
  useTitle(m?.name);
  const banner = useImg(m?.banner_url);
  const logo = useImg(m?.logo_url);
  const idBase = (m?.id_base ?? "").replace(/\/+$/, "");
  const guest = me.data ? !me.data.logged_in : false;

  const firstCat = pkgs.data?.categories[0];
  const teaser = firstCat?.packages.slice(0, 3) ?? [];
  const balance = me.data?.logged_in ? (me.data.balance ?? 0) : undefined;

  return (
    <>
      <Hero
        image={banner}
        logo={logo}
        eyebrow={m?.genre}
        title={m?.name ?? ""}
        lead={m?.tagline}
        actions={
          <>
            <LinkButton size="lg" href="/choi-game">
              Chơi ngay
            </LinkButton>
            <LinkButton size="lg" variant="ghost" href="/may-chu">
              Máy chủ
            </LinkButton>
          </>
        }
      >
        <RecommendHint meta={m} />
        {guest ? <p className="gm-hero-note">Chưa có tài khoản? Bấm Chơi ngay để đăng ký trong một bước.</p> : null}
      </Hero>

      <main className="pb-main">
        <Section
          eyebrow="Máy chủ"
          title="Chọn nơi ra khơi"
          sub="Cập nhật liên tục. “Đông” vẫn vào được; “Đầy” thì chọn máy chủ khác."
          action={
            <a className="gm-link" href="/may-chu">
              Tất cả máy chủ →
            </a>
          }
        >
          <div className="gm-stack">
            <ServerList q={servers} emptyText="Chưa đọc được danh sách máy chủ. Thử tải lại sau ít phút." />
            <BandLegend />
          </div>
        </Section>

        <Section
          eyebrow="Cửa hàng"
          title="Mua bằng Xu trong ví"
          sub="Nạp một lần vào ví chung, đổi sang vật phẩm ở game nào tuỳ bạn."
          action={
            <LinkButton variant="ghost" href="/cua-hang">
              Vào cửa hàng
            </LinkButton>
          }
        >
          {pkgs.isPending ? (
            <Loading text="Đang đọc bảng giá…" />
          ) : pkgs.isError ? (
            <QueryError error={pkgs.error} prefix="Chưa đọc được bảng giá" />
          ) : teaser.length === 0 ? (
            <Empty>Chưa có gói nào được mở.</Empty>
          ) : (
            <>
              {firstCat?.hint ? <p className="gm-cat-hint">{firstCat.hint}</p> : null}
              <div className="gm-pkgs">
                {teaser.map((p) => (
                  <PkgCard key={p.id} p={p} href="/cua-hang" poor={balance !== undefined && p.price_xu > balance} />
                ))}
              </div>
            </>
          )}
        </Section>

        <Section
          eyebrow="Tin tức"
          title="Tin tức & sự kiện"
          action={
            <a className="gm-link" href="/tin-tuc">
              Tất cả tin →
            </a>
          }
        >
          {news.isPending ? (
            <Loading text="Đang đọc tin…" />
          ) : news.isError ? (
            <QueryError error={news.error} prefix="Chưa đọc được tin" />
          ) : (
            <NewsList
              items={news.data.news.slice(0, 4).map((n) => ({
                id: n.id,
                title: n.title,
                summary: n.summary,
                image: n.image_url || undefined,
                href: `/tin-tuc/${n.id}`,
                published_at: n.published_at,
                kind: n.kind,
                game_name: n.game_name,
              }))}
              empty="Chưa có tin nào."
            />
          )}
        </Section>

        <Section>
          <Card>
            <h3>Tài khoản &amp; ví</h3>
            <p className="pb-sub" style={{ margin: "6px 0 16px" }}>
              Số dư, lịch sử giao dịch và đổi mật khẩu nằm ở trang tài khoản chung của hệ thống.
            </p>
            <LinkButton variant="ghost" href={`${idBase}/tai-khoan`}>
              Mở trang tài khoản
            </LinkButton>
          </Card>
        </Section>
      </main>
    </>
  );
}
