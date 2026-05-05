import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import axios from "@/api/axios";
import { extractErrorMessage } from "@/utils/errors";


export default function Login() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<"STUDENT" | "ADMIN">(
    searchParams.get("role") === "ADMIN" ? "ADMIN" : "STUDENT"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);



  const { login, logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      if (user.role === "SUPERADMIN") {
        navigate("/superadmin");
      } else if (user.role === "ADMIN") {
        if (user.is_legal_admin_verified) {
          navigate("/university");
        } else {
          navigate("/pending-verification");
        }
      } else if (user.role === "STUDENT") {
        navigate("/student");
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin();
  };

  const performLogin = async () => {
    setLoading(true);
    try {
      await login(email, password, false);

      const me = await axios.get("/users/me");
      const userRole = me.data.role as "ADMIN" | "STUDENT" | "SUPERADMIN";

      if (userRole === "SUPERADMIN") {
        toast.success(t('login.successMessage'));
        navigate("/superadmin");
        return;
      }

      if (userRole === "ADMIN") {
        if (!me.data.is_legal_admin_verified) {
          navigate("/pending-verification");
        } else {
          toast.success(t('login.successMessage'));
          navigate("/university");
        }
      } else if (userRole === "STUDENT") {
        toast.success(t('login.successMessage'));
        navigate("/student");
      }
    } catch (err: unknown) {
      const message = extractErrorMessage(err, t('login.errorMessage'));

      if (message.includes("pending verification")) {
        navigate("/pending-verification");
        return;
      }

      toast.error(message);
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
          <KeyRound className="w-6 h-6 text-accent" />
        </div>

        <h2 className="text-2xl font-bold mb-2">
          {role === "ADMIN" ? t('login.adminRole') : t('login.studentRole')}
        </h2>

        <p className="text-muted-foreground text-sm mb-6">{t('login.subtitle')}</p>

        <div className="grid grid-cols-2 bg-muted p-1 rounded-lg mb-6">
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


        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('login.email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('login.password')}</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-9 pr-12 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                placeholder={t('login.passwordPlaceholder')}
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
            className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold mt-6 hover:opacity-90 transition-all shadow-lg shadow-accent/10 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('login.signingIn')}
              </>
            ) : (
              t('login.signIn')
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="text-accent font-medium hover:underline">
            {t('login.forgotPassword')}
          </Link>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('login.noAccount')}{" "}
          <Link to={`/register?role=${role}`} className="text-accent font-medium hover:underline">
            {t('login.signUp')}
          </Link>
        </div>
      </div>
    </div>
  );
}

