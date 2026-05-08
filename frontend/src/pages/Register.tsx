import React, { useState, useEffect } from "react";

import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, UserPlus, Mail, KeyRound, Building2, FileText, Eye, EyeOff, Info, Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import axios from "@/api/axios";

export default function Register() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const roleFromQuery = searchParams.get("role") === "ADMIN" ? "ADMIN" : "STUDENT";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<"STUDENT" | "ADMIN">(roleFromQuery);
  const [prnNumber, setPrnNumber] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<string[]>([]);
  const [telegramConnected, setTelegramConnected] = useState(false);

  // After student registration, poll /users/me to detect when the bot
  // /start has fired and bound the telegram_id. Once connected, surface
  // a confirmation and auto-navigate to the dashboard.
  useEffect(() => {
    if (!successData || successData.role !== "STUDENT" || telegramConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get("/users/me");
        if (res.data?.telegram_id) {
          setTelegramConnected(true);
          clearInterval(interval);
          setTimeout(() => navigate("/student"), 1500);
        }
      } catch {
        // ignore — keep polling until popup is closed or component unmounts
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [successData, telegramConnected]);

  useEffect(() => {
    // Pull from the accreditation registry (single source of truth that the
    // backend also uses to gate admin registrations). Falls back silently to
    // the legacy /users/universities endpoint if the registry is unreachable
    // so the page still renders during transient backend errors.
    const fetchUniversities = async () => {
      try {
        const response = await axios.get("/institutions");
        const names = (response.data || []).map((i: { name: string }) => i.name);
        setUniversities(names);
      } catch (err) {
        console.error("Failed to fetch institutions, falling back", err);
        try {
          const fallback = await axios.get("/users/universities");
          setUniversities(fallback.data || []);
        } catch (fallbackErr) {
          console.error("Fallback fetch failed", fallbackErr);
        }
      }
    };
    void fetchUniversities();
  }, []);

  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const user = await register(email, password, fullName, role, collegeName, undefined, prnNumber, "");
      toast.success(t('register.successMessage'));
      setSuccessData(user);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      let errorMessage = t('register.errorMessage');

      if (typeof err === "object" && err && "response" in err) {
        const responseData = (err as any).response?.data;
        if (responseData) {
          if (typeof responseData.detail === "string") {
            errorMessage = responseData.detail;
          } else if (Array.isArray(responseData.detail)) {
            errorMessage = responseData.detail[0]?.msg || "Validation error";
          } else if (responseData.message) {
            errorMessage = responseData.message;
          }
        }
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Premium Matte Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <Link
        to="/"
        className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <div className="absolute top-8 right-8 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md bg-background border-2 border-border/10 rounded-[2rem] p-8 z-10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-300">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
          <UserPlus className="w-6 h-6 text-accent" />
        </div>

        <h2 className="text-2xl font-bold mb-2">{role === "ADMIN" ? t('register.heading') : t('register.heading')}</h2>
        <p className="text-muted-foreground text-sm mb-6">{t('register.subtitle')}</p>

        <div className="grid grid-cols-2 bg-muted p-1 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setRole("STUDENT")}
            className={`py-2 text-sm font-medium rounded-md transition-all ${role === "STUDENT" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t('login.studentRole')}
          </button>
          <button
            type="button"
            onClick={() => setRole("ADMIN")}
            className={`py-2 text-sm font-medium rounded-md transition-all ${role === "ADMIN" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t('login.adminRole')}
          </button>
        </div>

        {role === "STUDENT" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 rounded-xl border border-accent/10 mb-6">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
               Telegram Identity & Alerts Included
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('register.fullName')}</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder={t('register.fullNamePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('register.collegeName')}</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <select
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent appearance-none transition-all cursor-pointer"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                required
              >
                <option value="" disabled>{t('register.collegeNamePlaceholder')}</option>
                {universities.map((uni) => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
            </div>
          </div>

          {role === "STUDENT" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('register.prnNumber')}</label>
              <input
                value={prnNumber}
                onChange={(e) => setPrnNumber(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t('register.prnNumberPlaceholder')}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('register.email')}</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                placeholder={t('register.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('register.password')}</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-9 pr-12 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                placeholder={t('register.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold mt-6 hover:opacity-90 transition-all shadow-lg shadow-accent/10 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('register.creatingAccount')}
              </>
            ) : (
              t('register.signUp')
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t('login.hasAccount')}{" "}
          <Link to={`/login?role=${role}`} className="text-accent font-medium hover:underline">
            {t('login.signIn')}
          </Link>
        </div>
      </div>

      {/* Success Modal / Overlay */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border-2 border-border/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] p-10 text-center space-y-8">
            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
               <UserPlus className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Account Created!</h2>
              <p className="text-muted-foreground">Welcome to Altrium, {successData.full_name || "Student"}.</p>
            </div>

            {successData.role === "STUDENT" ? (
              telegramConnected ? (
                <div className="bg-success/10 border border-success/30 rounded-2xl p-6 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-success">Telegram Connected</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your account is linked. Redirecting to your dashboard…
                  </p>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-2xl p-6 space-y-4 border">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-accent">Next Step: Stay Updated</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect your Telegram to receive instant alerts when your degree is verified or minted on-chain.
                  </p>

                  <a
                    href={successData.telegram_bot_link || `tg://resolve?domain=Altrium_Notification_Bot&start=${successData.telegram_link_token}`}
                    className="block w-full py-2.5 px-5 rounded-xl bg-[#229ED9] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#229ED9]/10 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    Connect Telegram
                  </a>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Waiting for connection…
                  </div>

                  <button
                    onClick={() => navigate("/student")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    I'll do this later, take me to dashboard
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your administrator account has been created. Please continue to your dashboard to complete the verification process.
                </p>
                <button 
                  onClick={() => navigate("/pending-verification")}
                  className="w-full py-3 px-6 rounded-xl bg-accent text-accent-foreground text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/10 active:scale-[0.98]"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

