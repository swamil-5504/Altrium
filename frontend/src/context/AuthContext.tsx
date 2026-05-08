import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axios from "@/api/axios";
import { useDisconnect } from '@reown/appkit/react';

export interface IUser {
  id: string;
  email: string;
  full_name: string | null;
  role: "ADMIN" | "STUDENT" | "SUPERADMIN" | "EMPLOYER";
  college_name: string | null;
  college_logo: string | null;
  wallet_address: string | null;
  prn_number: string | null;
  telegram_id: string | null;
  telegram_link_token: string | null;
  telegram_bot_link: string | null;
  is_active: boolean;
  is_legal_admin_verified?: boolean;
  created_at: string;
}

interface IAuthContext {
  user: IUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPendingVerification: boolean;
  login: (email: string, password: string, ignoreVerification?: boolean) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: "ADMIN" | "STUDENT" | "SUPERADMIN", collegeName?: string, walletAddress?: string, prnNumber?: string, telegramId?: string) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { disconnect: disconnectWallet } = useDisconnect();

  useEffect(() => {
    const checkAuth = async () => {
      // Legacy cleanup: ensure no tokens are left in localStorage to avoid confusion
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      const token = sessionStorage.getItem("access_token");
      if (token) {
        try {
          const response = await axios.get("/users/me");
          setUser(response.data);
          console.log("Auth restored:", response.data.email, response.data.role);
        } catch (err) {
          console.error("Auth restoration failed:", err);
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
        }
      }
      setIsLoading(false);
    };

    void checkAuth();
  }, []);

  const login = async (email: string, password: string, ignoreVerification = false) => {
    // Clear any existing session before logging in
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setUser(null);

    const response = await axios.post("/auth/login", { email, password, ignore_verification: ignoreVerification });

    sessionStorage.setItem("access_token", response.data.access_token);
    sessionStorage.setItem("refresh_token", response.data.refresh_token);

    const userResponse = await axios.get("/users/me");
    setUser(userResponse.data);
  };

  const register = async (email: string, password: string, fullName: string, role: "ADMIN" | "STUDENT" | "SUPERADMIN", collegeName?: string, walletAddress?: string, prnNumber?: string, telegramId?: string) => {
    const response = await axios.post("/auth/register", {
      email,
      password,
      full_name: fullName,
      role,
      college_name: collegeName || null,
      wallet_address: walletAddress || null,
      prn_number: prnNumber || null,
      telegram_id: telegramId || null
    });
    if (role === "STUDENT" || role === "ADMIN") {
      await login(email, password);
    }
    return response.data;
  };

  const logout = async () => {
    try {
      const refresh_token = sessionStorage.getItem("refresh_token");
      await axios.post("/auth/logout", refresh_token ? { refresh_token } : {});
    } catch {
      // Best-effort: backend logout is optional for stateless JWT.
    } finally {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      setUser(null);
      // Disconnect wallet session via AppKit
      try {
        await disconnectWallet();
      } catch {
        // Wallet may not be connected; ignore
      }
    }
  };

  const refresh = async () => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    if (!refreshToken) return;

    const response = await axios.post("/auth/refresh", { refresh_token: refreshToken });
    sessionStorage.setItem("access_token", response.data.access_token);
    sessionStorage.setItem("refresh_token", response.data.refresh_token);
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get("/users/me");
      setUser(response.data);
    } catch {
      // Silently ignore
    }
  };

  // Unverified ADMIN users should NOT be treated as authenticated
  const isUnverifiedAdmin = user?.role === "ADMIN" && !user?.is_legal_admin_verified;
  const isAuthenticated = !!user && !isUnverifiedAdmin;
  const isPendingVerification = !!user && isUnverifiedAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isPendingVerification,
        login,
        register,
        logout,
        refresh,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

