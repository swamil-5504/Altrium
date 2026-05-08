import React, { useEffect, useState } from "react";
import axios from "@/api/axios";
import { toast } from "sonner";
import { extractErrorMessage } from "@/utils/errors";
import { Navbar } from "@/components/Navbar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Upload, CreditCard, Clock, Shield, XCircle, ArrowRight, Eye, User as UserIcon, Mail, Building2, FileText, MessageSquare, RefreshCcw, Send, Loader2, CheckCircle2, X } from "lucide-react";

type DegreeType = "BTECH" | "BSC" | "MTECH" | "MBA";

const DEGREE_TYPE_OPTIONS: { value: DegreeType; label: string }[] = [
  { value: "BTECH", label: "BTech" },
  { value: "BSC", label: "BSc" },
  { value: "MTECH", label: "MTech" },
  { value: "MBA", label: "MBA" },
];
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

type CredentialStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Credential {
  id: string;
  title: string;
  description?: string | null;
  metadata_json?: Record<string, unknown> | null;
  prn_number?: string | null;
  status: CredentialStatus;
  tx_hash?: string | null;
  token_id?: number | null;
  document_uid?: string | null;
  has_document?: boolean;
  created_at: string;
}

const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  const approvedCount = submissions.filter((sub) => sub.status === "APPROVED").length;
  const rejectedCount = submissions.filter((sub) => sub.status === "REJECTED").length;
  const pendingCount = submissions.filter((sub) => sub.status === "PENDING").length;

  const [showForm, setShowForm] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkData, setLinkData] = useState<{ link: string; token: string } | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkConnected, setLinkConnected] = useState(false);
  const [formData, setFormData] = useState({
    prn_number: user?.prn_number || "",
    studentName: user?.full_name || "",
    entryYear: "",
    passingYear: "",
    cgpa: "",
    credits: "",
    degree_type: "" as DegreeType | "",
    description: "",
    college_name: user?.college_name || "",
  });

  // Keep form data in sync with user if user profile loads late
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        prn_number: prev.prn_number || user.prn_number || "",
        studentName: prev.studentName || user.full_name || "",
        college_name: prev.college_name || user.college_name || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    void fetchSubmissions();
    const interval = setInterval(() => {
      void fetchSubmissions(true);
    }, 10000); // Poll every 10 seconds for asynchronous state updates
    return () => clearInterval(interval);
  }, []);

  // Poll for telegram link status while not connected so the badge updates
  // automatically once the bot's /start fires.
  useEffect(() => {
    if (user?.telegram_id) return;
    const interval = setInterval(() => {
      void refreshUser();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.telegram_id, refreshUser]);

  const fetchSubmissions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get("/degrees");
      setSubmissions(response.data);
    } catch (err) {
      console.error(err);
      if (!silent) toast.error(t("studentDashboard.toasts.loadFailed"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleViewDocument = async (credentialId: string) => {
    const loadingToast = toast.loading(t("studentDashboard.toasts.loadingDocument"));
    try {
      const response = await axios.get(`/degrees/${credentialId}/document`, {
        responseType: "blob",
      });
      toast.dismiss(loadingToast);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error(err);
      toast.error(t("studentDashboard.toasts.documentFailed"));
    }
  };

  const handleOpenLinkModal = async () => {
    setLinkLoading(true);
    setLinkConnected(false);
    setLinkModalOpen(true);
    try {
      const response = await axios.get("/telegram/link-token");
      setLinkData({ link: response.data.link, token: response.data.token });
      await refreshUser();
    } catch (err) {
      toast.error("Failed to generate Telegram link");
      setLinkModalOpen(false);
    } finally {
      setLinkLoading(false);
    }
  };

  // While the link modal is open, poll /users/me until the bot's /start
  // fires and binds telegram_id, then surface a confirmation and auto-close.
  useEffect(() => {
    if (!linkModalOpen || linkConnected) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get("/users/me");
        if (res.data?.telegram_id) {
          setLinkConnected(true);
          await refreshUser();
          clearInterval(interval);
          setTimeout(() => setLinkModalOpen(false), 1500);
        }
      } catch {
        // ignore — keep polling until modal closes
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [linkModalOpen, linkConnected, refreshUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.prn_number || !formData.degree_type) {
      toast.error(t("studentDashboard.toasts.requiredFields"));
      return;
    }

    try {
      const studentBasicsPayload = {
        studentName: formData.studentName,
        passingYear: formData.passingYear,
        entryYear: formData.entryYear,
        cgpa: formData.cgpa,
        credits: formData.credits,
      };

      const titleLabel =
        DEGREE_TYPE_OPTIONS.find((o) => o.value === formData.degree_type)?.label
        ?? formData.degree_type;

      await axios.post("/degrees", {
        title: titleLabel,
        degree_type: formData.degree_type,
        description: formData.description || null,
        prn_number: formData.prn_number,
        college_name: formData.college_name,
        metadata_json: studentBasicsPayload,
      });

      toast.success(t("studentDashboard.toasts.submitSuccess"));
      setShowForm(false);
      setFormData({
        prn_number: "",
        studentName: "",
        entryYear: "",
        passingYear: "",
        cgpa: "",
        credits: "",
        degree_type: "",
        description: "",
        college_name: "",
      });

      await fetchSubmissions();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, t("studentDashboard.toasts.submitFailed")));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Premium Matte Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <div className="flex flex-col gap-6 mb-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("studentDashboard.title")}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border shadow-sm text-xs font-bold">
                    <UserIcon className="w-3.5 h-3.5 text-accent" />
                    <span>{user?.full_name || t("studentDashboard.fallbackStudent")}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border shadow-sm text-xs font-medium text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border shadow-sm text-xs font-medium text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{user?.college_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Telegram Matte Indicator */}
                <div className={`flex items-center gap-3 p-2.5 rounded-2xl border bg-background shadow-sm ${user?.telegram_id ? "border-success/20" : "border-border"}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${user?.telegram_id ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="pr-2">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{user?.telegram_id ? "Connected" : "Not Linked"}</p>
                    <div className="flex items-center gap-2">
                      {user?.telegram_id ? (
                        <span className="text-[10px] font-bold text-success/80">ID: {user.telegram_id}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenLinkModal}
                          className="text-[10px] font-bold text-accent hover:underline"
                        >Link Bot</button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowForm(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/10 active:scale-[0.98]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t("studentDashboard.newSubmission")}
                </button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={50}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <div className="rounded-[2rem] border-2 border-border/5 bg-background p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t("studentDashboard.pendingReview")}</p>
                <div className="text-4xl font-bold tabular-nums">{pendingCount}</div>
                <p className="text-xs font-medium text-muted-foreground/60 mt-3">{t("studentDashboard.pendingReviewDesc")}</p>
              </div>
              <div className="rounded-[2rem] border-2 border-border/5 bg-background p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t("studentDashboard.approved")}</p>
                <div className="text-4xl font-bold tabular-nums text-success">{approvedCount}</div>
                <p className="text-xs font-medium text-muted-foreground/60 mt-3">{t("studentDashboard.approvedDesc")}</p>
              </div>
              <div className="rounded-[2rem] border-2 border-border/5 bg-background p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t("studentDashboard.rejected")}</p>
                <div className="text-4xl font-bold tabular-nums text-destructive">{rejectedCount}</div>
                <p className="text-xs font-medium text-muted-foreground/60 mt-3">{t("studentDashboard.rejectedDesc")}</p>
              </div>
            </div>
          </ScrollReveal>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Matte Overlay */}
              <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowForm(false)} />
              
              <ScrollReveal>
                <form 
                  onSubmit={handleSubmit} 
                  className="relative w-full max-w-2xl p-10 rounded-[2.5rem] bg-background border-2 border-border/10 shadow-[0_30px_100px_rgba(0,0,0,0.15)] space-y-8 overflow-y-auto max-h-[90vh]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">New Application</div>
                      <h3 className="font-bold text-3xl tracking-tight">{t("studentDashboard.form.title")}</h3>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="w-12 h-12 rounded-2xl bg-muted/40 hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <XCircle className="w-6 h-6 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.prnNumber")}</label>
                      <input
                        type="text"
                        value={formData.prn_number}
                        readOnly
                        className="w-full px-5 py-3.5 rounded-2xl border bg-muted/50 text-sm font-mono text-accent cursor-not-allowed outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.studentName")}</label>
                      <input
                        type="text"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        placeholder={t("studentDashboard.form.studentNamePlaceholder")}
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.degreeTitle")}</label>
                      <select
                        value={formData.degree_type}
                        onChange={(e) =>
                          setFormData({ ...formData, degree_type: e.target.value as DegreeType | "" })
                        }
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select degree type…</option>
                        {DEGREE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.university")}</label>
                      <input
                        type="text"
                        value={formData.college_name}
                        readOnly
                        className="w-full px-5 py-3.5 rounded-2xl border bg-muted/50 text-sm font-bold opacity-60 cursor-not-allowed outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.description")}</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t("studentDashboard.form.descriptionPlaceholder")}
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.entryYear")}</label>
                      <input
                        type="text"
                        value={formData.entryYear}
                        onChange={(e) => setFormData({ ...formData, entryYear: e.target.value })}
                        placeholder={t("studentDashboard.form.entryYearPlaceholder")}
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.passingYear")}</label>
                      <input
                        type="text"
                        value={formData.passingYear}
                        onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })}
                        placeholder={t("studentDashboard.form.passingYearPlaceholder")}
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.cgpa")}</label>
                      <input
                        type="text"
                        value={formData.cgpa}
                        onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                        placeholder={t("studentDashboard.form.cgpaPlaceholder")}
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">{t("studentDashboard.form.credits")}</label>
                      <input
                        type="text"
                        value={formData.credits}
                        onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                        placeholder={t("studentDashboard.form.creditsPlaceholder")}
                        required
                        className="w-full px-5 py-3.5 rounded-2xl border bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-accent/[0.03] border border-accent/10">
                    <CreditCard className="w-5 h-5 text-accent shrink-0" />
                    <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">
                      Your university will issue your degree directly using the official cohort records. No further uploads are required from your side.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 rounded-[1.25rem] bg-accent text-accent-foreground font-bold hover:opacity-90 transition-all shadow-xl shadow-accent/20 active:scale-[0.98]"
                    >
                      {t("studentDashboard.form.submitAndPay")}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-8 py-4 rounded-[1.25rem] bg-muted/50 text-muted-foreground font-bold hover:bg-muted transition-colors active:scale-[0.98]"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              </ScrollReveal>
            </div>
          )}

          <ScrollReveal delay={100}>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t("studentDashboard.yourSubmissions")}</h3>

              {loading ? (
                <div className="text-center py-10 opacity-70">{t("studentDashboard.loadingSubmissions")}</div>
              ) : submissions.length === 0 ? (
                <div className="p-8 border rounded-xl bg-card text-center text-muted-foreground">
                  {t("studentDashboard.noSubmissions")}
                </div>
              ) : (
                submissions.map((sub) => {
                  const meta = (sub.metadata_json ?? {}) as Record<string, unknown>;
                  const studentName = typeof meta.studentName === "string" ? meta.studentName : "-";
                  return (
                    <div
                      key={sub.id}
                      className="p-5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-medium">{sub.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t("studentDashboard.prnLabel")} <span className="font-mono">{sub.prn_number ?? "-"}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("studentDashboard.submittedOn", { date: new Date(sub.created_at).toLocaleDateString() })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{t("studentDashboard.studentLabel", { name: studentName })}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        {sub.status === "PENDING" && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {t("studentDashboard.pendingReview")}
                          </span>
                        )}

                        {sub.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                            <Shield className="w-3 h-3" />
                            {t("studentDashboard.approved")}
                          </span>
                        )}

                        {sub.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            {t("studentDashboard.rejected")}
                          </span>
                        )}

                        {sub.status === "APPROVED" && sub.tx_hash && (
                          <span className="text-xs font-mono text-muted-foreground max-w-[180px] truncate" title={sub.tx_hash}>
                            {t("studentDashboard.txLabel")} {sub.tx_hash}
                          </span>
                        )}
                        {sub.status === "APPROVED" && sub.token_id !== null && sub.token_id !== undefined && (
                          <span className="text-xs font-mono text-muted-foreground">{t("studentDashboard.tokenLabel")} {sub.token_id}</span>
                        )}
                        {sub.status === "APPROVED" && sub.document_uid && (
                          <span className="text-xs font-mono text-muted-foreground">{t("studentDashboard.documentIdLabel")} {sub.document_uid}</span>
                        )}

                        {sub.has_document && sub.status === "APPROVED" ? (
                          <button
                            onClick={() => void handleViewDocument(sub.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent/10 text-accent text-[11px] font-bold hover:bg-accent/20 transition-all active:scale-[0.97] border border-accent/20"
                          >
                            <Eye className="w-3 h-3" />
                            {t("studentDashboard.viewApprovedPdf")}
                          </button>
                        ) : sub.has_document ? (
                          <span className="text-xs text-muted-foreground">{t("studentDashboard.documentUploaded")}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>

      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-background border-2 border-border/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] p-10 text-center space-y-8">
            <button
              type="button"
              onClick={() => setLinkModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Link Telegram</h2>
              <p className="text-muted-foreground">
                Connect your Telegram to receive degree status alerts.
              </p>
            </div>

            {linkConnected ? (
              <div className="bg-success/10 border border-success/30 rounded-2xl p-6 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-success">Telegram Connected</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your account is linked. You'll start receiving alerts shortly.
                </p>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-2xl p-6 space-y-4 border">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-accent">Open Telegram & Press Start</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click the button below — Telegram will open and link your account automatically.
                </p>

                {linkLoading || !linkData ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating secure link…
                  </div>
                ) : (
                  <a
                    href={linkData.link}
                    className="block w-full py-2.5 px-5 rounded-xl bg-[#229ED9] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#229ED9]/10 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    Connect Telegram
                  </a>
                )}

                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Waiting for connection…
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
