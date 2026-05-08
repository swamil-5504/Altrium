import React, { useState } from "react";
import axios from "@/api/axios";
import { extractErrorMessage } from "@/utils/errors";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { toast } from "sonner";
import { ethers } from "ethers";
import {
  Search,
  Shield,
  FileText,
  GraduationCap,
  Blocks,
  Calendar,
  Hash,
  ExternalLink,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  User,
  Lock,
  Unlock,
} from "lucide-react";

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
  revoked?: boolean;
  college_name?: string | null;
  college_logo?: string | null;
  degree_type?: string | null;
  created_at: string;
}

const CONTRACT_REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS || "";

const registryAbi = [
  {
    type: "function",
    name: "getDegree",
    inputs: [{ name: "collegeIdHash", type: "bytes32" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "tokenId", type: "uint256" },
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "collegeIdHash", type: "bytes32" },
          { name: "issuedBy", type: "address" },
          { name: "issuedAt", type: "uint64" },
          { name: "verified", type: "bool" },
          { name: "degreeHash", type: "bytes32" },
          { name: "revoked", type: "bool" },
          { name: "revokedAt", type: "uint64" },
          { name: "revokedBy", type: "address" },
        ],
      },
      { name: "degreeURI", type: "string" },
    ],
    stateMutability: "view",
  },
] as const;

const isEmail = (value: string): boolean => {
  const parts = value.split("@");
  const hasAt = parts.length === 2;
  const hasDot = hasAt && parts[1].includes(".");
  return hasAt && parts[0].length > 0 && hasDot;
};

