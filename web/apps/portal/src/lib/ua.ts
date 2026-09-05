/**
 * Rút gọn user agent thành "Chrome · Android" cho bảng phiên đang mở. Chỉ cần đủ để người
 * chơi nhận ra "đây có phải máy mình không"; không cần chính xác tới phiên bản.
 */
export function shortUA(ua: string): string {
  const s = ua || "";
  let browser = "Trình duyệt";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/CriOS/.test(s)) browser = "Chrome";
  else if (/FxiOS|Firefox/.test(s)) browser = "Firefox";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";
  else if (!s) return "Không rõ";

  let os = "";
  if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";

  return os ? `${browser} · ${os}` : browser;
}
