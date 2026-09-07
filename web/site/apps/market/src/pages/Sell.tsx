import { useMemo, useState } from "react";
import {
  Breadcrumb,
  Button,
  Card,
  Field,
  KeyValue,
  Msg,
  QuickPick,
  Section,
  SelectField,
  Steps,
  formatInt,
} from "@op/site-ui";
import { DEMO_CHARACTERS, DEMO_GAMES, gameName, serverName } from "../demo-data";
import {
  AMOUNT_MIN,
  AMOUNT_STEP,
  FEE_PCT,
  MAX_OPEN_LISTINGS,
  PRICE_CEIL,
  PRICE_FLOOR,
  PRICE_UNIT,
  checkAmount,
  checkPrice,
  quote,
} from "../lib/market";
import { to, useTitle } from "../lib/nav";
import { DemoTag, LockedButton, LockedNote } from "../components/Preview";
import { NB, UnitPrice, Xu } from "../components/Num";

const STEPS = ["Game và nhân vật", "Số lượng và đơn giá", "Phí và số thực nhận", "Xác nhận"];

/** Vài mốc giá gợi ý giữa sàn và trần — đỡ phải tự nhẩm phần trăm. */
const PRICE_HINTS = [
  { value: String(PRICE_FLOOR), label: `${formatInt(PRICE_FLOOR)} · giá sàn` },
  { value: "600", label: "600" },
  { value: "700", label: "700" },
  { value: "850", label: "850" },
  { value: String(PRICE_CEIL), label: `${formatInt(PRICE_CEIL)} · giá cửa hàng` },
];

/** Chỉ nhận chữ số — ô nhập là `text` để tự kiểm soát định dạng, không dùng `type="number"`. */
function digits(s: string): string {
  return s.replace(/[^\d]/g, "").slice(0, 9);
}

