import React, { useEffect, useMemo, useState } from "react";
import { generateSVG, getTierInfo } from "@/utils/svgGenerator";
import { ethers, type Eip1193Provider } from "ethers";
import { toast } from "sonner";
import axios from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Navbar } from "@/components/Navbar";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Blocks, Clock, Eye, Shield, XCircle, Wallet, HelpCircle, Users, AlertTriangle, Mail, User as UserIcon, Building2, Upload, ArrowRight, RotateCcw } from "lucide-react";
import BulkUploadWizard from "@/components/BulkUploadWizard";

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type CredentialStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Credential {
  id: string;
  title: string;
  description?: string | null;
  metadata_json?: Record<string, unknown> | null;
  prn_number?: string | null;
  status: CredentialStatus;
  token_id?: number | null;
  tx_hash?: string | null;
  has_document?: boolean;
  college_name?: string | null;
  created_at: string;
}

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  role: "ADMIN" | "STUDENT";
  college_name: string | null;
  wallet_address: string | null;
  prn_number: string | null;
  is_active: boolean;
  created_at: string;
}

// Provide the deployed registry address via environment:
// - VITE_REGISTRY_ADDRESS
// Docker should pass it once you have the on-chain deployment.
const CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS || "";
// TEMP: Bypass blockchain minting and only approve in backend.
const BYPASS_BLOCKCHAIN_APPROVAL = false;

