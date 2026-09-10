#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rà chữ người chơi thấy trong bảng của client (templates.bin) — sinh bản sửa, áp cho cả máy chủ.

VÌ SAO
Client là bản One Piece dựng lên từ bản gốc thần thoại Trung Quốc rồi qua bản Kim Dung; tên
tướng/kỹ năng trong `文本库` đã là One Piece, nhưng nhiều ô CHỮ ở bảng khác vẫn mang tên của hai
lớp trước hoặc còn nguyên chữ Hán (rà 2026-09-10, xem docs/ra-soat-chu-client.md):
  - Bí cảnh / Thần điện dung hợp: mô tả thử thách dịch máy ("Sử dụng <2214 Sừng hươu trận >
    Đạt được thắng lợi"), tên trận hình là của bản gốc (client gọi trận hình theo MÀU), tên phe/nghề
    là của bản gốc (Nhân tộc/Pháp sư…) trong khi client gọi Tân Binh/Hải Tặc… và Dame/Magic/Tank/Buff.
    → SINH LẠI toàn bộ mô tả từ cột luật (loại/tham số/phép so/mốc), không dịch tay từng dòng.
  - 藏品推荐.适用英雄 (gợi ý tướng cho sưu tập): 49 tên thần thoại (Na Tra, Huyền Trang…) → tra về
    nguyên mẫu qua `*原始文本` của 文本库 máy chủ rồi ghi tên hiện tại, gom theo phe hiện tại.
  - Nhiệm vụ "Thăng cấp Kiếm Ma đến N sao" (tên Kim Dung; tướng thật là Shanks), gói 501124, ảnh
    đại diện "Chu Điên", biệt danh PVP viết thường, "Bắc 碚 Khu"…
  - Ô còn chữ Hán mà người chơi thấy: chữ nổi khi buff kích hoạt (无敌/反击…), tên/mô tả buff của
    Vũ Thần, tên gói cửa hàng 7 ngày, "chi tiết thưởng" (sinh lại từ id vật phẩm), mô tả gói tuần
    hoàn, hạng đấu kế thừa, vị trí mỏ, tên bộ thú hồn, mô tả kỹ năng thần khí 192, tên hoạt động cũ,
    lời tựa 4 thần khí độc quyền, 4 tiểu sử tướng (lấy từ máy chủ).
  - Thẻ màu viết dính mã "<22188%>" (buff, bí kíp, thần điện) → "<2218 8%>", nếu không client
    không tô màu được và HTMLParser vấp thẻ lạ.

CÁCH DÙNG
    python3 tools/ra-soat-chu-client.py --client website/game/res/<templates.bin>          # xem + ghi sua.json
    python3 tools/ra-soat-chu-client.py --client ... --apply-server                         # ghi luôn excel-src
    python3 tools/templates-bin.py sua <templates.bin> build/templates.moi.bin build/ra-soat/sua-client.json
    python3 tools/phat-hanh-res.py template/templates.bin build/templates.moi.bin
    python3 tools/json-to-excel.py <workbook...> --out server/excel/release   # workbook in ra ở cuối

Nguyên tắc: chỉ đổi ô CHỮ (mô tả/tên), không đụng cột luật; bản sửa là hàm của dữ liệu nên chạy
lại được khi nhận templates.bin/Excel mới. Bộ thẻ màu nhiều từ chỉ hiện đúng khi bundle đã vá
(tools/va-nhan-ghep.py).
"""
import argparse, glob, json, os, re, sys, unicodedata, zlib
from importlib import util as _u

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "website", "game", "libs", "2af72-f100c-2af72.json")
XLS = os.path.join(ROOT, "server", "excel-src")
RA_MAC_DINH = os.path.join(ROOT, "build", "ra-soat", "sua-client.json")
CJK = re.compile(r"[一-鿿]")
THE_DINH = re.compile(r"<(\d{4})(\d[^>]*)>")     # <22188%> -> <2218 8%>

N = lambda s: unicodedata.normalize("NFC", s or "").replace("Ð", "Đ").strip()

# --- tên client đang dùng (đọc từ ui.bin / 阵营加成 / tab Guild kỹ năng, 2026-09-10) ---
PHE = {"1": "Tân Binh", "2": "Hải Tặc", "3": "Dũng Sĩ", "4": "Hải Quân", "5": "Ngũ Hoàng", "6": "Siêu cấp"}
NGHE = {"1": "Dame", "2": "Magic", "3": "Tank", "4": "Buff"}
MAU = "2214"
# nhãn phe của bản gốc trong 藏品推荐 -> số phe gốc
PHE_GOC = {"Nhân tộc": "1", "Tiên Tộc": "2", "Tiên tộc": "2", "Yêu tộc": "3", "Thần tộc": "4", "Ma tộc": "5", "Hỗn độn tộc": "6"}
# tên thần thoại (dịch máy) trong 藏品推荐 -> tên gốc chữ Hán (cột *原始文本 của 文本库 máy chủ)
THAN_THOAI = {
    "Na Tra": "哪吒", "Huyền Trang": "玄奘", "Ngưu Ma Vương": "牛魔王", "Hình Thiên": "刑天", "Hoàng Tuyền": "黄泉",
    "Chúc Long": "烛龙", "Cơ Phát": "姬发", "Đấu Chiến Thắng Phật": "斗战胜佛", "Ngao Bính": "敖丙", "Hậu Nghệ": "后羿",
    "Hoa Mộc Lan": "花木兰", "Hỗn Thiên Đại Thánh": "混天大圣", "Giơ cao thương": "擎苍", "Kim Ô": "金乌", "Ngọc Đế": "玉帝",
    "Ma · Ngộ Không": "魔·悟空", "Ảnh": "影", "Lôi Chấn Tử": "雷震子", "Vân Trung Tử": "云中子", "Khổng Tuyên": "孔宣",
    "Cộng Công": "共工", "Minh Hà": "冥河", "Bạch Cốt phu nhân": "白骨夫人", "Cửu Thiên Huyền Nữ": "九天玄女",
    "Đông Hoàng Thái Nhất": "东皇太一", "Linh môi ma nữ": "灵媒魔女", "Khương Tử Nha": "姜子牙", "Thông Thiên giáo chủ": "通天教主",
    "Nguyên Thủy Thiên Tôn": "元始天尊", "Đát Kỷ": "妲己", "Chúc Dung": "祝融", "Diêm Quân": "阎君", "Lý Tĩnh": "李靖",
    "Hồng hài nhi": "红孩儿", "Dương Tiễn": "杨戬", "Quyển Liêm Đại Tướng": "卷帘大将", "Thiên Bồng nguyên soái": "天蓬元帅",
    "Bàn Cổ": "盘古", "Xi Vưu": "蚩尤", "Hằng Nga": "嫦娥", "Nam Cực tiên tử": "南极仙子", "Côn": "鲲", "Dạ Mị": "夜魅",
    "Thạch Cơ": "石矶", "Nữ Oa": "女娲", "Mạnh bà": "孟婆", "Đặng Ngọc thiền": "邓婵玉", "Lộc duyên thượng tiên": "禄缘上仙",
    "Thần Nông": "神农",
}
# ví: mã loại tiền của máy chủ -> vật phẩm ảo client (toItemId trong bundle; gen-danh-muc-game.py)
VI_VAT_PHAM = {"0": "200003", "1": "200004", "4": "200002"}

# --- ô chữ Hán còn sót, dịch cố định theo GIÁ TRỊ (bảng, cột) ---
BUFF_NOI = {"无敌": "Vô địch", "反击": "Phản kích", "追击": "Truy kích", "弱点感知": "Nhận biết điểm yếu",
            "物理连击": "Liên kích vật lý", "法术连击": "Liên kích phép", "暴袭": "Đột kích", "进攻驱散": "Xua tan khi tấn công",
            "自律": "Tự chủ", "再生": "Tái sinh", "重生": "Hồi sinh", "清洁": "Thanh tẩy", "避险": "Né hiểm", "回魂": "Hồi hồn"}
BUFF_TEN = {"真气护体": "Chân khí hộ thể", "武神止戈": "Vũ Thần chỉ qua"}
BUFF_MO_TA = {
    "携带该状态的单位免疫所有控制效果，该效果无法被驱散": "Đơn vị mang trạng thái này miễn nhiễm mọi hiệu ứng khống chế; hiệu quả không thể bị xua tan",
}
BUFF_MO_TA_RE = (re.compile(r"携带单位触发【物连】【法连】【天命物连】【天命法连】的总概率衰减至原来的(\d+)%，不可被驱散，持续到战斗结束"),
                 "Tổng xác suất kích hoạt 【Liên kích vật lý】【Liên kích phép】【Thiên mệnh liên kích vật lý】【Thiên mệnh liên kích phép】 của đơn vị mang trạng thái giảm còn {0}% mức gốc, không thể bị xua tan, kéo dài đến hết trận")
GIA_TRI = {
    ("上古之战抽奖", "是否限制"): {"微概率": "Xác suất cực thấp", "小概率": "Xác suất thấp"},
    ("通用自选礼包奖品池", "关联配置"): {"心愿礼包": "Gói Tâm nguyện", "祈愿礼包": "Gói Cầu nguyện", "许愿礼包": "Gói Ước nguyện"},
    ("段位升级", "继承后段位"): {"倔强青铜": "Quật cường thanh đồng", "秩序白银": "Trật tự bạch ngân", "荣耀黄金": "Vinh quang hoàng kim",
                             "尊贵铂金": "Tôn quý bạch kim", "永恒钻石": "Vĩnh hằng kim cương", "至尊星耀": "Chí tôn tinh diệu"},
    ("掠夺", "据点位置"): {"低级矿脉": "Khoáng mạch cấp thấp", "中级矿脉": "Khoáng mạch trung cấp", "高级矿脉": "Khoáng mạch cao cấp", "龙脉": "Long mạch"},
    ("命格套装", "套装名称"): {"全身穿戴4个5级兽魂": "Đeo đủ 4 thú hồn cấp 5", "全身穿戴4个10级兽魂": "Đeo đủ 4 thú hồn cấp 10"},
    ("神器技能", "技能描述"): {"对随机<2467 5>名敌人造成真实伤害<2467 {d}({d}+{d})>点，<2467 58%>概率使目标【眩晕】<2467 2>回合，无视目标抗控":
                          "Gây <2467 {d}({d}+{d})> sát thương chân thực lên <2467 5> kẻ địch ngẫu nhiên, <2467 58%> xác suất khiến mục tiêu 【Choáng】 <2467 2> hiệp, bỏ qua kháng khống chế của mục tiêu"},
    ("地区", "名称"): {"Bắc 碚 Khu": "Bắc Bội khu"},
    ("仙器基础", "修饰描述"): {
        "这把刀，是影的最爱。——炎": "Trái ác quỷ của Thần Mặt Trời Nika — sức mạnh tự do nhất thế gian.",
        "炎的所有秘密全都藏在这顶皇冠之中。——光": "Thanh kiếm của Vương Bóng Tối, người từng sát cánh cùng Vua Hải Tặc.",
        "光的信仰，没有黑暗，始于光明，终于正义。——御": "Niềm tin của Otohime: không có bóng tối, khởi từ ánh sáng, kết ở chính nghĩa.",
        "光的信仰，没有黑暗，始于光明，终于正义，我愿永远沐浴在她的圣洁中。——御": "Niềm tin của Otohime: không có bóng tối, khởi từ ánh sáng, kết ở chính nghĩa — nguyện mãi tắm mình trong sự thánh khiết ấy.",
    },
    ("神龙战令基础", "活动名称"): {"神龙战令一期": "Chiến lệnh Thần Long kỳ 1", "神龙战令二期": "Chiến lệnh Thần Long kỳ 2", "神龙战令三期": "Chiến lệnh Thần Long kỳ 3",
                          "神龙战令四期": "Chiến lệnh Thần Long kỳ 4", "神龙战令五期": "Chiến lệnh Thần Long kỳ 5", "神龙战令六期": "Chiến lệnh Thần Long kỳ 6"},
    ("魔术戏法活动基础", "活动名称"): {"魔术戏法": "Ảo thuật kỳ ảo"},
    ("召唤福利基础", "活动名称"): {"召唤福利": "Phúc lợi triệu hồi", "解签福利": "Phúc lợi giải quẻ"},
    ("命理大师基础", "活动名称"): {"充值排行": "Xếp hạng nạp"},
    ("图腾周卡活动", "活动名称"): {"图腾周卡": "Thẻ tuần Đồ đằng"},
    ("暑期大作战基础", "活动名称"): {"暑期大作战一期": "Đại chiến mùa hè kỳ 1", "机甲暴龙": "Đại chiến mùa hè — Cơ giáp Bạo Long",
                           "万圣限定": "Đại chiến mùa hè — Halloween", "公主驾到": "Đại chiến mùa hè — Công chúa giá lâm",
                           "闹新春": "Đại chiến mùa hè — Đón xuân", "粉色恋人": "Đại chiến mùa hè — Lễ tình nhân", "寒夜之劫": "Đại chiến mùa hè — Đêm đông"},
}
# cột "chi tiết thưởng" sinh lại từ cột thưởng (loại:id:số#...) khi ô còn chữ Hán
THUONG_CHI_TIET = [("七日历练展示", "展示物品", "奖励详情"), ("七日历练宝箱", "奖励", "奖励详情"), ("挂机掉落商店", "商品", "奖励详情")]


def _tb():
    sp = _u.spec_from_file_location("_tb", os.path.join(ROOT, "tools", "templates-bin.py"))
    m = _u.module_from_spec(sp); sp.loader.exec_module(m); return m


def client_mac_dinh():
    man = json.loads(zlib.decompress(open(MANIFEST, "rb").read()))
    p = os.path.join(ROOT, "website", "game", man["template/templates.bin"])
    if not os.path.exists(p): sys.exit(f"!! templates.bin manifest đang trỏ ({man['template/templates.bin']}) không có ở máy — truyền --client")
    return p


class Client:
    def __init__(self, path):
        tb = _tb(); d = zlib.decompress(open(path, "rb").read())
        tpl, loi = tb.mo_phong(d)
        if loi: sys.exit("!! templates.bin hỏng: " + loi)
        self.tb, self.tpl, self._cache = tb, tpl, {}

    def bang(self, ten):
        if ten not in self._cache:
            rows = self.tpl.get(ten) or []; out = []
            for pl in rows[1:]:
                try: g, _ = self.tb.giai_ma_dong(rows[0], pl)
                except Exception: break
                out.append(g)
            self._cache[ten] = out
        return self._cache[ten]

    def theo_id(self, ten):
        return {list(g.values())[0]: g for g in self.bang(ten)}


class Ten:
    """Tên hiển thị của client cho tướng / vật phẩm / phe / trận hình."""
    def __init__(self, cl):
        self.lib = {g["ID"]: g["目标文本"] for g in cl.bang("文本库")}
        self.tuong_theo_mau, self.phe_theo_mau, self.tuong_theo_id = {}, {}, {}
        for g in cl.bang("英雄基础"):
            ten = N(self.lib.get(g["英雄名YID"], "")) if g["英雄名YID"] else ""
            self.tuong_theo_id[g["英雄ID"]] = ten
            if g["原型ID"] not in self.tuong_theo_mau and ten:
                self.tuong_theo_mau[g["原型ID"]] = ten; self.phe_theo_mau[g["原型ID"]] = g["阵营"]
        self.tran_hinh = {g["阵法ID"]: g["名称"] for g in cl.bang("阵法配置")}
        self.vat_pham = {g["物品ID"]: g["名称"] for g in cl.bang("基础物品")}
        self.trang_bi = {g["装备ID"]: g["名称"] for g in cl.bang("装备表")}
        self.manh = {g["碎片ID"]: g["名称"] for g in cl.bang("碎片")}
        self.than_khi = {g["仙器ID"]: g["名称"] for g in cl.bang("仙器基础")}
        self.hon_ngoc = {g["ID"]: g["名称"] for g in cl.bang("命格基础")}
        self.bi_kip = {g["符文类型ID"]: g["名称"] for g in cl.bang("符文基础")}

    def tuong(self, id_):
        id_ = str(id_).strip()
        return self.tuong_theo_mau.get(id_) or self.tuong_theo_id.get(id_) or self.tuong_theo_mau.get(id_[:4] + "00") or ("Tướng " + id_)

    def thuong(self, phan):
        """'loại:id:số' -> (tên, số)."""
        p = phan.split(":")
        if len(p) < 2: return None, None
        loai, id_ = p[0], p[1]; so = p[2] if len(p) > 2 else ""
        if loai == "0": ten = self.vat_pham.get(VI_VAT_PHAM.get(id_, ""), "Tiền tệ " + id_)
        elif loai == "1": ten = self.tuong(id_)
        elif loai == "2": ten = self.trang_bi.get(id_, "Trang bị " + id_)
        elif loai == "3": ten = self.vat_pham.get(id_, "Vật phẩm " + id_)
        elif loai == "4": ten = "Mảnh " + self.manh.get(id_, id_)
        elif loai == "5": ten = self.bi_kip.get(id_, "Bí kíp " + id_)
        elif loai == "6": ten = self.hon_ngoc.get(id_, "Thú hồn " + id_)
        elif loai == "7": ten = self.than_khi.get(id_, "Thần khí " + id_)
        else: ten = "Vật phẩm " + id_
        return ten, so


def the(x): return f"<{MAU} {x}>"


def so_dep(so):
    """'2000000' -> '2M' (cùng cách với chuan-hoa-dich.so_dep); chuỗi không phải số giữ nguyên."""
    try: v = int(str(so))
    except ValueError: return so
    for nguong, hau in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "K")):
        if v >= nguong and v % (nguong // 100) == 0:
            x = v / nguong; t = f"{x:.2f}".rstrip("0").rstrip(".")
            return t.replace(".", ",") + hau
    return str(v)


def mo_ta_thu_thach(g, ten):
    """Sinh mô tả từ cột luật. None = giữ nguyên (loại lạ)."""
    loai, tham, phep, moc = (g.get("挑战类型") or "").strip(), (g.get("挑战参数") or "").strip(), (g.get("检测操作") or "").strip(), (g.get("目标值") or "").strip()
    if loai == "100": return "Thắng trận"
    if loai == "101": return f"Thắng trong vòng {the(moc)} hiệp"
    if loai == "102": return f"Thắng bằng trận hình {the(ten.tran_hinh.get(tham, tham))}"
    if loai in ("103", "104"):
        x = (NGHE if loai == "103" else PHE).get(tham, tham)
        if phep == "1" and moc in ("0", ""): return f"Không ra trận tướng {the(x)}"
        if phep == "1": return f"Ra trận tối đa {the(moc)} tướng {the(x)}"
        if phep == "2": return f"Ra trận ít nhất {the(moc)} tướng {the(x)}"
        return f"Ra trận đúng {the(moc)} tướng {the(x)}"
    if loai in ("105", "106"):
        ds = ", ".join(the(ten.tuong(t)) for t in tham.split("#") if t.strip())
        return ("Phải ra trận " if loai == "105" else "Không ra trận ") + ds
    if loai == "200": return "Không có đồng đội tử trận"
    if loai == "201": return f"Khi thắng, mọi tướng còn từ {the(moc + '%')} HP"
    return None


def chuan_the(s):
    return THE_DINH.sub(lambda m: f"<{m.group(1)} {m.group(2)}>", s)


def ra_soat(cl, ten, goc_cn):
    sua, ghi_chu = {}, []
    def dat(bang, id_, cot, moi, cu):
        moi = N(moi) if moi is not None else None
        if moi is None or moi == N(cu): return
        sua.setdefault(bang, {}).setdefault(str(id_), {})[cot] = moi

    # 0. thẻ màu dính mã ở mọi ô chữ
    n_the = 0
    for bang in cl.tpl:
        for g in cl.bang(bang):
            for cot, v in g.items():
                if isinstance(v, str) and THE_DINH.search(v):
                    dat(bang, list(g.values())[0], cot, chuan_the(v), v); n_the += 1
    ghi_chu.append(f"thẻ màu dính mã: {n_the} ô")

    # 1. mô tả thử thách
    for bang in ("命格关卡挑战", "融合神殿挑战要求"):
        n = 0
        for g in cl.bang(bang):
            if not (g.get("挑战类型") or "").strip(): continue
            moi = mo_ta_thu_thach(g, ten)
            if moi is None: ghi_chu.append(f"{bang} {list(g.values())[0]}: loại {g['挑战类型']} chưa có khuôn, giữ nguyên"); continue
            dat(bang, list(g.values())[0], "挑战描述", moi, g["挑战描述"]); n += 1
        ghi_chu.append(f"{bang}: sinh lại {n} mô tả")

    # 2. biệt danh PVP viết thường
    for g in cl.bang("全局变量"):
        if g["ID"] in ("9231", "9232", "9233", "9234") and g["参数"]:
            dat("全局变量", g["ID"], "参数", g["参数"][0].upper() + g["参数"][1:], g["参数"])

    # 3. nhiệm vụ thăng sao gọi tên Kim Dung
    for g in cl.bang("任务库"):
        if "Kiếm Ma" in (g.get("任务描述") or "") and g.get("行为ID") == "44":
            m = re.search(r"(\d+) sao", g["任务描述"])
            if m: dat("任务库", g["ID"], "任务描述", f"Thăng {ten.tuong(g['事件参数'])} lên {m.group(1)} sao", g["任务描述"])

    # 4. gói tự chọn 14 sao: tên 6 tướng theo YID hiện tại (bản cũ ghi Chu Bá Thông, Trương Tam Phong…)
    for g in cl.bang("基础物品"):
        if g["物品ID"] == "501124":
            ds = [N(ten.lib.get(y, "")) for y in ("101060001", "101060002", "101060003", "101060004", "101060005", "101060007")]
            dat("基础物品", "501124", "描述", "Có thể tự chọn nhận một tướng hiếm 14 sao: " + ", ".join(x for x in ds if x), g["描述"])

    # 5. ảnh đại diện / hình phiêu lưu tên "Chu Điên": tên theo điều kiện mở (tướng 100600)
    for bang, cot in (("头像", "条件值"), ("冒险形象", "条件值")):
        for g in cl.bang(bang):
            if g["名称"] == "Chu Điên": dat(bang, g["ID"], "名称", ten.tuong(g[cot]), g["名称"])

    # 6. 藏品推荐.适用英雄: tên thần thoại -> nguyên mẫu -> tên + phe hiện tại
    if goc_cn:
        mau_theo_cn = {}
        for mau, cn in goc_cn.items(): mau_theo_cn.setdefault(cn, []).append(mau)
        thieu = set()
        for g in cl.bang("藏品推荐"):
            v = g.get("适用英雄") or ""
            if "<" not in v: continue
            nhom = {}
            for doan in v.split(";"):
                if ":" not in doan: continue
                nhan, phan = doan.split(":", 1)
                phe_goc = PHE_GOC.get(N(nhan), "")
                for m in re.finditer(r"<\d+ ([^>]*)>", phan):
                    tv = N(m.group(1)); cn = THAN_THOAI.get(tv)
                    ung = sorted(mau_theo_cn.get(cn, []), key=int) if cn else []
                    if not ung: thieu.add(tv); continue
                    mau = next((u for u in ung if ten.phe_theo_mau.get(u) == phe_goc), ung[0])
                    nhom.setdefault(ten.phe_theo_mau.get(mau, "0"), []).append(ten.tuong(mau))
            if not nhom: continue
            moi = "; ".join(f"{PHE.get(p, 'Phe ' + p)}: " + ", ".join("<2408 %s>" % x for x in dict.fromkeys(ds)) for p, ds in sorted(nhom.items()))
            dat("藏品推荐", g["ID"], "适用英雄", moi, v)
        if thieu: ghi_chu.append("藏品推荐: không tra được " + ", ".join(sorted(thieu)))
    else:
        ghi_chu.append("藏品推荐: bỏ qua (không đọc được *原始文本 của 文本库 máy chủ)")

    # 7. buff: chữ nổi + tên/mô tả buff Vũ Thần
    for g in cl.bang("buff"):
        bid = list(g.values())[0]
        if g.get("触发飘字") in BUFF_NOI: dat("buff", bid, "触发飘字", BUFF_NOI[g["触发飘字"]], g["触发飘字"])
        for cot in ("名称", "新增飘字"):
            if g.get(cot) in BUFF_TEN: dat("buff", bid, cot, BUFF_TEN[g[cot]], g[cot])
        mt = g.get("描述") or ""
        if mt in BUFF_MO_TA: dat("buff", bid, "描述", BUFF_MO_TA[mt], mt)
        else:
            m = BUFF_MO_TA_RE[0].fullmatch(mt)
            if m: dat("buff", bid, "描述", BUFF_MO_TA_RE[1].format(m.group(1)), mt)

    # 8. cửa hàng 7 ngày: tên = vật phẩm đầu của phần thưởng
    for g in cl.bang("循环七天乐商店"):
        if CJK.search(g.get("名称") or ""):
            t, _ = ten.thuong((g.get("奖励") or "").split("#")[0])
            if t: dat("循环七天乐商店", g["ID"], "名称", t, g["名称"])

    # 9. chi tiết thưởng sinh lại từ cột thưởng
    for bang, cot_thuong, cot in THUONG_CHI_TIET:
        for g in cl.bang(bang):
            if CJK.search(g.get(cot) or ""):
                ds = [ten.thuong(p)[0] for p in (g.get(cot_thuong) or "").split("#") if p]
                if ds: dat(bang, list(g.values())[0], cot, ", ".join(dict.fromkeys(x for x in ds if x)), g[cot])
    for g in cl.bang("循环商城商品"):
        if CJK.search(g.get("描述") or ""):
            ds = []
            for p in (g.get("奖励") or "").split("#"):
                if not p: continue
                t, so = ten.thuong(p)
                ds.append("%s*%s" % (t, so_dep(so)))
            if ds: dat("循环商城商品", g["ID"], "描述", ", ".join(ds), g["描述"])

    # 10. dịch cố định theo giá trị
    for (bang, cot), bang_dich in GIA_TRI.items():
        for g in cl.bang(bang):
            v = g.get(cot)
            if v in bang_dich: dat(bang, list(g.values())[0], cot, bang_dich[v], v)
    for g in cl.bang("暑期大作战基础"):
        v = g.get("活动名称") or ""
        if CJK.search(v) and v not in GIA_TRI[("暑期大作战基础", "活动名称")] and goc_cn:
            mau = next((m for m, cn in goc_cn.items() if cn == v), None)
            if mau: dat("暑期大作战基础", g["活动ID"], "活动名称", "Đại chiến mùa hè — " + ten.tuong(mau), v)

    # (4 tiểu sử 原型对应羁绊组.英雄故事 có chữ Hán/Nhật là tên gốc trong ngoặc của bio One Piece — đúng,
    #  không đụng; bản máy chủ là bio Kim Dung nên càng không lấy.)
    return sua, ghi_chu


# ---------- máy chủ: excel-src ----------
def _index_server():
    ix = {}
    for p in glob.glob(os.path.join(XLS, "*", "_index.json")):
        for sh in json.load(open(p, encoding="utf-8"))["sheets"]:
            ix.setdefault(sh["name"], []).append(os.path.join(os.path.dirname(p), sh["file"]))
    return ix


def _sheet_server(ten_sheet):
    out = {}
    for f in _index_server().get(ten_sheet, []):
        j = json.load(open(f, encoding="utf-8")); hdr = j["rows"][0]
        for r in j["rows"][1:]:
            if r and r[0] not in (None, ""): out[str(r[0]).strip()] = {hdr[i]: (r[i] if i < len(r) else None) for i in range(len(hdr))}
    return out


def goc_chu_han(cl):
    """原型ID -> tên gốc chữ Hán (cột *原始文本 của 文本库 máy chủ, theo 英雄名YID của client)."""
    f = os.path.join(XLS, "text-localization", "03.json")
    if not os.path.exists(f): return None
    j = json.load(open(f, encoding="utf-8")); h = j["rows"][0]
    if "*原始文本" not in h: return None
    ci, co = h.index("ID"), h.index("*原始文本")
    cn = {str(r[ci]): r[co] for r in j["rows"][1:] if r and r[ci] not in (None, "") and isinstance(r[co], str)}
    out = {}
    for g in cl.bang("英雄基础"):
        if g["原型ID"] not in out and g["英雄名YID"] in cn: out[g["原型ID"]] = cn[g["英雄名YID"]]
    return out


def ap_server(sua, ghi):
    ix = _index_server(); tk = {}
    for bang, theo_id in sua.items():
        files = ix.get(bang)
        if not files: tk[bang] = "không có sheet máy chủ"; continue
        doi = 0; ids_con = set(theo_id)
        for f in files:
            raw = open(f, encoding="utf-8").read(); j = json.loads(raw); hdr = j["rows"][0]; thay = False
            # giữ đúng khuôn file đang có (đa số gọn một dòng theo excel-to-json.py; vài file còn indent=1)
            dep, xuong_dong = raw.startswith("{\n"), raw.endswith("\n")
            for r in j["rows"][1:]:
                if not r or r[0] in (None, ""): continue
                id_ = str(r[0]).strip()
                if id_ not in theo_id: continue
                ids_con.discard(id_)
                for cot, gt in theo_id[id_].items():
                    if cot not in hdr: continue
                    i = hdr.index(cot)
                    while len(r) <= i: r.append(None)
                    if r[i] != gt: r[i] = gt; doi += 1; thay = True
            if thay and ghi:
                with open(f, "w", encoding="utf-8", newline="\n") as fh:
                    if dep: json.dump(j, fh, ensure_ascii=False, indent=1)
                    else: json.dump(j, fh, ensure_ascii=False, separators=(",", ":"))
                    if xuong_dong: fh.write("\n")
        tk[bang] = f"đổi {doi} ô" + (f", {len(ids_con)} id không có ở máy chủ" if ids_con else "") + (" (chưa ghi)" if not ghi else "")
    return tk


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--client", help="templates.bin hiện tại (mặc định: file manifest trỏ tới)")
    ap.add_argument("--ra", default=RA_MAC_DINH, help="ghi sua.json cho templates-bin.py sua")
    ap.add_argument("--apply-server", action="store_true", help="ghi thẳng vào server/excel-src")
    a = ap.parse_args()
    cl = Client(a.client or client_mac_dinh()); ten = Ten(cl)
    sua, ghi_chu = ra_soat(cl, ten, goc_chu_han(cl))
    for x in ghi_chu: print("  -", x)
    tong = sum(len(m) for b in sua.values() for m in b.values())
    print(f"client: {tong} ô ở {len(sua)} bảng")
    for b, m in sua.items(): print(f"    {b:16s} {sum(len(x) for x in m.values()):4d} ô, {len(m)} dòng")
    os.makedirs(os.path.dirname(a.ra), exist_ok=True)
    with open(a.ra, "w", encoding="utf-8") as fh: json.dump(sua, fh, ensure_ascii=False, indent=1)
    print("đã ghi", a.ra)
    tk = ap_server(sua, a.apply_server)
    print("máy chủ (excel-src):")
    for b, t in tk.items(): print(f"    {b:16s} {t}")
    wbs = sorted({os.path.basename(os.path.dirname(f)) for b in sua for f in _index_server().get(b, [])})
    print("workbook cần biên dịch lại:", " ".join(wbs))


if __name__ == "__main__":
    main()
