import { useState } from "react";
import {
  BookOpen,
  Rocket,
  Layers,
  Users,
  Code2,
  Blocks,
  Lock,
  Server,
  Terminal,
  LifeBuoy,
  GraduationCap,
  Copy,
  Check,
  Hash,
  Sparkles,
  Upload,
  Mail,
  Languages,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useDocsContent } from "./content";

/* =============================================================
   PALETTE
   Dark  — matt black   (#060607 page, #0a0a0b panels)
   Light — milk white   (#f5f3ee page, #fbfaf6 panels)
   Accent — blue-500/600 (secondary)
   ============================================================= */

export const palette = {
  pageBg: "bg-[#f5f3ee] dark:bg-[#060607]",
  panel: "bg-[#fbfaf6] dark:bg-[#0a0a0b]",
  panelSoft: "bg-[#f1efe8] dark:bg-[#0e0e10]",
  border: "border-[#e6e2d7] dark:border-[#1c1c1f]",
  borderSoft: "border-[#ece8dc] dark:border-[#151518]",
  text: "text-[#1a1a1a] dark:text-[#f3f2ee]",
  textMuted: "text-[#6b6a63] dark:text-[#8a8a8e]",
  textFaint: "text-[#8f8d84] dark:text-[#5a5a5e]",
  accent: "text-[#2563eb] dark:text-[#60a5fa]",
  accentBg: "bg-[#2563eb] dark:bg-[#3b82f6]",
  accentBorder: "border-[#2563eb] dark:border-[#60a5fa]",
  accentSoft: "bg-[#2563eb]/8 dark:bg-[#60a5fa]/10",
  kbd: "bg-[#ece8dc] dark:bg-[#1a1a1d]",
};

/* ------------------------------------------------------------------ */
/* Navigation taxonomy                                                  */
/* ------------------------------------------------------------------ */

export type DocLink = { to: string; label: string; description?: string };
export type DocGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  links: DocLink[];
};

export const getDocGroups = (t: TFunction): DocGroup[] => [
  {
    id: "get-started",
    label: t("docsUi.groups.getStarted"),
    icon: BookOpen,
    links: [
      { to: "/docs/introduction", label: t("docsUi.links.introduction.label"), description: t("docsUi.links.introduction.description") },
      { to: "/docs/quickstart", label: t("docsUi.links.quickstart.label"), description: t("docsUi.links.quickstart.description") },
    ],
  },
  {
    id: "platform",
    label: t("docsUi.groups.platform"),
    icon: Layers,
    links: [
      { to: "/docs/architecture", label: t("docsUi.links.architecture.label"), description: t("docsUi.links.architecture.description") },
      { to: "/docs/roles", label: t("docsUi.links.roles.label"), description: t("docsUi.links.roles.description") },
    ],
  },
  {
    id: "flows",
    label: t("docsUi.groups.guides"),
    icon: GraduationCap,
    links: [
      { to: "/docs/walkthroughs", label: t("docsUi.links.walkthroughs.label"), description: t("docsUi.links.walkthroughs.description") },
    ],
  },
  {
    id: "reference",
    label: t("docsUi.groups.reference"),
    icon: Code2,
    links: [
      { to: "/docs/api-reference", label: t("docsUi.links.apiReference.label"), description: t("docsUi.links.apiReference.description") },
      { to: "/docs/smart-contracts", label: t("docsUi.links.smartContracts.label"), description: t("docsUi.links.smartContracts.description") },
    ],
  },
  {
    id: "platform-ops",
    label: t("docsUi.groups.platformOps"),
    icon: Server,
    links: [
      { to: "/docs/security", label: t("docsUi.links.security.label"), description: t("docsUi.links.security.description") },
      { to: "/docs/operations", label: t("docsUi.links.operations.label"), description: t("docsUi.links.operations.description") },
      { to: "/docs/bulk-upload-wizard", label: t("docsUi.links.bulkUploadWizard.label"), description: t("docsUi.links.bulkUploadWizard.description") },
      { to: "/docs/cli", label: t("docsUi.links.cli.label"), description: t("docsUi.links.cli.description") },
      { to: "/docs/notifications", label: t("docsUi.links.telegramBot.label"), description: t("docsUi.links.telegramBot.description") },
      { to: "/docs/language-support", label: t("docsUi.links.languageSupport.label"), description: t("docsUi.links.languageSupport.description") },
    ],
  },
  {
    id: "help",
    label: t("docsUi.groups.help"),
    icon: LifeBuoy,
    links: [
      { to: "/docs/support", label: t("docsUi.links.support.label"), description: t("docsUi.links.support.description") },
    ],
  },
];

/* Re-export common icons for section pages that want them */
export { BookOpen, Rocket, Layers, Users, Code2, Blocks, Lock, Server, Terminal, LifeBuoy, GraduationCap, Sparkles };

/* ------------------------------------------------------------------ */
/* CodeBlock                                                           */
/* ------------------------------------------------------------------ */