export function Sell() {
  useTitle("Đăng bán");
  const [step, setStep] = useState(1);
  const openGames = DEMO_GAMES.filter((g) => g.open);
  const firstGame = openGames[0]?.code ?? "";
  const [game, setGame] = useState(firstGame);
  // Chọn sẵn nhân vật đầu: mở trang ra mà đã thấy dải lỗi đỏ thì người dùng tưởng mình làm sai
  // một việc còn chưa kịp làm.
  const [roleId, setRoleId] = useState(DEMO_CHARACTERS.find((c) => c.game === firstGame)?.id ?? "");
  const [amountStr, setAmountStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  // Chỉ báo lỗi sau khi người dùng bấm "Tiếp tục": ô còn trống vì chưa gõ tới, không phải vì sai.
  const [tried, setTried] = useState(false);

  const chars = useMemo(() => DEMO_CHARACTERS.filter((c) => c.game === game), [game]);
  const char = chars.find((c) => c.id === roleId);
  const amount = Number(amountStr || 0);
  const price = Number(priceStr || 0);
  const q = quote(amount, price);

  const roleErr = char ? null : "Chọn nhân vật sẽ ký gửi Kim Cương.";
  const amountErr =
    checkAmount(amount) ??
    (char && amount > char.balance
      ? `Nhân vật ${char.name} chỉ có ${formatInt(char.balance)} Kim Cương.`
      : null);
  const priceErr = checkPrice(price);
  const stepErr = step === 1 ? roleErr : step === 2 ? (amountErr ?? priceErr) : null;

  const recap = [
    { k: "Game", v: gameName(game) },
    { k: "Nhân vật", v: char ? `${char.name} · ${serverName(game, char.srv)}` : "—" },
    { k: "Số lượng ký gửi", v: <NB n={amount} /> },
    { k: `Đơn giá (mỗi ${formatInt(PRICE_UNIT)} Kim Cương)`, v: <UnitPrice n={price} /> },
  ];

  return (
    <main className="site-main">
      <Breadcrumb items={[{ label: "Chợ", href: to("/") }, { label: "Đăng bán" }]} />

      <Section
        eyebrow="Người bán"
        title="Đăng bán Kim Cương"
        sub="Bốn bước; số Xu thực nhận được tính ngay ở bước ba, trước khi xác nhận."
        action={<DemoTag>nhân vật mẫu</DemoTag>}
      >
        <Steps steps={STEPS} current={step} />

        <div className="mt-4 grid items-start gap-4 tb:grid-cols-[minmax(0,1fr)_320px]">
          <Card pad="lg">
            {step === 1 ? (
              <>
                <h3>Bước 1 · Chọn game và nhân vật</h3>
                <p className="m-0 mt-1.5 text-[13px] text-fg-muted">
                  Kim Cương được trừ khỏi đúng nhân vật này ngay khi tin lên bảng, không phải khi bán được.
                </p>
                <div className="mt-4 grid gap-3">
                  <SelectField
                    id="s-game"
                    label="Game"
                    value={game}
                    onChange={(v) => {
                      setGame(v);
                      setRoleId(DEMO_CHARACTERS.find((c) => c.game === v)?.id ?? "");
                    }}
                    options={openGames.map((g) => ({ value: g.code, label: g.name }))}
                  />
                  <SelectField
                    id="s-role"
                    label="Nhân vật"
                    value={roleId}
                    onChange={setRoleId}
                    options={[
                      { value: "", label: "— Chọn nhân vật —" },
                      ...chars.map((c) => ({
                        value: c.id,
                        label: `${c.name} · ${serverName(c.game, c.srv)} · ${formatInt(c.balance)} NB`,
                      })),
                    ]}
                  />
                </div>
                {char ? (
                  <p className="m-0 mt-3 text-[13px] text-fg-muted">
                    Số dư hiện có: <NB n={char.balance} /> trên {serverName(char.game, char.srv)}.
                  </p>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h3>Bước 2 · Số lượng và đơn giá</h3>
                <div className="mt-4 grid gap-3">
                  <Field
                    label="Số Kim Cương muốn bán"
                    htmlFor="s-amount"
                    hint={`Tối thiểu ${formatInt(AMOUNT_MIN)}, bội của ${AMOUNT_STEP}.`}
                  >
                    <input
                      id="s-amount"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Ví dụ 50000"
                      value={amountStr}
                      onChange={(e) => setAmountStr(digits(e.target.value))}
                    />
                  </Field>
                  <Field
                    label={`Đơn giá — Xu cho mỗi ${formatInt(PRICE_UNIT)} Kim Cương`}
                    htmlFor="s-price"
                    hint={`Trong khoảng ${formatInt(PRICE_FLOOR)}–${formatInt(PRICE_CEIL)} Xu.`}
                  >
                    <input
                      id="s-price"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Ví dụ 700"
                      value={priceStr}
                      onChange={(e) => setPriceStr(digits(e.target.value))}
                    />
                  </Field>
                  <QuickPick ariaLabel="Mốc giá gợi ý" value={priceStr} onChange={setPriceStr} options={PRICE_HINTS} />
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h3>Bước 3 · Phí và số Xu thực nhận</h3>
                <p className="m-0 mt-1.5 text-[13px] text-fg-muted">
                  Người mua trả đúng số ở dòng đầu. Cổng giữ lại {FEE_PCT}% và bạn nhận phần còn lại — phí không
                  cộng thêm vào giá người mua nhìn thấy.
                </p>
                <div className="mt-4">
                  <KeyValue
                    rows={[
                      { k: "Người mua trả", v: <Xu n={q.total} /> },
                      { k: `Phí sàn (${FEE_PCT}%)`, v: <Xu n={q.fee} tone="muted" /> },
                      {
                        k: "So với cửa hàng",
                        v: q.savedPct > 0 ? `rẻ hơn ${q.savedPct}% cho người mua` : "bằng giá cửa hàng",
                      },
                      { k: "Bạn nhận", v: <Xu n={q.net} tone="gold" />, strong: true, tone: "gold" },
                    ]}
                  />
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h3>Bước 4 · Xác nhận</h3>
                <div className="mt-4">
                  <KeyValue
                    rows={[
                      ...recap,
                      { k: "Người mua trả", v: <Xu n={q.total} /> },
                      { k: `Phí sàn (${FEE_PCT}%)`, v: <Xu n={q.fee} tone="muted" /> },
                      { k: "Bạn nhận", v: <Xu n={q.net} tone="gold" />, strong: true, tone: "gold" },
                    ]}
                  />
                </div>
                <div className="mt-4">
                  <Msg tone="warn">
                    Khi chợ mở thật, bấm nút dưới sẽ trừ <NB n={amount} /> khỏi nhân vật{" "}
                    {char ? char.name : "đã chọn"} <strong>ngay lập tức</strong> rồi mới đưa tin lên bảng. Huỷ tin
                    chưa bán được thì số Kim Cương ấy về lại hòm thư trong game.
                  </Msg>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <LockedButton full size="lg">
                    Đăng bán
                  </LockedButton>
                  <LockedNote />
                </div>
              </>
            ) : null}

            {tried && stepErr ? (
              <div className="mt-4">
                <Msg tone="err">{stepErr}</Msg>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 1}
                onClick={() => {
                  setTried(false);
                  setStep((s) => s - 1);
                }}
              >
                Quay lại
              </Button>
              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (stepErr) {
                      setTried(true);
                      return;
                    }
                    setTried(false);
                    setStep((s) => s + 1);
                  }}
                >
                  Tiếp tục
                </Button>
              ) : null}
            </div>
          </Card>

          <Card pad="lg">
            <h3 className="text-[15px]">Trước khi đăng</h3>
            <ul className="mk-bullets m-0 mt-3 grid list-none gap-3 p-0 text-[13px] leading-relaxed text-fg-muted">
              <li>
                <strong className="text-fg">Ký gửi trước.</strong> Kim Cương rời nhân vật ngay lúc đăng, nên tin
                trên bảng luôn có hàng thật đứng sau.
              </li>
              <li>
                <strong className="text-fg">Phí {FEE_PCT}%.</strong> Trừ vào phần bạn nhận, hiện rõ ở bước ba.
              </li>
              <li>
                <strong className="text-fg">Giá sàn và trần.</strong> {formatInt(PRICE_FLOOR)}–
                {formatInt(PRICE_CEIL)} Xu cho {formatInt(PRICE_UNIT)} Kim Cương.
              </li>
              <li>
                <strong className="text-fg">Tối đa {MAX_OPEN_LISTINGS} tin</strong> mở cùng lúc cho mỗi tài khoản.
              </li>
            </ul>
          </Card>
        </div>
      </Section>
    </main>
  );
}
