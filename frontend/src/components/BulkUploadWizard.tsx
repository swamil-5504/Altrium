import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import axios from "@/api/axios";
import {
  Upload,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

type DegreeType = "BTECH" | "BSC" | "MTECH" | "MBA";

const DEGREE_OPTIONS: { value: DegreeType; label: string }[] = [
  { value: "BTECH", label: "BTech" },
  { value: "BSC", label: "BSc" },
  { value: "MTECH", label: "MTech" },
  { value: "MBA", label: "MBA" },
];

interface RequestedRow {
  credential_id: string;
  prn_number: string | null;
  student_name: string | null;
  student_email: string | null;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface MatchedRow {
  credential_id: string;
  prn_number: string;
  student_name: string | null;
  pdf_filename: string;
  selected: boolean;
}

interface MatchResponse {
  batch_id: string;
  degree_type: DegreeType;
  matched_rows: MatchedRow[];
  unmatched_request_prns: string[];
  orphan_pdf_filenames: string[];
  created_at: string;
}

interface CommitResultRow {
  credential_id: string;
  prn_number: string;
  status: string;
  error: string | null;
}

interface CommitResponse {
  batch_id: string;
  committed_count: number;
  skipped_count: number;
  failed_count: number;
  rows: CommitResultRow[];
}

type Step = "select-type" | "review-live" | "review-match" | "result";

interface Props {
  /** Called after a successful commit so the parent can refetch the pending queue. */
  onCommitted?: () => void;
}

const BulkUploadWizard: React.FC<Props> = ({ onCommitted }) => {
  const [step, setStep] = useState<Step>("select-type");
  const [degreeType, setDegreeType] = useState<DegreeType | null>(null);

  const [requestedRows, setRequestedRows] = useState<RequestedRow[]>([]);
  const [loadingRequested, setLoadingRequested] = useState(false);

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);

  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);

  // Fetch live REQUESTED rows whenever a degree type is picked.
  useEffect(() => {
    if (!degreeType || step !== "review-live") return;
    void fetchRequested(degreeType);
  }, [degreeType, step]);

  const fetchRequested = async (dt: DegreeType) => {
    setLoadingRequested(true);
    try {
      const res = await axios.get<RequestedRow[]>("/degrees/bulk/requests", {
        params: { degree_type: dt },
      });
      setRequestedRows(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load requested credentials.");
    } finally {
      setLoadingRequested(false);
    }
  };

  const resetWizard = () => {
    setStep("select-type");
    setDegreeType(null);
    setRequestedRows([]);
    setPdfFiles([]);
    setMatchResult(null);
    setDeselected(new Set());
    setCommitResult(null);
  };

  const handleSelectType = (dt: DegreeType) => {
    setDegreeType(dt);
    setStep("review-live");
  };

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setPdfFiles(arr);
  };

  const handleMatch = async () => {
    if (!degreeType || pdfFiles.length === 0) return;
    setMatching(true);
    try {
      const fd = new FormData();
      fd.append("degree_type", degreeType);
      pdfFiles.forEach((f) => fd.append("files", f));
      const res = await axios.post<MatchResponse>("/degrees/bulk/match", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMatchResult(res.data);
      setDeselected(new Set());
      setStep("review-match");
    } catch (err) {
      console.error(err);
      toast.error("PDF match failed.");
    } finally {
      setMatching(false);
    }
  };

  const toggleSelected = (credentialId: string) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(credentialId)) next.delete(credentialId);
      else next.add(credentialId);
      return next;
    });
  };

  const handleCommit = async () => {
    if (!matchResult) return;
    setCommitting(true);
    try {
      const res = await axios.post<CommitResponse>(
        `/degrees/bulk/${matchResult.batch_id}/commit`,
        { deselected_credential_ids: Array.from(deselected) },
      );
      setCommitResult(res.data);
      setStep("result");
      toast.success(`Committed ${res.data.committed_count} row(s) to pending queue.`);
      onCommitted?.();
    } catch (err) {
      console.error(err);
      toast.error("Commit failed.");
    } finally {
      setCommitting(false);
    }
  };

  const matchedSelectedCount = useMemo(() => {
    if (!matchResult) return 0;
    return matchResult.matched_rows.filter((r) => !deselected.has(r.credential_id)).length;
  }, [matchResult, deselected]);

  return (
    <div className="glass-card rounded-[2rem] overflow-hidden border border-accent/10 shadow-xl shadow-accent/5 transition-all">
      <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-2xl bg-accent/10 text-accent">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-0.5">Ingestion Wizard</div>
            <div className="text-lg font-bold">
              {step === "select-type" && "Select Degree Category"}
              {step === "review-live" && `Upload Official PDFs (${degreeType})`}
              {step === "review-match" && "Review Matches"}
              {step === "result" && "Upload Complete"}
            </div>
          </div>
        </div>
        {step !== "select-type" && (
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted transition-all"
            onClick={resetWizard}
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground" />
            Restart
          </button>
        )}
      </div>

      <div className="p-8">
        {/* Minimal Progress Indicator */}
        <div className="flex items-center gap-1 mb-8 max-w-[200px]">
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${["select-type", "review-live", "review-match", "result"].indexOf(step) >= 0 ? "bg-accent" : "bg-muted"}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${["review-live", "review-match", "result"].indexOf(step) >= 0 ? "bg-accent" : "bg-muted"}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${["review-match", "result"].indexOf(step) >= 0 ? "bg-accent" : "bg-muted"}`} />
          <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${step === "result" ? "bg-accent" : "bg-muted"}`} />
        </div>
        {step === "select-type" && (
          <>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              Match official university-issued PDFs with student records using <b>PRN (Permanent Registration Number)</b>.
              Only verified college documents will be committed to the on-chain issuance queue.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {DEGREE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectType(opt.value)}
                  className="group p-6 rounded-[1.5rem] border-2 border-accent/5 bg-muted/10 hover:bg-accent/5 hover:border-accent hover:translate-y-[-2px] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4 transition-transform group-hover:scale-110">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="text-base font-bold mb-1">{opt.label}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-accent transition-colors">
                    Start Process <ArrowRight className="inline w-3 h-3 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "review-live" && degreeType && (
          <div>
            <p className="text-sm text-muted-foreground mb-6 font-medium">
              {loadingRequested
                ? "Synchronizing student requests..."
                : `${requestedRows.length} active request(s) waiting for ${degreeType} verification.`}{" "}
            </p>

            <div className="rounded-2xl border-2 border-accent/5 bg-background overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Student</th>
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">PRN</th>
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRequested ? (
                    <tr><td colSpan={4} className="py-12 text-center text-muted-foreground font-medium animate-pulse">Fetching global registry…</td></tr>
                  ) : requestedRows.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-muted-foreground font-medium italic opacity-50">No outstanding requests for this category.</td></tr>
                  ) : (
                    requestedRows.map((r) => (
                      <tr key={r.credential_id} className="border-b last:border-0 hover:bg-accent/[0.02] transition-colors">
                        <td className="py-3 px-6 font-bold">{r.student_name ?? "—"}</td>
                        <td className="py-3 px-6">
                          <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-accent">{r.prn_number ?? "—"}</code>
                        </td>
                        <td className="py-3 px-6 text-muted-foreground">{r.student_email ?? "—"}</td>
                        <td className="py-3 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-accent/[0.03] p-6 rounded-2xl border border-accent/10">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 cursor-pointer transition-all shadow-lg shadow-accent/20 active:scale-[0.98]">
                  <Upload className="w-3.5 h-3.5" />
                  Select PDF Records
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFilesPicked}
                  />
                </label>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ready for Upload</span>
                  <span className="text-sm font-semibold">
                    {pdfFiles.length === 0 ? "No records selected" : `${pdfFiles.length} file(s) staged`}
                  </span>
                </div>
              </div>
              <div className="sm:ml-auto" />
              <button
                type="button"
                onClick={() => void handleMatch()}
                disabled={pdfFiles.length === 0 || matching || requestedRows.length === 0}
                className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {matching ? "Matching Engine Active..." : "Run Matching Algorithm"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === "review-match" && matchResult && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-[1.5rem] border-2 border-success/10 p-5 bg-success/[0.02]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-success/60 mb-2">Algorithm Matches</div>
                <div className="text-3xl font-bold tabular-nums text-success">{matchResult.matched_rows.length}</div>
              </div>
              <div className="rounded-[1.5rem] border-2 border-warning/10 p-5 bg-warning/[0.02]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-warning/60 mb-2">Unmatched Records</div>
                <div className="text-3xl font-bold tabular-nums text-warning">{matchResult.unmatched_request_prns.length}</div>
              </div>
              <div className="rounded-[1.5rem] border-2 border-destructive/10 p-5 bg-destructive/[0.02]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-destructive/60 mb-2">Isolated Files</div>
                <div className="text-3xl font-bold tabular-nums text-destructive">{matchResult.orphan_pdf_filenames.length}</div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-accent/5 bg-background overflow-hidden mb-6">
              <div className="px-6 py-3 border-b bg-muted/20 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Auto-Matched Entities
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="w-12 py-3 px-6"></th>
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">PRN</th>
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Entity Name</th>
                    <th className="text-left py-3 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Validated File</th>
                  </tr>
                </thead>
                <tbody>
                  {matchResult.matched_rows.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-muted-foreground font-medium opacity-40 italic">Zero automatic matches found.</td></tr>
                  ) : (
                    matchResult.matched_rows.map((r) => {
                      const isUnticked = deselected.has(r.credential_id);
                      return (
                        <tr key={r.credential_id} className={`group border-b last:border-0 transition-all ${isUnticked ? "opacity-30 grayscale" : "hover:bg-accent/[0.02]"}`}>
                          <td className="py-3 px-6 text-center">
                            <input
                              type="checkbox"
                              checked={!isUnticked}
                              onChange={() => toggleSelected(r.credential_id)}
                              className="w-4 h-4 rounded-md border-border text-accent focus:ring-accent accent-accent transition-transform active:scale-90"
                            />
                          </td>
                          <td className="py-3 px-6">
                            <code className="text-[11px] font-mono bg-muted/50 px-2 py-1 rounded-md text-accent">{r.prn_number}</code>
                          </td>
                          <td className="py-3 px-6 font-bold">{r.student_name ?? "—"}</td>
                          <td className="py-3 px-6 text-muted-foreground font-medium inline-flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-accent" />{r.pdf_filename}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {(matchResult.unmatched_request_prns.length > 0 || matchResult.orphan_pdf_filenames.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {matchResult.unmatched_request_prns.length > 0 && (
                  <div className="rounded-lg border p-3 bg-amber-500/5">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Requests without a PDF
                    </div>
                    <ul className="text-xs font-mono space-y-1">
                      {matchResult.unmatched_request_prns.map((prn) => <li key={prn}>{prn}</li>)}
                    </ul>
                  </div>
                )}
                {matchResult.orphan_pdf_filenames.length > 0 && (
                  <div className="rounded-lg border p-3 bg-rose-500/5">
                    <div className="flex items-center gap-2 text-sm font-medium text-rose-600 mb-2">
                      <AlertTriangle className="w-4 h-4" /> PDFs without a request
                    </div>
                    <ul className="text-xs font-mono space-y-1">
                      {matchResult.orphan_pdf_filenames.map((fn, i) => <li key={`${fn}-${i}`}>{fn}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => void handleCommit()}
                disabled={committing || matchedSelectedCount === 0}
                className="inline-flex items-center gap-2.5 px-8 py-3 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:opacity-90 transition-all shadow-xl shadow-accent/20 active:scale-[0.98] disabled:opacity-30"
              >
                {committing ? "Processing Transactions..." : `Finalize ${matchedSelectedCount} Official Records`}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === "result" && commitResult && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border p-4 bg-emerald-500/5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Committed</div>
                <div className="text-3xl font-bold tabular-nums">{commitResult.committed_count}</div>
              </div>
              <div className="rounded-lg border p-4 bg-muted">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Skipped</div>
                <div className="text-3xl font-bold tabular-nums">{commitResult.skipped_count}</div>
              </div>
              <div className="rounded-lg border p-4 bg-rose-500/5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Failed</div>
                <div className="text-3xl font-bold tabular-nums">{commitResult.failed_count}</div>
              </div>
            </div>

            <div className="rounded-lg border bg-background overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">PRN</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Outcome</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {commitResult.rows.map((r) => (
                    <tr key={r.credential_id} className="border-b last:border-0">
                      <td className="py-2 px-3 font-mono text-xs">{r.prn_number}</td>
                      <td className="py-2 px-3">{r.status}</td>
                      <td className="py-2 px-3 text-muted-foreground">{r.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Matched documents have been moved to your <b>pending</b> queue. 
              You can now proceed to the <b>Degree Submissions</b> tab to perform the final on-chain minting 
              for each student individually.
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4" />
                Run another batch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUploadWizard;
