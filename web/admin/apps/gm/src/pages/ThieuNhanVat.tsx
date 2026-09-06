// Trạng thái rỗng dùng chung cho hai trang thao tác.
//
// Cả nạp tay lẫn gửi thư đều phải gắn với đúng một nhân vật. Thà chặn ở đây còn hơn cho gõ
// đầy biểu mẫu rồi mới báo thiếu — và tuyệt đối không tự đoán "chắc là nhân vật vừa tìm".

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { Page } from "@op/admin-ui";

export function ThieuNhanVat({ viec, onTra }: { viec: string; onTra: () => void }) {
  return (
    <Page title={viec.charAt(0).toUpperCase() + viec.slice(1)} sub="Chưa chọn nhân vật.">
      <Alert severity="info" action={<Button onClick={onTra}>Tra nhân vật</Button>}>
        Tìm và mở nhân vật trước — {viec} luôn gắn với đúng một nhân vật trên đúng một máy chủ.
      </Alert>
    </Page>
  );
}
