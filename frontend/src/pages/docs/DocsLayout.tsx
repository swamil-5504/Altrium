import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Search, Github, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getDocGroups, palette } from "./_shared";

const DocsLayout = () => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const location = useLocation();
  const DOC_GROUPS = useMemo(() => getDocGroups(t), [t, i18n.language]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    DOC_GROUPS.reduce((acc, g) => ({ ...acc, [g.id]: true }), {} as Record<string, boolean>)
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* Close the mobile drawer on every navigation */
  useEffect(() => {
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_GROUPS;
    return DOC_GROUPS.map((g) => ({
      ...g,
      links: g.links.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q)
      ),
    })).filter((g) => g.links.length > 0);
  }, [query, DOC_GROUPS]);

  const currentLabel = useMemo(() => {
    for (const g of DOC_GROUPS) {
      const hit = g.links.find((l) => l.to === location.pathname);
      if (hit) return { group: g.label, page: hit.label };
    }
    return { group: t("docsUi.documentation"), page: t("docsUi.overview") };
  }, [DOC_GROUPS, location.pathname, t]);

  return (
    <div className={`min-h-screen ${palette.pageBg} ${palette.text}`}>
      <Navbar />

      <div className="container mx-auto px-4 max-w-[1280px] pt-20">
        {/* Breadcrumb + mobile nav toggle */}
        <div className="flex items-center justify-between gap-3 pt-2 pb-4">
          <div className={`flex items-center gap-1.5 text-[12px] ${palette.textMuted}`}>
            <Link to="/" className={`hover:${palette.accent} transition-colors`}>
              {t("dashboard.home")}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/docs" className={`hover:${palette.accent} transition-colors`}>
              {t("navbar.docs")}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className={`${palette.textFaint}`}>{currentLabel.group}</span>
            <ChevronRight className="h-3 w-3" />
            <span className={palette.text}>{currentLabel.page}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className={`lg:hidden text-[12px] px-3 py-1.5 rounded-md border ${palette.border} ${palette.panelSoft} ${palette.text}`}
          >
            {mobileNavOpen ? t("docsUi.close") : t("docsUi.menu")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-16">
          {/* Sidebar */}
          <aside
            className={`${
              mobileNavOpen ? "block" : "hidden"
            } lg:block lg:sticky lg:top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto py-6 pr-2 custom-scroll`}
          >
            <div className="relative mb-5">
              <Search
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${palette.textFaint}`}
              />
              <input
                type="text"
                placeholder={t("docsUi.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`w-full pl-10 pr-10 py-3 text-[14px] rounded-xl ${palette.panelSoft} border ${palette.border} focus:outline-none focus:ring-4 focus:ring-[#2563eb]/10 dark:focus:ring-[#60a5fa]/5 focus:border-[#2563eb] dark:focus:border-[#60a5fa] ${palette.text} placeholder:${palette.textFaint} transition-all`}
              />
              <kbd
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded ${palette.kbd} ${palette.textFaint} font-mono`}
              >
                /
              </kbd>
            </div>

            <nav className="text-sm space-y-2">
              {filteredGroups.map((g) => {
                const Icon = g.icon;
                const open = openGroups[g.id] ?? true;
                const activeInside = g.links.some((l) => l.to === location.pathname);
                return (
                  <div key={g.id} className="mb-2">
                    <button
                      onClick={() => setOpenGroups((o) => ({ ...o, [g.id]: !open }))}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-bold tracking-tight transition-all ${
                        activeInside ? palette.text : `${palette.textMuted} hover:${palette.text} hover:bg-muted/5`
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${activeInside ? palette.accent : ""}`} />
                      <span className="flex-1 text-left">{g.label}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"} ${palette.textFaint}`}
                      />
                    </button>
                    {open && (
                      <ul className={`ml-5 my-2 border-l-2 ${palette.borderSoft}`}>
                        {g.links.map((l) => (
                          <li key={l.to}>
                            <NavLink
                              to={l.to}
                              className={({ isActive }) =>
                                `block pl-4 py-1.5 -ml-[2px] border-l-2 text-[13.5px] transition-all ${
                                  isActive
                                    ? `${palette.accentBorder} ${palette.accent} font-bold`
                                    : `border-transparent ${palette.textMuted} hover:${palette.text} hover:border-[#d6d2c7] dark:hover:border-[#2a2a2e]`
                                }`
                              }
                            >
                              {l.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className={`mt-8 pt-5 border-t ${palette.borderSoft} space-y-2`}>
              <a
                href="https://github.com/swamil-5504/Altrium-FYP"
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 text-[12.5px] ${palette.textMuted} hover:${palette.accent} transition-colors`}
              >
                <Github className="h-3.5 w-3.5" />
                {t("docsUi.viewOnGithub")}
              </a>
              <Link
                to="/verify"
                className={`flex items-center gap-2 text-[12.5px] ${palette.textMuted} hover:${palette.accent} transition-colors`}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                {t("docsUi.verifyCredential")}
              </Link>
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <Footer />

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(120,120,120,0.18);
          border-radius: 999px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(120,120,120,0.35);
        }
      `}</style>
    </div>
  );
};

export default DocsLayout;
