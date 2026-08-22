import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { CaseStatus, filterIllustrativeCases, IllustrativeCase, illustrativeCases } from "@/lib/caseArchive";
import { ArrowUpRight, ClipboardList, FileCheck2, Filter, FolderOpenDot, Search, Sparkles, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const statusStyle: Record<CaseStatus, string> = {
  analysis_ready: "bg-[#F8E7EB] text-[#934F60]",
  clinician_review: "bg-[#FFF3DE] text-[#A76A1B]",
  report_signed: "bg-[#E8F4EF] text-[#2D7A58]",
  intake_complete: "bg-[#F1EDF7] text-[#725486]",
};

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-[#EEE4E6] bg-white p-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#9E868D]">{label}</p><p className="font-kneeco-display mt-3 text-3xl tracking-[-0.04em] text-[#352C30]">{value}</p><p className="mt-1 text-xs leading-5 text-[#806C73]">{detail}</p></div>;
}

function CaseListItem({ record, selected, onSelect }: { record: IllustrativeCase; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`grid w-full gap-3 border-b border-[#F0E7E9] px-5 py-5 text-left transition last:border-0 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center md:gap-5 ${selected ? "bg-[#FFF7F8]" : "bg-white hover:bg-[#FFFAFB]"}`}>
      <div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#43343A]">{record.patientLabel}</p><p className="mt-1 text-xs font-semibold text-[#927C84]">{record.id} · {record.kneeSide} knee MRI</p></div>
      <p className="text-sm text-[#755F67]"><span className="font-bold text-[#5A484E]">{record.age}</span> years · {record.sex}</p>
      <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusStyle[record.status]}`}>{record.statusLabel}</span><p className="mt-1.5 text-xs text-[#958087]">{record.updatedAt}</p></div>
      <ArrowUpRight className={`hidden h-4 w-4 justify-self-end transition md:block ${selected ? "text-[#A6556A]" : "text-[#C9B7BC]"}`} />
    </button>
  );
}

export default function AllCases() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CaseStatus>("all");
  const [selectedId, setSelectedId] = useState(illustrativeCases[0].id);
  const records = useMemo(() => filterIllustrativeCases(illustrativeCases, query, status), [query, status]);
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  return (
    <KneeCoAppShell eyebrow="Case archive" title="All Cases">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-9">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Organised by clinician</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.035em] text-[#352C30]">Your case archive.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7B686F]">A focused view of knee MRI intake, review readiness, and clinician-approved reports.</p></div><Button type="button" onClick={() => setLocation("/new-case")} className="h-11 rounded-xl bg-[#C97C8D] px-5 text-white hover:bg-[#A6556A]"><FolderOpenDot className="mr-2 h-4 w-4" />New Case</Button></div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3"><SummaryMetric label="Active cases" value="4" detail="In this clinician workspace" /><SummaryMetric label="Review focus" value="1" detail="Case requesting attention" /><SummaryMetric label="Reports signed" value="1" detail="Clinician-approved record" /></div>
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-[1.55fr_0.85fr]">
          <div className="overflow-hidden rounded-[1.6rem] border border-[#EDE3E5] bg-white shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)]">
            <div className="border-b border-[#F0E7E9] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold text-[#44343A]">Case overview</p><p className="mt-1 text-xs leading-5 text-[#927D85]">Illustrative records shown until connected MRI cases are available.</p></div><span className="rounded-full bg-[#FBF0F2] px-3 py-1.5 text-[11px] font-extrabold text-[#9A5969]">{records.length} visible</span></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative block flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A28C92]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case ID or patient label" className="h-11 w-full rounded-xl border border-[#E8DDDF] bg-white pl-10 pr-4 text-sm font-semibold text-[#4A3A40] outline-none placeholder:text-[#B19DA3] focus:ring-2 focus:ring-[#C97C8D]" /></label><label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A28C92]" /><select value={status} onChange={(event) => setStatus(event.target.value as "all" | CaseStatus)} className="h-11 w-full rounded-xl border border-[#E8DDDF] bg-white py-0 pl-9 pr-8 text-sm font-bold text-[#5B484F] outline-none focus:ring-2 focus:ring-[#C97C8D] sm:w-48"><option value="all">All statuses</option><option value="analysis_ready">Analysis ready</option><option value="clinician_review">Review recommended</option><option value="report_signed">Report signed</option><option value="intake_complete">Intake complete</option></select></label></div></div>
            <div className="hidden border-b border-[#F0E7E9] bg-[#FFFAFB] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9D868D] md:grid md:grid-cols-[1.3fr_1fr_1fr_auto] md:gap-5"><span>Patient & study</span><span>Context</span><span>Case status</span><span /></div>
            {records.length > 0 ? records.map((record) => <CaseListItem key={record.id} record={record} selected={selected?.id === record.id} onSelect={() => setSelectedId(record.id)} />) : <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><ClipboardList className="h-6 w-6 text-[#B48791]" /><p className="mt-4 text-sm font-extrabold text-[#4A393F]">No matching cases</p><p className="mt-2 text-sm text-[#8A747B]">Adjust the search or status filter to view another case.</p></div>}
          </div>

          <aside className="h-fit rounded-[1.6rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)] xl:sticky xl:top-24">
            {selected ? <><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">Selected case</p><h3 className="mt-2 text-xl font-extrabold text-[#3E3036]">{selected.patientLabel}</h3><p className="mt-1 text-sm font-semibold text-[#8C767E]">{selected.id}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statusStyle[selected.status]}`}>{selected.statusLabel}</span></div><div className="mt-7 space-y-5"><div className="rounded-xl bg-[#FFFAFB] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A838A]">MRI context</p><p className="mt-2 text-sm font-extrabold text-[#493940]">{selected.kneeSide} knee MRI</p><p className="mt-1 text-xs leading-5 text-[#806B72]">Age {selected.age} · {selected.sex} · OA {selected.oaStatus}</p></div><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A838A]">Clinical note</p><p className="mt-2 text-sm leading-6 text-[#69565D]">{selected.statusNote}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#EEE3E5] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A838A]">Meniscus</p><p className="mt-2 text-lg font-extrabold text-[#46363D]">{selected.meniscusThickness ?? "—"}</p></div><div className="rounded-xl border border-[#EEE3E5] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A838A]">Lifestyle</p><p className="mt-2 text-sm font-extrabold leading-5 text-[#46363D]">{selected.lifestyleContext}</p></div></div>{selected.reviewer && <div className="flex gap-3 rounded-xl border border-[#DCEDE4] bg-[#F4FAF6] p-3 text-sm text-[#397357]"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />Approved by {selected.reviewer}</div>}<div className="flex gap-3 rounded-xl border border-[#F0E5E7] bg-[#FFFAFB] p-3 text-sm text-[#7A676E]"><Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-[#A6556A]" />Decision support only—not a final diagnosis.</div></div><button type="button" onClick={() => setLocation("/new-case")} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-[#DEC5CB] py-3 text-sm font-extrabold text-[#914F60] transition hover:bg-[#FFF5F6]">Create related case<ArrowUpRight className="h-4 w-4" /></button></> : <div className="flex min-h-80 flex-col items-center justify-center text-center"><Sparkles className="h-6 w-6 text-[#B78691]" /><p className="mt-4 text-sm font-extrabold text-[#493940]">Select a case</p><p className="mt-2 text-sm leading-6 text-[#88727A]">Details will appear here.</p></div>}
          </aside>
        </section>
      </div>
    </KneeCoAppShell>
  );
}
