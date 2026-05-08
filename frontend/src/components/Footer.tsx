import { Link } from "react-router-dom";
import { Blocks, GraduationCap, Building2, Search, ExternalLink, Github, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t bg-background/50 backdrop-blur-xl">
      {/* Matte Overlay Effect */}
      <div className="absolute inset-0 bg-muted/20 dark:bg-muted/5 pointer-events-none" />

      {/* Main footer grid */}
      <div className="container mx-auto px-6 pt-20 pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-3 group w-fit">
              <div className="w-10 h-10 rounded-xl bg-background border shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                {/* Light mode logo */}
                <img src="/altrium_light.png" alt="Altrium" className="w-full h-full object-cover block dark:hidden" />
                {/* Dark mode logo */}
                <img src="/altrium_dark.png" alt="Altrium" className="w-full h-full object-cover hidden dark:block" />
              </div>
              <span className="font-bold text-xl tracking-tighter">Altrium</span>
            </Link>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-sm font-medium">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-4 mt-2">
               <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-accent transition-colors cursor-pointer border">
                  <Github className="w-4 h-4" />
               </div>
               <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-accent transition-colors cursor-pointer border">
                  <Shield className="w-4 h-4" />
               </div>
            </div>
          </div>

          <div className="lg:col-span-1 hidden lg:block" />

          {/* Product column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent/80">{t("footer.platform")}</p>
            <ul className="flex flex-col gap-4">
              <li>
                <Link
                  to="/student"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-accent/20 group-hover:bg-accent transition-colors" />
                  {t("footer.studentPortal")}
                </Link>
              </li>
              <li>
                <Link
                  to="/login?role=ADMIN"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-accent/20 group-hover:bg-accent transition-colors" />
                  {t("footer.universityAdmin")}
                </Link>
              </li>
              <li>
                <Link
                  to="/verify"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-accent/20 group-hover:bg-accent transition-colors" />
                  {t("footer.verifyDegree")}
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                   <div className="w-1.5 h-1.5 rounded-full bg-accent/20 group-hover:bg-accent transition-colors" />
                  {t("footer.registerInstitution")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent/80">{t("footer.resources")}</p>
            <ul className="flex flex-col gap-4">
              <li>
                <a
                  href="https://sepolia.etherscan.io"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  {t("footer.sepolia")}
                  <ExternalLink className="w-3 h-3 opacity-30" />
                </a>
              </li>
              <li>
                <a
                  href="https://metamask.io"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  {t("footer.metamask")}
                  <ExternalLink className="w-3 h-3 opacity-30" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/swamil-5504/Altrium-FYP"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-[14px] font-medium text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  {t("footer.github")}
                  <ExternalLink className="w-3 h-3 opacity-30" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/50 relative z-10">
        <div className="container mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-muted-foreground">
            {t("footer.copyright", { year: currentYear })}
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/10 text-[10px] font-bold text-accent uppercase tracking-widest">
            <Blocks className="w-3 h-3" />
            <span>{t("footer.bottomLine")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
