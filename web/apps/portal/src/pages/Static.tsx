import { useSite } from "../lib/session";
import { useTitle } from "../lib/title";

/**
 * Hai trang tĩnh Điều khoản / Chính sách. Nội dung ở đây là KHUNG để người vận hành điền —
 * không bịa điều khoản cụ thể. Chỗ cần điền đánh dấu màu vàng, nhìn là biết chưa xong.
 */
export function StaticPage({ kind }: { kind: "terms" | "privacy" }) {
  const site = useSite();
  const brand = site.data?.brand ?? "Cổng game";
  const isTerms = kind === "terms";
  useTitle(isTerms ? "Điều khoản sử dụng" : "Chính sách bảo mật");

  const sections = isTerms
    ? [
        ["1. Phạm vi áp dụng", "Điều khoản này áp dụng cho tài khoản, ví Xu và mọi game do " + brand + " phát hành."],
        ["2. Tài khoản", "Quy định về tạo tài khoản, độ tuổi, bảo quản mật khẩu và trách nhiệm khi để lộ tài khoản."],
        ["3. Ví Xu và giao dịch", "Xu là đơn vị nội bộ dùng để đổi vật phẩm trong game; quy định về nạp, quy đổi, hoàn và tranh chấp."],
        ["4. Hành vi bị cấm", "Gian lận, mua bán tài khoản, dùng phần mềm can thiệp, lời lẽ xúc phạm và cách xử lý."],
        ["5. Thay đổi và liên hệ", "Cách " + brand + " thông báo khi điều khoản thay đổi và kênh liên hệ chính thức."],
      ]
    : [
        ["1. Dữ liệu thu thập", "Tên đăng nhập, email khôi phục, địa chỉ IP và thiết bị khi đăng nhập, lịch sử giao dịch Xu."],
        ["2. Mục đích sử dụng", "Vận hành tài khoản, phát vật phẩm, chống gian lận và hỗ trợ khi có sự cố."],
        ["3. Lưu trữ và bảo vệ", "Nơi lưu, thời gian lưu, cách mã hoá mật khẩu và ai được truy cập."],
        ["4. Chia sẻ với bên thứ ba", "Đơn vị thanh toán và nhà cung cấp hạ tầng; không bán dữ liệu cho bên khác."],
        ["5. Quyền của người dùng", "Xem, sửa email khôi phục, đăng xuất mọi thiết bị, yêu cầu xoá tài khoản và cách gửi yêu cầu."],
      ];

  return (
    <main className="pb-main pt-page">
      <div className="pt-static">
        <div className="pt-page__head">
          <h1>{isTerms ? "Điều khoản sử dụng" : "Chính sách bảo mật"}</h1>
          <p className="pb-sub">
            <span className="pt-fill">[Bản nháp — người vận hành cần điền nội dung chính thức trước khi phát hành.]</span>
          </p>
        </div>
        {sections.map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p} <span className="pt-fill">[Điền nội dung chính thức tại đây.]</span></p>
          </section>
        ))}
        <p className="pb-sub" style={{ marginTop: 28 }}>
          {site.data?.legal_note || <span className="pt-fill">[Điền pháp nhân, giấy phép và người chịu trách nhiệm ở ID_LEGAL_NOTE.]</span>}
        </p>
      </div>
    </main>
  );
}
