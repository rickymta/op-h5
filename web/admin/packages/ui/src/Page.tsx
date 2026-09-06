import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
  children: ReactNode;
  /** Trần bề ngang phần nội dung. Bảng rất rộng thì truyền `false` để dùng hết màn hình. */
  maxWidth?: number | false;
}

/**
 * Khung một trang: đường dẫn phụ, tiêu đề, nút thao tác bên phải, rồi nội dung.
 *
 * Trần 1440px là cố ý: trên màn 27" một bảng kéo dài hết bề ngang khiến mắt phải quét ngang
 * cả mét để nối cột đầu với cột cuối. Trang nào thật sự cần thì tự tắt bằng `maxWidth={false}`.
 */
export function Page({ title, sub, actions, breadcrumb, children, maxWidth = 1440 }: PageProps) {
  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        width: "100%",
        maxWidth: maxWidth === false ? "none" : maxWidth,
        mx: "auto",
        boxSizing: "border-box",
      }}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumbs
          separator={<ChevronRightIcon fontSize="small" />}
          sx={{ mb: 1, fontSize: "0.8125rem" }}
          aria-label="đường dẫn"
        >
          {breadcrumb.map((c, i) =>
            c.href && i < breadcrumb.length - 1 ? (
              <Link key={`${c.label}-${i}`} href={c.href} color="text.secondary" underline="hover">
                {c.label}
              </Link>
            ) : (
              <Typography key={`${c.label}-${i}`} color="text.secondary" sx={{ fontSize: "inherit" }}>
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: { xs: 2, md: 3 }, alignItems: { xs: "stretch", sm: "flex-start" } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {sub && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {sub}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>

      {children}
    </Box>
  );
}
