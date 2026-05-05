import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  User, 
  Building2, 
  Shield, 
  Bell, 
  LogOut, 
  Camera, 
  Check, 
  Loader2, 
  Mail, 
  KeyRound,
  Send,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import axios from "@/api/axios";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "branding" | "security">("profile");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [collegeName, setCollegeName] = useState(user?.college_name || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(user?.college_logo ? `${import.meta.env.VITE_API_URL}${user.college_logo}` : null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.patch("/users/me", {
        full_name: fullName,
        college_name: collegeName
      });
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const res = await axios.post("/users/me/logo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setLogoPreview(`${import.meta.env.VITE_API_URL}${res.data.college_logo}`);
      await refreshUser();
      toast.success("Logo updated successfully");
    } catch (err) {
      toast.error("Failed to upload logo");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error("Please provide both current and new passwords.");
      return;
    }
    setChangingPassword(true);
    try {
      await axios.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword
      });
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  // Superadmins use the dashboard-specific TopBar and don't need this settings page
  if (user.role === "SUPERADMIN") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Shield className="w-12 h-12 text-accent mb-4 opacity-20" />
        <h1 className="text-xl font-bold mb-2">Settings not available for Superadmin</h1>
        <p className="text-sm text-muted-foreground mb-6">System-level controls are managed via the main dashboard.</p>
        <button 
          onClick={() => navigate("/superadmin")}
          className="px-6 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile Information", icon: User },
    ...(user.role === "ADMIN" ? [{ id: "branding", label: "Institutional Branding", icon: Building2 }] : []),
    { id: "security", label: "Account Security", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Navbar />

      {/* Premium Matte Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="pt-32 pb-24 flex-1">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal className="flex items-center gap-4 mb-8">
             <button 
               onClick={() => navigate(-1)}
               className="p-2.5 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
             >
               <ArrowLeft className="w-4 h-4" />
             </button>
             <div>
               <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
               <p className="text-sm text-muted-foreground">Manage your identity and institutional presence.</p>
             </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            {/* Sidebar Navigation */}
            <ScrollReveal delay={100} className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id 
                      ? "bg-accent text-accent-foreground shadow-lg shadow-accent/10" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-border/50">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </ScrollReveal>

            {/* Content Area */}
            <ScrollReveal delay={200} className="glass-card rounded-[2.5rem] border-2 border-accent/5 p-8 md:p-12 shadow-2xl">
              {activeTab === "profile" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Personal Details</h2>
                    <p className="text-sm text-muted-foreground">This information will be displayed on your official issuance records.</p>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                        <div className="relative">
                           <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                           <input 
                             value={fullName}
                             onChange={(e) => setFullName(e.target.value)}
                             className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-accent outline-none transition-all text-sm font-medium"
                             placeholder="Your full name"
                           />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                        <div className="relative">
                           <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                           <input 
                             value={user.email}
                             disabled
                             className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/10 border border-border/50 text-muted-foreground text-sm font-medium cursor-not-allowed"
                           />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/10 active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === "branding" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Institutional Branding</h2>
                    <p className="text-sm text-muted-foreground">Set your official university logo and name for verified credentials.</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-10 items-start">
                    <div className="relative group">
                      <div className="w-40 h-40 rounded-[2.5rem] bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-accent/40">
                         {logoPreview ? (
                           <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                         ) : (
                           <>
                             <Building2 className="w-12 h-12 text-muted-foreground opacity-30 mb-2" />
                             <span className="text-[10px] font-bold text-muted-foreground uppercase">Upload Logo</span>
                           </>
                         )}
                         <input 
                           type="file" 
                           accept="image/*"
                           className="absolute inset-0 opacity-0 cursor-pointer"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) handleLogoUpload(file);
                           }}
                         />
                      </div>
                      <div className="absolute -bottom-2 -right-2 p-3 rounded-2xl bg-accent text-accent-foreground shadow-xl">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                       <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Official University Name</label>
                          <input 
                             value={collegeName}
                             onChange={(e) => setCollegeName(e.target.value)}
                             className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-accent outline-none transition-all text-sm font-medium"
                             placeholder="e.g. Stanford University"
                           />
                       </div>
                       <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                          <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">Branding Tip</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Use a high-resolution transparent PNG logo. This logo will appear on all digital certificates and verification receipts issued by your institution.
                          </p>
                       </div>
                       <button
                        onClick={handleProfileUpdate}
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/10 active:scale-95"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update College Identity"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Account Security</h2>
                    <p className="text-sm text-muted-foreground">Manage your credentials and external connections.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 rounded-[2rem] border bg-muted/10 space-y-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-[#229ED9]/10 text-[#229ED9] flex items-center justify-center">
                             <Send className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="text-sm font-bold">Telegram Identity</p>
                             <p className="text-[10px] text-muted-foreground">Secure alerts and instant notifications.</p>
                           </div>
                         </div>
                         {user.telegram_id ? (
                           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-bold">
                             <Check className="w-3 h-3" /> Connected
                           </div>
                         ) : (
                           <button 
                             onClick={() => window.open(`tg://resolve?domain=${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'Altrium_Notification_Bot'}&start=${user.telegram_link_token}`)}
                             className="px-4 py-2 rounded-xl bg-[#229ED9] text-white text-[10px] font-bold hover:opacity-90 transition-all"
                           >
                             Connect Bot
                           </button>
                         )}
                       </div>
                    </div>

                    <div className="p-6 rounded-[2rem] border bg-muted/10 space-y-4">
                       <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                           <KeyRound className="w-5 h-5" />
                         </div>
                         <div>
                           <p className="text-sm font-bold">Change Password</p>
                           <p className="text-[10px] text-muted-foreground">Update your account access credentials.</p>
                         </div>
                       </div>
                       
                       <form onSubmit={handlePasswordChange} className="space-y-4 pt-2 border-t border-border/50">
                         <div className="grid md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Password</label>
                             <input 
                               type="password"
                               value={oldPassword}
                               onChange={(e) => setOldPassword(e.target.value)}
                               className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-accent outline-none transition-all text-sm font-medium"
                               placeholder="••••••••"
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Password</label>
                             <input 
                               type="password"
                               value={newPassword}
                               onChange={(e) => setNewPassword(e.target.value)}
                               className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border focus:ring-2 focus:ring-accent outline-none transition-all text-sm font-medium"
                               placeholder="••••••••"
                             />
                           </div>
                         </div>
                         <button 
                           type="submit"
                           disabled={changingPassword}
                           className="px-6 py-2.5 rounded-xl bg-muted text-foreground border text-xs font-bold hover:bg-accent hover:text-accent-foreground hover:border-transparent transition-all disabled:opacity-50"
                         >
                           {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                         </button>
                       </form>
                    </div>
                  </div>
                </div>
              )}
            </ScrollReveal>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
