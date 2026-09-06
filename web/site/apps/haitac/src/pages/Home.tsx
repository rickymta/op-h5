import { Card, Empty, Hero, LinkButton, NewsList, Section } from "@op/site-ui";
import { useImg, useMe, useMeta, useNews, usePage, usePkgList, useServers, useTitle } from "../queries";
import { BandLegend, CardTitle, Loading, Main, PkgCard, PkgGrid, QueryError, RecommendHint, ServerList, TextLink } from "../parts";
import { HOME_ABOUT, HOME_FEATURES } from "../content";

/** Trang chủ của game (docs/plan-go-react.md 15.4): hero → máy chủ → cửa hàng rút gọn → tin → tài khoản. */
export function Home() {
  const meta = useMeta();
  const me = useMe();
  const servers = useServers();
  // Chỉ ba gói mẫu: xin đúng nhóm "diamond" và ba dòng thay vì kéo cả bảng giá 1.900 gói về
  // trang chủ như trước (QA đợt 3, V4).
  const pkgs = usePkgList({ q: "", cat: "diamond", sort: "popular", page: 1, pageSize: 3 });
  const news = useNews(4);
  const about = usePage("gioi-thieu");

  const m = meta.data;
  useTitle(m?.name);
  const banner = useImg(m?.banner_url);
  const logo = useImg(m?.logo_url);
  const idBase = (m?.id_base ?? "").replace(/\/+$/, "");
  const guest = me.data ? !me.data.logged_in : false;

  const firstCat = pkgs.data?.categories?.[0];
  const teaser = (pkgs.data?.list?.packages ?? []).slice(0, 3);
  const balance = me.data?.logged_in ? me.data.balance : undefined;

  // "Về game": ưu tiên bản người vận hành soạn ở trang quản trị; lấy các đoạn văn xuôi đầu
  // tiên của bài giới thiệu (bỏ tiêu đề phụ `## ` và gạch đầu dòng `- `).
  const doc = about.data?.body ?? "";
  const fromDb = doc
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("## ") && !s.startsWith("- "))
    .slice(0, 3);
  const aboutParas = fromDb.length ? fromDb : HOME_ABOUT;

  return (
    <>
      <Hero
        image={banner}
        logo={logo}
        // Bản cũ đặt `--accent` lên :root cho cả trang. Bảng màu nay chuẩn hoá trong preset dùng
        // chung; @op/site-ui chỉ chừa một lối cho màu riêng của game ở đúng khối hero.
        accent={m?.accent}
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
        {guest ? (
          <p className="mt-2 text-[13.5px] text-fg-muted">Chưa có tài khoản? Bấm Chơi ngay để đăng ký trong một bước.</p>
        ) : null}
      </Hero>

      <Main>
        <Section
          eyebrow="Về game"
          title={m?.name ? `Về ${m.name}` : "Về game"}
          action={<TextLink href="/gioi-thieu">Giới thiệu đầy đủ →</TextLink>}
        >
          <div className="max-w-[72ch]">
            {aboutParas.map((s, i) => (
              <p key={i} className="mb-[1.05em] text-[15.5px] leading-[1.7] text-fg last:mb-0 tb:text-base">
                {s}
              </p>
            ))}
          </div>
        </Section>

        <Section eyebrow="Đặc điểm" title="Chơi kiểu gì">
          <div className="grid grid-cols-2 gap-2.5 xs:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] xs:gap-3.5">
            {HOME_FEATURES.map((f) => (
              <div className="rounded-xl border border-line bg-ink-850 p-3 xs:px-[18px] xs:py-4" key={f.title}>
                <h3 className="m-0 mb-1.5 text-[15.5px] font-semibold text-fg">{f.title}</h3>
                <p className="m-0 text-[13.5px] leading-[1.55] text-fg-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Máy chủ"
          title="Chọn nơi ra khơi"
          sub="Cập nhật liên tục. “Đông” vẫn vào được; “Đầy” thì chọn máy chủ khác."
          action={<TextLink href="/may-chu">Tất cả máy chủ →</TextLink>}
        >
          <div className="space-y-4">
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
              {firstCat?.hint ? <p className="mb-3.5 mt-1.5 text-[13.5px] text-fg-muted">{firstCat.hint}</p> : null}
              <PkgGrid>
                {teaser.map((p) => (
                  <PkgCard
                    key={p.id}
                    p={p}
                    href={`/cua-hang/${encodeURIComponent(p.id)}`}
                    poor={balance !== undefined && p.price_xu > balance}
                  />
                ))}
              </PkgGrid>
            </>
          )}
        </Section>

        <Section eyebrow="Tin tức" title="Tin tức & sự kiện" action={<TextLink href="/tin-tuc">Tất cả tin →</TextLink>}>
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
                href: `/tin-tuc/${n.slug || n.id}`,
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
            <CardTitle>Tài khoản &amp; ví</CardTitle>
            <p className="mb-4 mt-1.5 text-sm text-fg-muted">
              Số dư, lịch sử giao dịch và đổi mật khẩu nằm ở trang tài khoản chung của hệ thống.
            </p>
            <LinkButton variant="ghost" href={`${idBase}/tai-khoan`}>
              Mở trang tài khoản
            </LinkButton>
          </Card>
        </Section>
      </Main>
    </>
  );
}
