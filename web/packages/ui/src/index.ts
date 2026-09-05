// Bộ phần tử dùng chung cho ba app. Cố ý mỏng: kiểu dáng nằm ở base.css (chép từ trang Go
// đang chạy), ở đây chỉ gói lại những khuôn lặp nhiều lần để không sao chép class name.
export { Pill } from "./Pill";
export { Toast, useToast } from "./Toast";
export { Field } from "./Field";
export { formatInt } from "./format";
export type { PillTone } from "./Pill";