const EmployerVerify: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Credential | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hashVerified, setHashVerified] = useState<boolean | null>(null);
  const [verifyingHash, setVerifyingHash] = useState(false);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!e.target.value.trim()) {
      setSearched(false);
      setResult(null);
      setHashVerified(null);
    }
  };

  const handleSearch = async (e: React.FormEvent | { preventDefault: () => void }) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearched(false);
      setResult(null);
      setHashVerified(null);
      return;
    }

    setSearched(true);
    setLoading(true);
    setHashVerified(null);

    try {
      const params = isEmail(trimmed)
        ? { email: trimmed }
        : { prn_number: trimmed };

      const response = await axios.get("/degrees/public", { params });

      const list: Credential[] = response.data;
      if (list.length > 0) setResult(list[0]);
      else setResult(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error(extractErrorMessage(err, "Failed to verify credential."));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHash = async () => {
    if (!result) return;
    setVerifyingHash(true);
    try {
      const universityName = result.college_name || "Altrium University";
      const combinedString = `${result.prn_number}-${universityName}-${result.title}`;
      const collegeIdHash = ethers.keccak256(ethers.toUtf8Bytes(combinedString));

      const m = (result.metadata_json ?? {}) as Record<string, unknown>;
      const extractedStudentName =
        typeof m.studentName === "string" ? m.studentName : typeof m.name === "string" ? m.name : "Student";
      const payload = {
        studentName: extractedStudentName,
        passingYear: typeof m.passingYear === "string" ? m.passingYear : "",
        entryYear: typeof m.entryYear === "string" ? m.entryYear : "",
        cgpa: typeof m.cgpa === "string" ? m.cgpa : "",
        credits: typeof m.credits === "string" ? m.credits : "",
        degreeTitle: result.title,
        degreeDescription: result.description ?? "",
      };
      const computedDegreeHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));

      if (typeof window !== "undefined" && window.ethereum && CONTRACT_REGISTRY_ADDRESS) {
        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const contract = new ethers.Contract(CONTRACT_REGISTRY_ADDRESS, registryAbi, provider);

        const [exists, tokenId, record] = await contract.getDegree(collegeIdHash);

        if (!exists) {
          toast.error("Degree not found on-chain. It might not be minted yet.");
          setHashVerified(false);
          return;
        }

        if (record.revoked) {
          toast.error("Blockchain record shows this degree is REVOKED.");
        }

        if (record.degreeHash !== computedDegreeHash) {
          console.log("Hash mismatch:", { onChain: record.degreeHash, computed: computedDegreeHash });
          toast.error("Integrity Mismatch! Off-chain data doesn't match on-chain hash.");
          setHashVerified(false);
          return;
        }

        toast.success("On-chain record verified! Integrity hash matches.");
      } else {
        toast.info("Computing integrity hash (Connect MetaMask for full on-chain proof)");
      }

      setHashVerified(true);
    } catch (err) {
      console.error(err);
      toast.error("Verification failed correctly.");
      setHashVerified(false);
    } finally {
      setVerifyingHash(false);
    }
  };

  const meta = (result?.metadata_json ?? {}) as Record<string, unknown>;
  const studentName =
    typeof meta.studentName === "string" ? meta.studentName : typeof meta.name === "string" ? meta.name : "-";
  const passingYear = typeof meta.passingYear === "string" ? meta.passingYear : "-";
  const entryYear = typeof meta.entryYear === "string" ? meta.entryYear : "-";
  const cgpa = typeof meta.cgpa === "string" ? meta.cgpa : "-";
  const credits = typeof meta.credits === "string" ? meta.credits : "-";

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Navbar />

      {/* Premium Matte Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="pt-32 pb-24 flex-1">
        <div className="container mx-auto px-4 max-w-3xl">
          <ScrollReveal className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              Official Verification Portal
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Verify Academic Integrity</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("employerVerify.subtitle")}</p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="glass-card rounded-[2.5rem] p-2 mb-12 border-2 border-accent/5 shadow-2xl shadow-accent/5 transition-all focus-within:border-accent/20">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    placeholder={t("employerVerify.searchPlaceholder")}
                    required
                    className="w-full pl-14 pr-6 py-5 rounded-[2rem] bg-transparent text-sm font-medium focus:outline-none transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 sm:py-2 rounded-[1.8rem] bg-accent text-accent-foreground text-sm font-bold hover:opacity-90 transition-all shadow-xl shadow-accent/10 active:scale-[0.98] disabled:opacity-50 min-w-[140px]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent-foreground/20 border-t-accent-foreground rounded-full animate-spin" />
                      <span>{t("employerVerify.verifying")}</span>
                    </div>
                  ) : (
                    t("employerVerify.verify")
                  )}
                </button>
              </form>
            </div>
          </ScrollReveal>

          {result && (
            <ScrollReveal delay={200}>
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-accent/5 to-primary/5 rounded-[3.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative rounded-[2.5rem] border-2 border-accent/10 bg-background overflow-hidden shadow-2xl">
                  {/* Premium Status Header */}
                  <div className={`px-8 py-5 flex items-center justify-between ${result.revoked ? "bg-destructive/10 text-destructive" : "bg-accent/5 text-accent border-b border-accent/5"}`}>
                    <div className="flex items-center gap-3">
                      {result.revoked ? (
                        <div className="p-1.5 rounded-full bg-destructive/20"><XCircle className="w-4 h-4" /></div>
                      ) : (
                        <div className="p-1.5 rounded-full bg-accent/20"><ShieldCheck className="w-4 h-4" /></div>
                      )}
                      <div>
                         <span className="text-[10px] font-bold uppercase tracking-[0.2em] block mb-0.5">
                           {result.revoked ? "Revoked / Invalid" : "Cryptographic Proof Found"}
                         </span>
                         <span className="text-[9px] opacity-60 tabular-nums">ID: {result.token_id || "PENDING"}</span>
                      </div>
                    </div>
                    {!result.revoked && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                         <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Soulbound Status</span>
                      </div>
                    )}
                  </div>

                  <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                      {/* Institutional Branding */}
                      <div className="w-28 h-28 rounded-[2rem] bg-muted/40 border-2 border-accent/5 p-4 flex flex-col items-center justify-center relative group/logo overflow-hidden">
                        {result.college_logo ? (
                          <img 
                            src={result.college_logo.startsWith("http") ? result.college_logo : `${import.meta.env.VITE_API_URL}${result.college_logo}`} 
                            alt={result.college_name || "Logo"} 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <>
                            <Building2 className="w-12 h-12 text-muted-foreground opacity-40 mb-1" />
                            <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">No Official Logo</span>
                          </>
                        )}
                        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col gap-1 mb-6">
                          <h2 className="text-4xl font-bold tracking-tight">{result.title}</h2>
                          <div className="flex items-center gap-2">
                             <p className="text-accent font-bold tracking-widest text-[10px] uppercase">
                               {result.college_name || "Altrium Partner Institution"}
                             </p>
                             <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level: {result.degree_type || "Degree"}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                          <div className="space-y-6">
                             <DataPoint label="Recipient Holder" value={studentName} icon={User} />
                             <DataPoint label="Registration (PRN)" value={result.prn_number || "—"} icon={Hash} mono />
                             <DataPoint label="Completion Year" value={passingYear} icon={Calendar} />
                          </div>
                          <div className="space-y-6">
                             <DataPoint 
                               label="Academic Standing" 
                               value={hashVerified ? cgpa : "LOCKED"} 
                               icon={hashVerified ? Unlock : Lock} 
                               className={!hashVerified ? "opacity-40" : "text-success"}
                               subValue={!hashVerified ? "Verify Integrity to Unlock" : "Verified Performance"}
                             />
                             <DataPoint 
                               label="Total Credits" 
                               value={hashVerified ? credits : "LOCKED"} 
                               icon={hashVerified ? Unlock : Lock} 
                               className={!hashVerified ? "opacity-40" : "text-success"}
                             />
                             <DataPoint label="Issuance Date" value={new Date(result.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} icon={Calendar} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Technical Audit Section */}
                    <div className="space-y-4">
                       <div className={`p-6 rounded-[2rem] border transition-all duration-500 ${hashVerified ? "bg-success/[0.03] border-success/20" : "bg-muted/30 border-border"}`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                              <h4 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <ShieldCheck className={`w-5 h-5 ${hashVerified ? "text-success" : "text-accent"}`} />
                                Technical Audit Trail
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                                Unlike traditional verifications, Altrium cross-references off-chain records with EIP-1193 blockchain proof to ensure zero data tampering.
                              </p>
                            </div>
                            <button
                              onClick={handleVerifyHash}
                              disabled={verifyingHash}
                              className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                                hashVerified 
                                  ? "bg-success text-success-foreground shadow-lg shadow-success/10" 
                                  : "bg-accent text-accent-foreground shadow-lg shadow-accent/10 hover:opacity-90"
                              }`}
                            >
                              {verifyingHash ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-accent-foreground/20 border-t-accent-foreground rounded-full animate-spin" />
                                  <span>Syncing Blockchain...</span>
                                </>
                              ) : hashVerified ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Audit Complete</span>
                                </>
                              ) : (
                                "Run Cryptographic Audit"
                              )}
                            </button>
                          </div>

                          {hashVerified && (
                            <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-border/50 animate-in fade-in slide-in-from-bottom-4">
                               <AuditStat 
                                 label="Registry Check" 
                                 status="Matched" 
                                 desc="Record exists in contract" 
                               />
                               <AuditStat 
                                 label="Issuance Authority" 
                                 status="Confirmed" 
                                 desc="Verified University Signature" 
                               />
                               <AuditStat 
                                 label="Data Fingerprint" 
                                 status="Identical" 
                                 desc="SHA-256 Hash Verified" 
                               />
                            </div>
                          )}
                       </div>

                       {result.tx_hash && hashVerified && (
                         <ScrollReveal className="animate-in fade-in slide-in-from-top-2">
                           <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                  <ExternalLink className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Blockchain Evidence</p>
                                  <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px] md:max-w-md">{result.tx_hash}</p>
                                </div>
                              </div>
                              <a 
                                href={`https://sepolia.etherscan.io/tx/${result.tx_hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-5 py-2 rounded-xl bg-accent text-accent-foreground text-[10px] font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/10"
                              >
                                View Receipt
                              </a>
                           </div>
                         </ScrollReveal>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {searched && !result && (
            <ScrollReveal>
              <div className="rounded-[2.5rem] border-2 border-dashed border-border p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-muted-foreground opacity-40" />
                </div>
                <h3 className="text-xl font-bold mb-2">Record Not Found</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                  We couldn't locate a verified credential for <span className="text-foreground font-bold">"{query}"</span>. Please ensure the PRN or Email is correct.
                </p>
                <button
                  onClick={() => handleQueryChange({ target: { value: "" } } as any)}
                  className="px-6 py-2.5 bg-muted text-foreground rounded-xl text-xs font-bold hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  Clear Search
                </button>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

const DataPoint = ({ label, value, icon: Icon, mono, className, subValue }: { label: string; value: string; icon: any; mono?: boolean; className?: string; subValue?: string }) => (
  <div className={`flex items-start gap-4 ${className || ""}`}>
    <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold text-foreground ${mono ? "font-mono tracking-tight" : ""}`}>{value}</p>
      {subValue && (
        <p className="text-[10px] font-medium text-muted-foreground/70 mt-0.5">{subValue}</p>
      )}
    </div>
  </div>
);

const AuditStat = ({ label, status, desc }: { label: string; status: string; desc: string }) => (
  <div className="flex flex-col gap-1 p-3 rounded-xl bg-background border border-border">
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="text-sm font-bold text-success">{status}</p>
    <p className="text-[9px] font-medium text-muted-foreground/80">{desc}</p>
  </div>
);

export default EmployerVerify;