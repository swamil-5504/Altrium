import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import UniversityAdmin from "./pages/UniversityAdmin.tsx";
import EmployerVerify from "./pages/EmployerVerify.tsx";
import SuperadminDashboard from "./pages/SuperadminDashboard.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Web3Guide from "./pages/Web3Guide.tsx";
import DocsLayout from "./pages/docs/DocsLayout.tsx";
import DocsIndex from "./pages/docs/Index.tsx";
import DocsIntroduction from "./pages/docs/sections/Introduction.tsx";
import DocsQuickstart from "./pages/docs/sections/Quickstart.tsx";
import DocsArchitecture from "./pages/docs/sections/Architecture.tsx";
import DocsRoles from "./pages/docs/sections/Roles.tsx";
import DocsWalkthroughs from "./pages/docs/sections/Walkthroughs.tsx";
import DocsApiReference from "./pages/docs/sections/ApiReference.tsx";
import DocsSmartContracts from "./pages/docs/sections/SmartContracts.tsx";
import DocsSecurity from "./pages/docs/sections/Security.tsx";
import DocsOperations from "./pages/docs/sections/Operations.tsx";
import DocsCli from "./pages/docs/sections/Cli.tsx";
import DocsSupport from "./pages/docs/sections/Support.tsx";
import DocsNotifications from "./pages/docs/sections/Notifications.tsx";
import DocsBulkUpload from "./pages/docs/sections/BulkUploadWizard.tsx";
import DocsLanguageSupport from "./pages/docs/sections/LanguageSupport.tsx";
import PendingVerification from "./pages/PendingVerification.tsx";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";

import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { sepolia } from '@reown/appkit/networks';

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'b56e18d47c72ab683b10814fe9495694';

// Initialize Reown AppKit
createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia],
  metadata: {
    name: 'Altrium Admin',
    description: 'Altrium Institutional Degree Minting',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://altrium.example.com',
    icons: [`${typeof window !== 'undefined' ? window.location.origin : 'https://altrium.example.com'}/favicon.ico`]
  },
  projectId,
  features: {
    email: false,
    socials: false,
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96' // MetaMask
  ],
  allWallets: 'HIDE'
});

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="altrium-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="STUDENT">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/university"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <UniversityAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute requiredRole="SUPERADMIN">
                  <SuperadminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/guide" element={<Web3Guide />} />
            <Route path="/docs" element={<DocsLayout />}>
              <Route index element={<DocsIndex />} />
              <Route path="introduction" element={<DocsIntroduction />} />
              <Route path="quickstart" element={<DocsQuickstart />} />
              <Route path="architecture" element={<DocsArchitecture />} />
              <Route path="roles" element={<DocsRoles />} />
              <Route path="walkthroughs" element={<DocsWalkthroughs />} />
              <Route path="api-reference" element={<DocsApiReference />} />
              <Route path="smart-contracts" element={<DocsSmartContracts />} />
              <Route path="security" element={<DocsSecurity />} />
              <Route path="operations" element={<DocsOperations />} />
              <Route path="cli" element={<DocsCli />} />
              <Route path="support" element={<DocsSupport />} />
              <Route path="notifications" element={<DocsNotifications />} />
              <Route path="bulk-upload-wizard" element={<DocsBulkUpload />} />
              <Route path="language-support" element={<DocsLanguageSupport />} />
            </Route>
            <Route path="/pending-verification" element={<PendingVerification />} />
            <Route path="/verify" element={<EmployerVerify />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