export const CodeBlock = ({ code, lang }: { code: string; lang?: string }) => {
  const docs = useDocsContent();
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      /* no-op */
    }
  };
  return (
    <div
      className={`relative group my-5 rounded-xl overflow-hidden border ${palette.border} ${palette.panelSoft}`}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b ${palette.borderSoft} text-[11px]`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f87171]/70"></span>
          <span className="w-2 h-2 rounded-full bg-[#fbbf24]/70"></span>
          <span className="w-2 h-2 rounded-full bg-[#34d399]/70"></span>
          {lang && (
            <span className={`ml-2 uppercase tracking-wider ${palette.textFaint}`}>
              {lang}
            </span>
          )}
        </div>
        <button
          onClick={onCopy}
          aria-label={docs.shared.copyCode}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${palette.textMuted} hover:${palette.text} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> {docs.shared.copied}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> {docs.shared.copy}
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-6 text-[14px] leading-relaxed">
        <code className={`font-mono ${palette.text} whitespace-pre`}>{code}</code>
      </pre>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Endpoint pill                                                       */
/* ------------------------------------------------------------------ */

const methodColor: Record<string, string> = {
  GET: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  POST: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
  PATCH: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
  DELETE: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
};

export const Endpoint = ({
  method,
  path,
  auth,
  children,
}: {
  method: keyof typeof methodColor;
  path: string;
  auth?: string;
  children: React.ReactNode;
}) => (
  <div
    className={`border ${palette.border} rounded-xl p-4 my-3 ${palette.panel} hover:${palette.accentBorder} transition-colors`}
  >
    <div className="flex items-center gap-3 flex-wrap">
      <span
        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border font-mono tracking-wide ${methodColor[method]}`}
      >
        {method}
      </span>
      <code className={`font-mono text-[13px] ${palette.text} break-all`}>{path}</code>
      {auth && (
        <span
          className={`ml-auto text-[10.5px] ${palette.textMuted} px-2 py-0.5 rounded-md ${palette.kbd} border ${palette.borderSoft}`}
        >
          {auth}
        </span>
      )}
    </div>
    <div className={`mt-3 text-sm ${palette.textMuted} leading-relaxed`}>{children}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Page / Section / Sub                                                */
/* ------------------------------------------------------------------ */

export const DocPage = ({
  kicker,
  title,
  summary,
  children,
}: {
  kicker?: string;
  title: string;
  summary?: string;
  children: React.ReactNode;
}) => (
  <article className="min-w-0 py-12 pb-32 max-w-[840px] mx-auto">
    {kicker && (
      <div className={`text-[12px] uppercase tracking-[0.2em] ${palette.accent} mb-4 font-bold`}>
        {kicker}
      </div>
    )}
    <h1 className={`text-[42px] font-bold tracking-tight ${palette.text} leading-[1.1]`}>
      {title}
    </h1>
    {summary && (
      <p className={`mt-6 text-[18px] ${palette.textMuted} leading-[1.8] max-w-3xl`}>
        {summary}
      </p>
    )}
    <div
      className={`mt-12 space-y-8 text-[16px] leading-[1.8] ${palette.textMuted}`}
    >
      {children}
    </div>
  </article>
);

export const Sub = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => {
  const docs = useDocsContent();
  return (
    <section id={id} className="scroll-mt-24 pt-12 group/sub border-t border-transparent hover:border-border/10 transition-colors">
      <h2
        className={`flex items-center gap-2 text-[26px] font-bold ${palette.text} mb-5 tracking-tight`}
      >
        <a
          href={`#${id}`}
          aria-label={docs.shared.linkToSection(title)}
          className={`opacity-0 group-hover/sub:opacity-100 transition-opacity ${palette.textFaint} hover:${palette.accent}`}
        >
          <Hash className="h-5 w-5" />
        </a>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
};

export const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className={`text-[18px] font-bold ${palette.text} mt-10 mb-4 tracking-tight`}>
    {children}
  </h3>
);

/* Small styled card grid item */
export const InfoCard = ({ title, body }: { title: string; body: string }) => (
  <div className={`rounded-2xl p-6 border ${palette.border} ${palette.panel} shadow-sm`}>
    <div className={`text-[15px] font-bold ${palette.text}`}>{title}</div>
    <div className={`text-[15px] ${palette.textMuted} mt-2 leading-relaxed`}>{body}</div>
  </div>
);

/* Callout box */
export const Callout = ({
  kind = "note",
  children,
}: {
  kind?: "note" | "warn";
  children: React.ReactNode;
}) => {
  const docs = useDocsContent();
  const tone =
    kind === "warn"
      ? "border-amber-500/40 bg-amber-500/10"
      : `${palette.accentBorder} ${palette.accentSoft}`;
  const label = kind === "warn" ? docs.shared.warning : docs.shared.note;
  return (
    <div
      className={`rounded-2xl p-6 border ${tone} text-[15px] leading-relaxed shadow-sm`}
    >
      <div
        className={`text-[12px] uppercase tracking-widest mb-2 font-bold ${kind === "warn" ? "text-amber-700 dark:text-amber-400" : palette.accent
          }`}
      >
        {label}
      </div>
      <div className={palette.textMuted}>{children}</div>
    </div>
  );
};

/* Keyword / inline monospace helper for readability */
export const K = ({ children }: { children: React.ReactNode }) => (
  <code className={`${palette.text} text-[0.92em]`}>{children}</code>
);

/* Bullet list with blue markers */
export const Ul = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-5 space-y-2 marker:text-[#2563eb] dark:marker:text-[#60a5fa]">
    {children}
  </ul>
);

export const Ol = ({ children }: { children: React.ReactNode }) => (
  <ol className="list-decimal pl-5 space-y-2 marker:text-[#2563eb] dark:marker:text-[#60a5fa] marker:font-semibold">
    {children}
  </ol>
);
