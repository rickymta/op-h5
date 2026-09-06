import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useLocation } from "wouter";
import { Page } from "@op/admin-ui";

export function KhongCoTrang() {
  const [loc, setLoc] = useLocation();
  return (
    <Page title="Không có trang này" sub={loc}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Đường vừa mở không khớp trang nào. Có thể đây là dấu trang cũ từ bản Go — các đường
            <code> /cu/… </code> đã bỏ khi thay hẳn sang giao diện mới.
          </Typography>
          <Button variant="contained" onClick={() => setLoc("/")}>
            Về Đội máy chủ
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}
