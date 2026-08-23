import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { caseDetailPath } from "@/lib/caseArchive";
import { persistedCaseToWorkspaceCase } from "@/lib/persistedCase";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, FileCheck2, FileSearch, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const statusTone: Record<string, string> = {
  "Analysis ready": "bg-[#F8E7EB] text-[#934F60]",
  "Review recommended": "bg-[#FFF3DE] text-[#A76A1B]",
  "Report signed": "bg-[#E8F4EF] text-[#2D7A58]",
  "Intake complete": "bg-[#F1EDF7] text-[#725486]",
};

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? "border-[#D7B6BE] bg-[#FFF8F9]" : "border-[#EEE4E6] bg-white"}`}><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#9E868D]">{label}</p><p className="font-kneeco-display mt-3 text-3xl tracking-[-0.04em] text-[#352C30]">{value}</p><p className="mt-1 text-xs leading-5 text-[#806C73]">{detail}</p></div>;
}

export default function HomeDashboard() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const persistedCases = trpc.cases.list.useQuery();
  const workspaceCases = useMemo(() => (persistedCases.data ?? []).map(persistedCaseToWorkspaceCase), [persistedCases.data]);
  const visibleCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workspaceCases.filter((record) => !normalized || [record.id, record.patientLabel, record.kneeSide, record.statusLabel].some((value) => value.toLowerCase().includes(normalized))).slice(0, 4);
  }, [workspaceCases, query]);
  const analysedCases = workspaceCases.filter((record) => record.status === "analysis_ready").length;
  const reviewCases = workspaceCases.filter((record) => record.status === "clinician_review").length;
  const signedReports = workspaceCases.filter((record) => record.status === "report_signed").length;

  return (
    <KneeCoAppShell eyebrow="Clinical workspace" title="Home">
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col gap-6 rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-9 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Tuesday · Clinical day overview</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.04em] text-[#352C30] sm:text-5xl">Good morning, Dr. Asha.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7B686F]">Your active knee assessments, review tasks, and report progress are organised here.</p></div>
          <label className="relative block w-full max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A28C92]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a case or patient" className="h-11 w-full rounded-xl border border-[#E8DDDF] bg-white pl-10 pr-4 text-sm font-semibold text-[#4A3A40] outline-none placeholder:text-[#B19DA3] focus:ring-2 focus:ring-[#C97C8D]" /></label>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total cases" value={String(workspaceCases.length)} detail="Across your clinician workspace" /><Metric label="Analysed cases" value={String(analysedCases)} detail="Measurements available for review" /><Metric label="Pending review" value={String(reviewCases)} detail="Require a clinician decision" accent /><Metric label="Reports generated" value={String(signedReports)} detail="Decision-support records signed" /></section>

        <section className="mt-7 overflow-hidden rounded-[1.6rem] border border-[#EDE3E5] bg-white shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)]">
          <div className="flex flex-col gap-4 border-b border-[#F0E7E9] p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Recent case activity</p><h3 className="mt-2 text-xl font-extrabold text-[#403239]">Case workspace</h3><p className="mt-1 text-sm text-[#8A747B]">Open a case to review its clinical status and next action.</p></div><Button type="button" onClick={() => setLocation("/cases")} variant="outline" className="rounded-xl border-[#DEC5CB] bg-white text-[#914F60] hover:bg-[#FFF5F6]">View Case Overview<ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
          <div className="hidden grid-cols-[1.15fr_.65fr_.45fr_.55fr_.75fr_.75fr_.6fr] gap-4 border-b border-[#F0E7E9] bg-[#FFFAFB] px-6 py-3 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#9D868D] md:grid"><span>Case</span><span>Patient</span><span>Age</span><span>Sex</span><span>OA</span><span>Analysis</span><span>Report</span></div>
          {visibleCases.length ? visibleCases.map((record) => <button type="button" key={record.id} onClick={() => setLocation(caseDetailPath(record.id))} className="grid w-full gap-2 border-b border-[#F3EAEC] px-6 py-5 text-left transition last:border-0 hover:bg-[#FFF9FA] md:grid-cols-[1.15fr_.65fr_.45fr_.55fr_.75fr_.75fr_.6fr] md:items-center md:gap-4"><div><p className="text-sm font-extrabold text-[#43343A]">{record.id}</p><p className="mt-1 text-xs text-[#987F87]">{record.kneeSide} knee MRI</p></div><p className="text-sm font-semibold text-[#5C484F]">{record.patientLabel.replace("Patient ", "")}</p><p className="text-sm text-[#755F67]">{record.age}</p><p className="text-sm text-[#755F67]">{record.sex}</p><p className="text-sm text-[#755F67]">{record.oaStatus}</p><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusTone[record.statusLabel]}`}>{record.statusLabel}</span><span className="text-xs font-extrabold text-[#896D75]">{record.status === "report_signed" ? "Ready" : "—"}</span></button>) : <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center"><FileSearch className="h-6 w-6 text-[#B78691]" /><p className="mt-3 text-sm font-extrabold text-[#4A393F]">{workspaceCases.length ? "No matching cases" : "No cases yet"}</p><p className="mt-1 text-sm text-[#88727A]">{workspaceCases.length ? "Try another patient or case search." : "Create a case to begin your measurement workspace."}</p>{!workspaceCases.length && <Button type="button" onClick={() => setLocation("/new-case")} className="mt-5 rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">Create New Case<ArrowUpRight className="ml-2 h-4 w-4" /></Button>}</div>}
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-[#EDE3E5] bg-white p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E7EB] text-[#A6556A]"><FileCheck2 className="h-5 w-5" /></span><div><p className="text-sm font-extrabold text-[#44343A]">Review focus</p><p className="mt-1 text-sm text-[#806C73]">{workspaceCases.length ? `${reviewCases} case${reviewCases === 1 ? "" : "s"} awaiting clinician review.` : "Create the first case to start the workspace."}</p></div></div><Button type="button" onClick={() => setLocation(workspaceCases.length ? "/cases" : "/new-case")} variant="link" className="mt-5 h-auto px-0 text-sm font-extrabold text-[#A6556A] hover:text-[#813E50]">{workspaceCases.length ? "Open Case Overview" : "Create New Case"}<ArrowUpRight className="ml-1.5 h-4 w-4" /></Button></div><div className="rounded-2xl border border-[#EDE3E5] bg-[#FFF9FA] p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C97C8D] text-white"><Sparkles className="h-5 w-5" /></span><div><p className="text-sm font-extrabold text-[#44343A]">KneeCo assessment</p><p className="mt-1 text-sm text-[#806C73]">Measurements and implant planning remain clinician-reviewed decision support.</p></div></div></div></section>
      </div>
    </KneeCoAppShell>
  );
}
