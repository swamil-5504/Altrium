import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface NavItem {
  key: string;
  to: string;
  label: string;
  enabled: boolean;
}

export const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  const role = user?.role;
  const navLinks: NavItem[] = [
    ...(!isAuthenticated ? [{ key: "home", to: "/", label: t("dashboard.home"), enabled: true }] : []),
    ...(isAuthenticated ? [
      {
        key: "primary",
        to: role === "SUPERADMIN" ? "/superadmin" : (role === "ADMIN" ? "/university" : "/student"),
        label: role === "SUPERADMIN"
          ? t("navbar.superadminDashboard")
          : (role === "ADMIN" ? t("navbar.submissions") : t("navbar.myDegree")),
        enabled: true,
      }
    ] : []),
    { key: "docs", to: "/docs", label: t("navbar.docs"), enabled: true },
  ];

  const renderNavItem = (link: NavItem) => {
    const isActive = location.pathname === link.to;
    if (!link.enabled) {
      return (
        <span
          key={link.key}
          className="px-3 py-1.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
          aria-disabled="true"
        >
          {link.label}
        </span>
      );
    }
    return (
      <Link
        key={link.key}
        to={link.to}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground"
          }`}
      >
        {link.label}
      </Link>
    );
  };

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-primary">
            <img src="/altrium_light.png" alt="Altrium" className="w-full h-full object-cover block dark:hidden" />
            <img src="/altrium_dark.png" alt="Altrium" className="w-full h-full object-cover hidden dark:block" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">Altrium</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map(renderNavItem)}

          <LanguageSwitcher />

          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("navbar.toggleTheme")}
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </button>

          {isAuthenticated && (
            <Link
              to="/settings"
              className={`p-1.5 rounded-lg transition-colors ${location.pathname === "/settings" ? "text-foreground bg-accent/10" : "text-muted-foreground hover:text-foreground"}`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("common.logout")}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("navbar.login")}
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("navbar.register")}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("navbar.toggleTheme")}
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </button>
          {isAuthenticated && (
            <Link
              to="/settings"
              className={`p-1.5 rounded-lg transition-colors ${location.pathname === "/settings" ? "text-foreground bg-accent/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? t("navbar.closeMenu") : t("navbar.openMenu")}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.to
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-2 mt-2 border-t border-border/50 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-left px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("common.logout")}
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navbar.login")}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("navbar.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
