import { useCallback, useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Vai trò được thấy mục này. Bỏ trống = ai cũng thấy. */
  roles?: string[];
}

export interface ShellProps {
  brand: string;
  nav: NavItem[];
  user?: { username: string; role: string } | null;
  onLogout?: () => void;
  /** Dải cảnh báo ngay dưới AppBar (mật khẩu mặc định, bảo trì…). */
  banner?: ReactNode;
  children: ReactNode;
  /**
   * Đường hiện tại để tô mục đang mở. Bỏ trống thì Shell tự đọc `location.pathname` và
   * theo dõi popstate/pushState — đủ cho wouter, nhưng truyền vào thì chắc chắn hơn.
   */
  current?: string;
  /** Tiền tố phục vụ của app con, ví dụ `/gm`. Bị cắt khỏi đường trước khi so với `href`. */
  base?: string;
  /**
   * Điều hướng trong SPA. Không truyền thì Shell dùng `history.pushState` + phát `popstate`
   * — wouter bắt được, nhưng app nên truyền `setLocation` để khỏi phụ thuộc chi tiết đó.
   */
  onNavigate?: (href: string) => void;
}

const WIDE = 240; // ≥1200px
const NARROW = 208; // 900–1200px

/** Đường hiện tại, theo dõi cả `popstate` lẫn hai sự kiện wouter phát khi đổi trang. */
function useCurrentPath(explicit?: string): string {
  const [path, setPath] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname,
  );
  useEffect(() => {
    if (explicit !== undefined) return;
    const on = () => setPath(window.location.pathname);
    const events = ["popstate", "pushState", "replaceState", "hashchange"];
    for (const e of events) window.addEventListener(e, on);
    on();
    return () => {
      for (const e of events) window.removeEventListener(e, on);
    };
  }, [explicit]);
  return explicit ?? path;
}

function strip(path: string, base?: string): string {
  if (!base || base === "/") return path || "/";
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  if (path === b) return "/";
  return path.startsWith(b + "/") ? path.slice(b.length) : path;
}

function isActive(path: string, href: string): boolean {
  if (href === "/") return path === "/" || path === "";
  return path === href || path.startsWith(href + "/");
}

export function Shell({
  brand,
  nav,
  user,
  onLogout,
  banner,
  children,
  current,
  base,
  onNavigate,
}: ShellProps) {
  const theme = useTheme();
  // Ba mốc: ≥1200 ngăn cố định rộng, 900–1200 ngăn cố định hẹp, <900 thu vào nút menu.
  const wide = useMediaQuery(theme.breakpoints.up("lg"));
  const docked = useMediaQuery(theme.breakpoints.up("md"));
  const width = wide ? WIDE : NARROW;

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (docked) setOpen(false);
  }, [docked]);

  const path = strip(useCurrentPath(current), base);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      if (onNavigate) {
        onNavigate(href);
        return;
      }
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [onNavigate],
  );

  const click = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    // Ctrl/Cmd-click mở tab mới là thói quen của người trực — đừng cướp mất.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (/^[a-z]+:/i.test(href)) return; // đường ngoài
    e.preventDefault();
    go(href);
  };

  // Không biết vai trò thì giấu mục có giới hạn: thà thiếu menu còn hơn mời người ta bấm
  // vào thứ máy chủ sẽ từ chối.
  const items = nav.filter((n) => !n.roles?.length || (user ? n.roles.includes(user.role) : false));

  const menu = (
    <Box sx={{ overflowY: "auto", py: 1 }}>
      <List dense disablePadding>
        {items.map((n) => {
          const active = isActive(path, n.href);
          return (
            <ListItemButton
              key={n.href}
              component="a"
              href={(base && base !== "/" ? base.replace(/\/$/, "") : "") + n.href}
              onClick={click(n.href)}
              selected={active}
              sx={{
                mx: 1,
                borderRadius: 1,
                minHeight: 44,
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  "&:hover": { bgcolor: "action.selected" },
                },
                "&.Mui-selected::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                },
              }}
            >
              {n.icon && (
                <ListItemIcon sx={{ minWidth: 36, color: active ? "primary.main" : "text.secondary" }}>
                  {n.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={n.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontWeight: active ? 700 : 500,
                      color: active ? "text.primary" : "text.secondary",
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, md: 60 } }}>
          {!docked && (
            <IconButton edge="start" aria-label="Mở menu" onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Box
            sx={{
              width: 8,
              height: 22,
              borderRadius: 1,
              bgcolor: "primary.main",
              flexShrink: 0,
              display: { xs: "none", sm: "block" },
            }}
          />
          <Typography
            variant="h6"
            noWrap
            sx={{ fontSize: { xs: "0.95rem", md: "1.05rem" }, mr: "auto", minWidth: 0 }}
          >
            {brand}
          </Typography>

          {user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ display: { xs: "none", sm: "block" }, maxWidth: 200 }}
              >
                {user.username}
              </Typography>
              <Chip label={user.role} size="small" variant="outlined" color="primary" />
            </Box>
          )}
          {onLogout &&
            (docked ? (
              <Button size="small" color="inherit" startIcon={<LogoutIcon />} onClick={onLogout}>
                Thoát
              </Button>
            ) : (
              <Tooltip title="Thoát">
                <IconButton aria-label="Thoát" onClick={onLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            ))}
        </Toolbar>
      </AppBar>

      {docked ? (
        <Drawer
          variant="permanent"
          sx={{
            width,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width, boxSizing: "border-box" },
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, md: 60 } }} />
          {menu}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: WIDE, boxSizing: "border-box" } }}
        >
          <Toolbar sx={{ minHeight: 56, gap: 1 }}>
            <Typography variant="subtitle2" noWrap>
              {brand}
            </Typography>
          </Toolbar>
          <Divider />
          {menu}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Toolbar sx={{ minHeight: { xs: 56, md: 60 } }} />
        {banner}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
}
