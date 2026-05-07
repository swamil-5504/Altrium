import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ShieldCheck, Shield, ExternalLink, MousePointer2, Wallet, Coins, Settings } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useAuth } from "@/context/AuthContext";
import { useAppKit } from '@reown/appkit/react';
import { toast } from "sonner";

export default function PendingVerification() {
    const navigate = useNavigate();
    const { isPendingVerification, isAuthenticated, refreshUser, user, logout } = useAuth();
    const { close: closeAppKit } = useAppKit();

    // Close any Reown AppKit wallet modal immediately — this page is for unapproved
    // admins and has no wallet connection UI. AppKit auto-reconnect can fire here
    // because it initializes globally in App.tsx.
    useEffect(() => {
        void closeAppKit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Poll every 5 seconds to check if superadmin has approved
    useEffect(() => {
        const interval = setInterval(async () => {
            await refreshUser();
        }, 5000);

        return () => clearInterval(interval);
    }, [refreshUser]);

    // When approval comes through, navigate to admin dashboard
    useEffect(() => {
        if (isAuthenticated && !isPendingVerification) {
            toast.success("Superadmin has approved your login!");
            navigate("/university");
        }
    }, [isAuthenticated, isPendingVerification, navigate]);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Minimal top bar - no Navbar since admin is not logged in */}
            <div className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
                <div className="container mx-auto flex items-center justify-between h-16 px-4">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg shadow-inner flex items-center justify-center overflow-hidden">
                            {/* Light mode logo */}
                            <img src="/altrium_light.png" alt="Altrium" className="w-full h-full object-cover block dark:hidden" />
                            {/* Dark mode logo */}
                            <img src="/altrium_dark.png" alt="Altrium" className="w-full h-full object-cover hidden dark:block" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Altrium</span>
                    </Link>
                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="px-3.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            to="/login?role=ADMIN"
                            className="px-3.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>

            <div className="pt-24 pb-20">
                <div className="container mx-auto px-4 max-w-4xl">
                    <ScrollReveal>
                        <div className="w-full bg-card border rounded-2xl p-8 mb-16 shadow-xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/20 via-accent to-accent/20 animate-pulse" />

                            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6 relative">
                                <Clock className="w-8 h-8 text-accent animate-pulse" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-background rounded-full flex items-center justify-center border border-muted">
                                    <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold mb-3">Verification Pending</h2>
                            <p className="text-muted-foreground mb-6 leading-relaxed max-w-2xl mx-auto">
                                Your institution details and proof of affiliation have been submitted securely.
                                Platform administrators are currently reviewing your application. You will be <b>automatically redirected</b> to the dashboard once your account is approved.
                            </p>

                            <Link
                                to="/"
                                className="inline-flex justify-center items-center gap-2 py-2 px-6 rounded-lg border border-border bg-background text-foreground font-medium hover:bg-muted transition active:scale-[0.98]"
                            >
                                <ArrowLeft className="w-4 h-4" /> Return to Home
                            </Link>
                        </div>
                    </ScrollReveal>


                </div>
            </div>
        </div>
    );
}
