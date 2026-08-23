import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { caseDetailPath, type CaseStatus } from "@/lib/caseArchive";
import { persistedCaseToWorkspaceCase } from "@/lib/persistedCase";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, FileSearch, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusTone: Record<string, string> = {
  "Analysis ready": "bg-[#F8E7EB] text-[#934F60]",
  "Review recommended": "bg-[#FFF3DE] text-[#A76A1B]",
  "Report signed": "bg-[#E8F4EF] text-[#2D7A58]",
  "Intake complete": "bg-[#F1EDF7] text-[#725486]",
};

export default function AllCases() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CaseStatus>("all");
  const persistedCases = trpc.cases.list.useQuery();
  const utils = trpc.useUtils();
  const deleteCase = trpc.cases.delete.useMutation({
    onSuccess: async (result) => {
      if (result.deleted) {
        toast.success("Case deleted from the workspace.");
        await utils.cases.list.invalidate();
      } else {
        toast.error("This case was no longer available.");
      }
    },
    onError: () => toast.error("Case deletion could not complete. Please try again."),
  });
  const workspaceCases = useMemo(() => (persistedCases.data ?? []).map(persistedCaseToWorkspaceCase), [persistedCases.data]);
  const visibleCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workspaceCases.filter((record) => {
      const matchesStatus = status === "all" || record.status === status;
      const matchesQuery = !normalized || [record.id, record.patientLabel, record.kneeSide, record.statusLabel].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [workspaceCases, query, status]);

  function removeCase(caseReference: string) {
    if (window.confirm(`Delete case ${caseReference}? This removes it from the workspace.`)) {
      deleteCase.mutate({ caseReference });
    }
  }

  return (
    <KneeCoAppShell eyebrow="Clinical workspace" title="Case Overview">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Patient case archive</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.04em] text-[#352C30] sm:text-5xl">All active cases</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7B686F]">Review every case in your workspace, including intake progress, assessment status, and report readiness.</p></div><Button type="button" onClick={() => setLocation("/new-case")} className="rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">New Case<ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
          <div className="mt-8 grid gap-3 md:grid-cols-[1fr_220px]"><label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A28C92]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a case or patient" className="h-11 w-full rounded-xl border border-[#E8DDDF] bg-white pl-10 pr-4 text-sm font-semibold text-[#4A3A40] outline-none placeholder:text-[#B19DA3] focus:ring-2 focus:ring-[#C97C8D]" /></label><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 rounded-xl border border-[#E8DDDF] bg-white px-3 text-sm font-semibold text-[#5C484F] outline-none focus:ring-2 focus:ring-[#C97C8D]"><option value="all">All statuses</option><option value="analysis_ready">Analysis ready</option><option value="clinician_review">Review recommended</option><option value="report_signed">Report signed</option><option value="intake_complete">Intake complete</option></select></div>
        </section>

        <section className="mt-7 overflow-hidden rounded-[1.6rem] border border-[#EDE3E5] bg-white shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)]">
          <div className="flex items-center justify-between border-b border-[#F0E7E9] p-6"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Case list</p><h3 className="mt-2 text-xl font-extrabold text-[#403239]">{visibleCases.length} visible case{visibleCases.length === 1 ? "" : "s"}</h3></div><p className="text-sm text-[#8A747B]">{persistedCases.isLoading ? "Refreshing stored cases…" : "Open a case to review measurements."}</p></div>
          <div className="hidden grid-cols-[1.1fr_.7fr_.4fr_.55fr_.7fr_.8fr_.65fr_auto] gap-4 border-b border-[#F0E7E9] bg-[#FFFAFB] px-6 py-3 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#9D868D] md:grid"><span>Case</span><span>Patient</span><span>Age</span><span>Knee</span><span>OA</span><span>Assessment</span><span>Updated</span><span>Actions</span></div>
          {visibleCases.length ? visibleCases.map((record) => <div key={record.id} className="grid w-full gap-3 border-b border-[#F3EAEC] px-6 py-5 text-left transition last:border-0 hover:bg-[#FFF9FA] md:grid-cols-[1.1fr_.7fr_.4fr_.55fr_.7fr_.8fr_.65fr_auto] md:items-center md:gap-4"><button type="button" onClick={() => setLocation(caseDetailPath(record.id))} className="contents text-left"><div><p className="text-sm font-extrabold text-[#43343A]">{record.id}</p><p className="mt-1 text-xs text-[#987F87]">{record.sex}</p></div><p className="text-sm font-semibold text-[#5C484F]">{record.patientLabel.replace("Patient ", "")}</p><p className="text-sm text-[#755F67]">{record.age}</p><p className="text-sm text-[#755F67]">{record.kneeSide}</p><p className="text-sm text-[#755F67]">{record.oaStatus}</p><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusTone[record.statusLabel]}`}>{record.statusLabel}</span><span className="text-xs font-extrabold text-[#896D75]">{record.updatedAt}</span></button><Button type="button" aria-label={`Delete ${record.id}`} onClick={() => removeCase(record.id)} disabled={deleteCase.isPending} variant="outline" size="icon" className="border-[#EBCFD5] bg-white text-[#A6556A] hover:bg-[#FFF2F4] hover:text-[#8A3E50]"><Trash2 className="h-4 w-4" /></Button></div>) : <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center"><FileSearch className="h-6 w-6 text-[#B78691]" /><p className="mt-3 text-sm font-extrabold text-[#4A393F]">{workspaceCases.length ? "No matching cases" : "No active cases"}</p><p className="mt-1 text-sm text-[#88727A]">{workspaceCases.length ? "Try another patient, case ID, or status filter." : "Create a case to begin the measurement review."}</p>{!workspaceCases.length && <Button type="button" onClick={() => setLocation("/new-case")} className="mt-5 rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">Create New Case<ArrowUpRight className="ml-2 h-4 w-4" /></Button>}</div>}
        </section>
      </div>
    </KneeCoAppShell>
  );
}