// Minimal ABIs for minting + reading tokenId.
const registryAbi = [
  {
    type: "function",
    name: "uploadDegree",
    inputs: [
      { name: "collegeIdHash", type: "bytes32" },
      { name: "degreeHash", type: "bytes32" },
      { name: "degreeURI", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyDegree",
    inputs: [
      { name: "collegeIdHash", type: "bytes32" },
      { name: "verified", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeDegree",
    inputs: [{ name: "collegeIdHash", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "burnDegree",
    inputs: [{ name: "collegeIdHash", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isDegreeRevoked",
    inputs: [{ name: "collegeIdHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "degreeSBT",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const degreeSbtAbi = [
  {
    type: "function",
    name: "tokenIdByCollegeIdHash",
    inputs: [{ name: "collegeIdHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "DegreeMinted",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "collegeIdHash", type: "bytes32" },
      { indexed: true, name: "issuedBy", type: "address" },
      { indexed: false, name: "degreeHash", type: "bytes32" },
      { indexed: false, name: "tokenURI", type: "string" },
    ],
  },
] as const;

const UniversityAdmin: React.FC = () => {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<"workflow" | "students">("workflow");
  const [workflowPhase, setWorkflowPhase] = useState<1 | 2>(1);
  const [ingestionCompleted, setIngestionCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const { open } = useAppKit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  const [mintingById, setMintingById] = useState<Record<string, boolean>>({});

  // When AppKit connects a wallet that differs from the saved profile address,
  // persist it to the backend. The backend will then call addUniversity() on-chain
  // granting UNIVERSITY_ROLE + VERIFIER_ROLE so the admin can mint degrees.
  useEffect(() => {
    if (!walletAddress || !isConnected) return;
    if (walletAddress.toLowerCase() === user?.wallet_address?.toLowerCase()) return;

    const saveWallet = async () => {
      try {
        await axios.patch("/users/me/wallet", { wallet_address: walletAddress });
        toast.success(t("universityDashboard.toasts.walletLinked"));
        await refreshUser();
      } catch (err) {
        console.error("Failed to save wallet address:", err);
        toast.error(t("universityDashboard.toasts.walletSaveFailed"));
      }
    };
    void saveWallet();
  }, [walletAddress, isConnected]);

  const pendingCredentials = useMemo(
    () => credentials.filter((c) => c.status === "PENDING"),
    [credentials],
  );

  const approvedCredentials = useMemo(
    () => credentials.filter((c) => c.status === "APPROVED"),
    [credentials],
  );

  const totalStudents = students.length;
  const totalPending = pendingCredentials.length;
  const totalApproved = approvedCredentials.length;

  useEffect(() => {
    void fetchCredentials();
  }, [user?.id]);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const [credRes, studRes] = await Promise.all([
        axios.get("/degrees"),
        axios.get("/users/my-students"),
      ]);
      setCredentials(credRes.data);
      setStudents(studRes.data);
    } catch (err) {
      console.error(err);
      toast.error(t("universityDashboard.toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      await open();
    } catch (error: unknown) {
      toast.error(t("universityDashboard.toasts.walletModalFailed"));
    }
  };

  const handleReject = async (credentialId: string) => {
    try {
      await axios.patch(`/degrees/${credentialId}`, { status: "REJECTED" });
      toast.success(t("universityDashboard.toasts.rejected"));
      await fetchCredentials();
    } catch (err) {
      console.error(err);
      toast.error(t("universityDashboard.toasts.rejectFailed"));
    }
  };

  const handleRevoke = async (credentialId: string) => {
    // Find the credential's PRN to compute the on-chain collegeIdHash
    const credential = credentials.find(c => c.id === credentialId);
    if (!credential?.prn_number) {
      toast.error("Cannot find PRN for this credential.");
      return;
    }

    const revokeToast = toast.loading("Revoking on-chain...");
    try {
      // --- On-chain revocation first ---
      if (walletProvider && CONTRACT_REGISTRY_ADDRESS) {
        const provider = new ethers.BrowserProvider(walletProvider as any);
        const signer = await provider.getSigner();
        const registryContract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, registryAbi, signer);
        const combinedString = `${credential.prn_number}-${credential.college_name}-${credential.title}`;
        const collegeIdHash = ethers.keccak256(ethers.toUtf8Bytes(combinedString));
        const tx = await registryContract.revokeDegree(collegeIdHash);
        await tx.wait();
        toast.loading("On-chain revocation confirmed. Updating backend...", { id: revokeToast });
      } else {
        toast.warning("Wallet not connected — revoking on platform only (not on-chain).");
      }

      await axios.patch(`/degrees/${credentialId}/revoke`);
      toast.success("Credential revoked on-chain and on platform.", { id: revokeToast });
      await fetchCredentials();
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke credential.", { id: revokeToast });
    }
  };

  const handleBurnReset = async (credentialId: string) => {
    const credential = credentials.find(c => c.id === credentialId);
    if (!credential?.prn_number) {
      toast.error("Cannot find PRN for this credential.");
      return;
    }

    const burnToast = toast.loading("Burning NFT on-chain...");
    try {
      // 1. On-chain burn
      if (walletProvider && CONTRACT_REGISTRY_ADDRESS) {
        const provider = new ethers.BrowserProvider(walletProvider as any);
        const signer = await provider.getSigner();
        const registryContract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, registryAbi, signer);
        const combinedString = `${credential.prn_number}-${credential.college_name}-${credential.title}`;
        const collegeIdHash = ethers.keccak256(ethers.toUtf8Bytes(combinedString));
        const tx = await registryContract.burnDegree(collegeIdHash);
        await tx.wait();
        toast.loading("On-chain burn confirmed. Resetting submission in database...", { id: burnToast });
      } else {
        toast.warning("Wallet not connected — resetting on platform only (not on-chain).");
      }

      // 2. Backend reset
      await axios.post(`/degrees/${credentialId}/reset`);
      toast.success("Credential burned and submission reset to pending.", { id: burnToast });
      await fetchCredentials();
    } catch (err) {
      console.error(err);
      toast.error("Failed to burn/reset credential.", { id: burnToast });
    }
  };

  const handleViewDocument = async (credentialId: string) => {
    const loadingToast = toast.loading("Loading proof document, please wait...");
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
      toast.error("Failed to load document. It may not have been approved or generated yet.");
    }
  };

  const handleMint = async (credential: Credential) => {
    if (!isAuthenticated) {
      toast.error("Please login as an admin to approve.");
      return;
    }

    if (BYPASS_BLOCKCHAIN_APPROVAL) {
      setMintingById((prev) => ({ ...prev, [credential.id]: true }));
      const loadingToast = toast.loading("Approving submission...");
      try {
        await axios.patch(`/degrees/${credential.id}`, {
          status: "APPROVED",
        });
        toast.success("Submission approved (blockchain bypass enabled).");
        await fetchCredentials();
      } catch (err) {
        console.error(err);
        toast.error("Failed to approve submission.");
      } finally {
        toast.dismiss(loadingToast);
        setMintingById((prev) => ({ ...prev, [credential.id]: false }));
      }
      return;
    }

    if (!CONTRACT_REGISTRY_ADDRESS) {
      toast.error("Missing VITE_REGISTRY_ADDRESS (deployed AltriumRegistry address).");
      return;
    }

    if (!walletProvider) {
      toast.error("Wallet is not connected!");
      return;
    }

    if (!credential.prn_number) {
      toast.error("PRN number is missing for this submission.");
      return;
    }

    setMintingById((prev) => ({ ...prev, [credential.id]: true }));
    const loadingToast = toast.loading(`Minting SBT for ${credential.prn_number} on Sepolia...`);

    try {
      const provider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner();

      const registryContract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, registryAbi, signer);
      const degreeSbtInterface = new ethers.Interface(degreeSbtAbi);

      const universityName = user?.college_name || "Altrium University";

      // collegeIdHash = keccak256(utf8(prn_number + "-" + universityName + "-" + degreeTitle))
      const combinedString = `${credential.prn_number}-${universityName}-${credential.title}`;
      const collegeIdHash = ethers.keccak256(ethers.toUtf8Bytes(combinedString));

      // degreeHash = keccak256(utf8(JSON.stringify(studentBasicsPayload)))
      const m = (credential.metadata_json ?? {}) as Record<string, unknown>;
      const extractedStudentName = typeof m.studentName === "string" ? m.studentName : (typeof m.name === "string" ? m.name : "Student");
      const studentBasicsPayload = {
        studentName: extractedStudentName,
        passingYear: typeof m.passingYear === "string" ? m.passingYear : "",
        entryYear: typeof m.entryYear === "string" ? m.entryYear : "",
        cgpa: typeof m.cgpa === "string" ? m.cgpa : "",
        credits: typeof m.credits === "string" ? m.credits : "",
        degreeTitle: credential.title,
        degreeDescription: credential.description ?? "",
      };

      const degreeHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(studentBasicsPayload)));

      const cgpaVal = String(m.cgpa || "");
      const { name: tierName, color: tierColor } = getTierInfo(cgpaVal);
      const dynamicImageURI = generateSVG(universityName, credential.title, String(m.passingYear || "N/A"), tierName, tierColor);

      // Create a native ERC721 metadata JSON object to inject directly to the blockchain
      const descriptionText = `${credential.description || "Soulbound academic credential issued via Altrium"}

🎓 Degree: ${credential.title}
🏫 University: ${universityName}
📛 PRN: ${credential.prn_number}
⭐ Tier: ${tierName}
📅 Class of: ${String(m.passingYear || "N/A")}`;
      const metadata = {
        name: `${credential.title} - ${extractedStudentName}`,
        description: descriptionText,
        image: dynamicImageURI,
        attributes: [
          { trait_type: "University", value: universityName },
          { trait_type: "Degree", value: credential.title },
          { trait_type: "CGPA Tier", value: tierName },
          { trait_type: "Graduation Year", value: String(m.passingYear || "N/A") },
          { trait_type: "Soulbound", value: "True" }
        ]
      };

      // Use URL compatible unicode Base64 encoding
      const jsonStr = JSON.stringify(metadata);
      const base64Json = btoa(unescape(encodeURIComponent(jsonStr)));
      const degreeURI = `data:application/json;base64,${base64Json}`;

      const tx = await registryContract.uploadDegree(collegeIdHash, degreeHash, degreeURI);
      const receipt = await tx.wait();

      // Best-effort: verify after mint (requires blockchain role permissions).
      try {
        const verifyTx = await registryContract.verifyDegree(collegeIdHash, true);
        await verifyTx.wait();
      } catch (verifyErr) {
        console.warn("verifyDegree failed:", verifyErr);
        toast.warning("Minted but on-chain verification failed (role mismatch?).");
      }

      // tokenId extraction:
      // - prefer parsing DegreeMinted event
      // - fallback to tokenIdByCollegeIdHash read
      let tokenId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = degreeSbtInterface.parseLog(log);
          if (parsed?.name === "DegreeMinted") {
            tokenId = parsed.args.tokenId as bigint;
            break;
          }
        } catch {
          // Ignore non-matching logs
        }
      }

      if (tokenId === null) {
        const degreeSbtAddress = await registryContract.degreeSBT();
        const degreeSbtContract = new ethers.Contract(degreeSbtAddress, degreeSbtAbi, signer);
        tokenId = await degreeSbtContract.tokenIdByCollegeIdHash(collegeIdHash);
      }

      // Persist to backend: status=APPROVED, tx_hash=tx.hash, token_id=tokenId
      await axios.patch(`/degrees/${credential.id}`, {
        status: "APPROVED",
        tx_hash: tx.hash,
        token_id: Number(tokenId),
      });

      toast.success("SBT minted successfully and submission updated.");
      await fetchCredentials();
    } catch (error: unknown) {
      console.error(error);
      const message =
        typeof error === "object" && error
          ? ("reason" in error ? (error as { reason?: string }).reason : undefined) ||
          ("message" in error ? (error as { message?: string }).message : undefined) ||
          "Minting failed"
          : error instanceof Error
            ? error.message
            : "Minting failed";
      toast.error(message);
    } finally {
      toast.dismiss(loadingToast);
      setMintingById((prev) => ({ ...prev, [credential.id]: false }));
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
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">{t("universityDashboard.title")}</h1>
                <p className="text-muted-foreground mb-3">{t("universityDashboard.subtitle")}</p>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-2 px-3 rounded-lg bg-muted/40 border text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-accent" />
                    <span className="font-semibold">{user?.full_name || t("universityDashboard.fallbackAdmin")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{user?.college_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {/* Wallet Status Label */}
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-card text-foreground text-sm font-medium">
                  <Wallet className="w-4 h-4 text-accent" />
                  <span className="font-mono text-xs truncate max-w-[120px]">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : t("universityDashboard.notConnected")}
                  </span>
                  {!walletAddress && (
                    <button onClick={connectWallet} className="ml-1 text-accent hover:underline text-xs">{t("universityDashboard.connect")}</button>
                  )}
                </div>

                <Link
                  to="/guide"
                  className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl bg-accent/10 text-accent font-bold text-xs hover:bg-accent/20 transition active:scale-[0.98]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t("universityDashboard.web3Guide")}
                </Link>
              </div>
            </div>

            <ScrollReveal delay={60}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="glass-card rounded-[2rem] p-6 blockchain-glow transition-all hover:translate-y-[-2px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-warning/10 text-warning">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t("universityDashboard.pendingSubmissions")}</div>
                  </div>
                  <div className="text-4xl font-bold tabular-nums mb-1">{totalPending}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t("universityDashboard.pendingSubmissionsDesc")}</p>
                </div>

                <div className="glass-card rounded-[2rem] p-6 transition-all hover:translate-y-[-2px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-accent/10 text-accent">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t("universityDashboard.approvedDegrees")}</div>
                  </div>
                  <div className="text-4xl font-bold tabular-nums mb-1">{totalApproved}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Degrees successfully secured on-chain.</p>
                </div>

                <div className="glass-card rounded-[2rem] p-6 transition-all hover:translate-y-[-2px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{t("universityDashboard.studentsEnrolled")}</div>
                  </div>
                  <div className="text-4xl font-bold tabular-nums mb-1">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t("universityDashboard.studentsEnrolledDesc")}</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Wallet Warning */}
            {walletAddress && user?.wallet_address && walletAddress.toLowerCase() !== user.wallet_address.toLowerCase() && (
              <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-500">Wallet Account Mismatch</h4>
                  <p className="text-xs text-amber-500/80 mt-1">
                    MetaMask is connected to <strong>{walletAddress.slice(0, 10)}...</strong>, but this Admin profile is registered to <strong>{user.wallet_address.slice(0, 10)}...</strong>.
                    Transactions will fail unless you switch accounts in MetaMask.
                  </p>
                </div>
              </div>
            )}
          </ScrollReveal>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setActiveTab("workflow")}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "workflow"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Shield className="w-4 h-4" />
              Verification Workflow
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "students"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Users className="w-4 h-4" />
              {t("universityDashboard.studentsEnrolled")}
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-accent/10 text-accent">{students.length}</span>
            </button>
          </div>

          {activeTab === "workflow" && (
            <div className="mb-8">
              {/* Modern Technical Stepper */}
              <div className="relative flex items-center justify-center mb-12 py-4">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs h-[1px] bg-border" />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] bg-accent transition-all duration-700 ${workflowPhase === 1 ? "w-0" : "w-full max-w-xs"}`} />

                <div className="relative flex items-center justify-between w-full max-w-lg z-10">
                  <button
                    onClick={() => setWorkflowPhase(1)}
                    className="flex flex-col items-center group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${workflowPhase === 1 
                      ? "bg-accent border-accent text-accent-foreground blockchain-glow scale-110" 
                      : "bg-background border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/50 hover:scale-105"}`}>
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="absolute -bottom-8 flex flex-col items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${workflowPhase === 1 ? "text-accent" : "text-muted-foreground"}`}>Phase 01</span>
                      <span className={`text-xs font-semibold whitespace-nowrap transition-colors ${workflowPhase === 1 ? "text-foreground" : "text-muted-foreground"}`}>Official Ingestion</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setWorkflowPhase(2)}
                    className="flex flex-col items-center group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${workflowPhase === 2 
                      ? "bg-accent border-accent text-accent-foreground blockchain-glow scale-110" 
                      : "bg-background border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/50 hover:scale-105"}`}>
                      <Blocks className="w-4 h-4" />
                    </div>
                    <div className="absolute -bottom-8 flex flex-col items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${workflowPhase === 2 ? "text-accent" : "text-muted-foreground"}`}>Phase 02</span>
                      <span className={`text-xs font-semibold whitespace-nowrap transition-colors ${workflowPhase === 2 ? "text-foreground" : "text-muted-foreground"}`}>On-Chain Issuance</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-16">
                {workflowPhase === 1 && (
                  <ScrollReveal delay={100}>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Official Document Ingestion</h3>
                        <p className="text-sm text-muted-foreground">Match university-issued PDFs with student PRNs.</p>
                      </div>
                      <button
                        onClick={() => setWorkflowPhase(2)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[11px] font-bold uppercase tracking-wider ${
                          ingestionCompleted
                            ? "bg-accent text-accent-foreground hover:opacity-90 shadow-lg shadow-accent/10"
                            : "bg-muted/60 hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        {ingestionCompleted ? "Go to Minting" : "Skip to Minting"}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                    <div className="glass-card rounded-[2.5rem] p-8 border-2 border-accent/5">
                      <BulkUploadWizard onCommitted={() => {
                        setIngestionCompleted(true);
                        void fetchCredentials();
                      }} />
                    </div>
                  </ScrollReveal>
                )}

                {workflowPhase === 2 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">On-Chain Issuance Queue</h3>
                        <p className="text-sm text-muted-foreground">Finalize verification and mint soulbound credentials.</p>
                      </div>
                      <button 
                        onClick={() => setWorkflowPhase(1)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-all text-sm font-medium"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Back to Ingestion
                      </button>
                    </div>
                    
                    {/* The rest of phase 2 content... */}
                    {!walletProvider && (
                      <div className="mb-8 p-10 rounded-[2.5rem] border-2 border-dashed border-accent/20 bg-accent/5 text-center blockchain-glow">
                        <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                          <Wallet className="w-8 h-8 text-accent" />
                        </div>
                        <h4 className="text-xl font-bold mb-2">Connect Institution Wallet</h4>
                        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                          To secure official degrees on the blockchain, you must connect the authorized university wallet linked to your administration profile.
                        </p>
                        <button 
                          onClick={connectWallet}
                          className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                        >
                          <Wallet className="w-4 h-4" />
                          Link Admin Wallet
                        </button>
                      </div>
                    )}

                    <ScrollReveal delay={100}>
                      {/* Submissions Table with Mono Styling */}
                      <div className="glass-card rounded-[2rem] overflow-hidden border-2 border-accent/5">
                        <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-2xl bg-accent/10 text-accent">
                              <Blocks className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Verified Queue</div>
                              <div className="text-lg font-bold">{pendingCredentials.length} Pending</div>
                            </div>
                          </div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Ready for Blockchain Commitment
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/10">
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.student")}</th>
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.degree")}</th>
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.prn")}</th>
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.status")}</th>
                                <th className="text-right py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.actions")}</th>
                              </tr>
                            </thead>

                            <tbody>
                              {loading ? (
                                <tr>
                                  <td colSpan={5} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                                      <span className="text-xs text-muted-foreground font-medium">Synchronizing records...</span>
                                    </div>
                                  </td>
                                </tr>
                              ) : pendingCredentials.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-40">
                                      <Shield className="w-10 h-10" />
                                      <p className="text-sm font-medium">{t("universityDashboard.noPendingSubmissions")}</p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                pendingCredentials.map((cred) => {
                                  const meta = (cred.metadata_json ?? {}) as Record<string, unknown>;
                                  const studentName = typeof meta.studentName === "string" ? meta.studentName : t("studentDashboard.fallbackStudent");
                                  return (
                                    <tr key={cred.id} className="group border-b last:border-0 hover:bg-accent/[0.02] transition-colors">
                                      <td className="py-4 px-6">
                                        <div className="font-bold text-foreground">{studentName}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{new Date(cred.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                      </td>
                                      <td className="py-4 px-6 font-medium text-muted-foreground">{cred.title}</td>
                                      <td className="py-4 px-6">
                                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-accent border border-accent/10">{cred.prn_number}</code>
                                      </td>
                                      <td className="py-4 px-6">
                                        <span className="status-pending">
                                          <Clock className="w-3 h-3" />
                                          VERIFIED
                                        </span>
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-3">
                                          <button
                                            className={`p-2 rounded-xl transition-all ${cred.has_document
                                              ? "bg-accent/5 hover:bg-accent/10 text-accent"
                                              : "opacity-20 cursor-not-allowed"
                                              }`}
                                            onClick={() => cred.has_document && void handleViewDocument(cred.id)}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>

                                          <button
                                            className="px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-[10px] font-bold hover:opacity-90 transition-all shadow-md shadow-accent/10 active:scale-[0.96] disabled:opacity-50 uppercase tracking-widest"
                                            onClick={() => void handleMint(cred)}
                                            disabled={!!mintingById[cred.id]}
                                          >
                                            {mintingById[cred.id] ? "MINTING..." : "COMMIT TO CHAIN"}
                                          </button>

                                          <button
                                            className="p-2 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all"
                                            onClick={() => void handleReject(cred.id)}
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Approved History Section */}
                      <div className="mt-12 glass-card rounded-[2rem] overflow-hidden border-2 border-accent/5">
                        <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-2xl bg-success/10 text-success">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">On-Chain History</div>
                              <div className="text-lg font-bold">{approvedCredentials.length} Secured</div>
                            </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/10">
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.student")}</th>
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.degree")}</th>
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.tokenId")}</th>
                                <th className="text-left py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.status")}</th>
                                <th className="text-right py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">{t("universityDashboard.table.actions")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {approvedCredentials.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center text-muted-foreground opacity-50">No on-chain records found.</td>
                                </tr>
                              ) : (
                                approvedCredentials.map((cred) => {
                                  const meta = (cred.metadata_json ?? {}) as Record<string, unknown>;
                                  const sName = typeof meta.studentName === "string" ? meta.studentName : t("studentDashboard.fallbackStudent");
                                  return (
                                    <tr key={cred.id} className={`group border-b last:border-0 hover:bg-muted/10 transition-colors ${(cred as any).revoked ? "opacity-50" : ""}`}>
                                      <td className="py-4 px-6">
                                        <div className="font-bold">{sName}</div>
                                        <div className="text-[10px] text-muted-foreground tracking-widest uppercase">{cred.prn_number}</div>
                                      </td>
                                      <td className="py-4 px-6 text-muted-foreground font-medium">{cred.title}</td>
                                      <td className="py-4 px-6">
                                        <code className="text-[11px] font-mono bg-accent/5 px-2 py-1 rounded-md text-accent">ID:{cred.token_id ?? "-"}</code>
                                      </td>
                                      <td className="py-4 px-6">
                                        {(cred as any).revoked
                                          ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive uppercase tracking-widest"><XCircle className="w-3 h-3" />{t("universityDashboard.revoked")}</span>
                                          : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success uppercase tracking-widest"><Shield className="w-3 h-3" />{t("universityDashboard.valid")}</span>}
                                      </td>
                                      <td className="py-4 px-6 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            {!(cred as any).revoked && (
                                              <button
                                                className="px-3 py-1.5 rounded-xl bg-destructive/5 text-destructive text-[10px] font-bold uppercase tracking-widest hover:bg-destructive/10 transition-all border border-destructive/10"
                                                onClick={() => void handleRevoke(cred.id)}
                                              >
                                                Revoke
                                              </button>
                                            )}
                                            <button
                                              className="px-3 py-1.5 rounded-xl bg-orange-500/5 text-orange-500 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-500/10 transition-all border border-orange-500/10"
                                              onClick={() => void handleBurnReset(cred.id)}
                                            >
                                              Burn & Reset
                                            </button>
                                          </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </ScrollReveal>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <ScrollReveal delay={100}>
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("universityDashboard.studentsEnrolledIn", { university: user?.college_name ?? "-" })}</div>
                    <div className="text-2xl font-bold tabular-nums">{students.length}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("universityDashboard.studentTable.name")}</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("universityDashboard.studentTable.email")}</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("universityDashboard.studentTable.prn")}</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("universityDashboard.studentTable.university")}</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t("universityDashboard.studentTable.joined")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-muted-foreground">
                            {loading ? t("universityDashboard.loadingStudents") : t("universityDashboard.noStudentsEnrolled")}
                          </td>
                        </tr>
                      ) : (
                        students.map((s) => (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="py-3.5 px-4 font-medium">{s.full_name ?? "—"}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{s.email}</td>
                            <td className="py-3.5 px-4 font-mono text-xs">{s.prn_number ?? "—"}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{s.college_name}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          )}

        </div>
      </div >

    </div >
  );
};

export default UniversityAdmin;
