import { Knee3DModule, type Knee3DDimensions } from "@/components/Knee3DModule";
import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { persistedCaseToWorkspaceCase } from "@/lib/persistedCase";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Box, CheckCircle2, ClipboardCheck, LockKeyhole, Ruler, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type CandidateDetail = {
  rank: number;
  dimensionalProximityScore: number;
  referenceDimensions?: Knee3DDimensions;
  dimensionDeltasMm?: Knee3DDimensions;
};

function metric(value: number | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)} mm` : "—";
}

function delta(value: number | undefined) {
  if (typeof value !== "number") return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} mm`;
}

export default function ImplantAnalysis() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/implant-analysis/:caseId");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
  const selectedReference = params?.caseId;
  const caseList = trpc.cases.list.useQuery();
  const eligibleCases = (caseList.data ?? []).map(persistedCaseToWorkspaceCase).filter((record) => record.geminiVisualReview?.presentationTestOutput?.syntheticOaStatus === "present");
  const activeReference = selectedReference ?? eligibleCases[0]?.id;
  const activeCase = eligibleCases.find((record) => record.id === activeReference) ?? eligibleCases[0];
  const planning = trpc.implant.get.useQuery({ caseReference: activeReference ?? "unavailable" }, { enabled: Boolean(activeReference) });
  const utils = trpc.useUtils();
  const rank = trpc.implant.rank.useMutation({ onSuccess: () => { void planning.refetch(); toast.success("Implant reference ranking is ready for review."); }, onError: () => toast.error("Implant ranking could not be prepared.") });
  const confirm = trpc.implant.confirm.useMutation({ onSuccess: () => { void planning.refetch(); void utils.cases.list.invalidate(); toast.success("Case confirmed for clinician review."); }, onError: () => toast.error("Review the ranked candidates before confirming the case.") });
  const close = trpc.implant.close.useMutation({ onSuccess: () => { void planning.refetch(); void utils.cases.list.invalidate(); toast.success("Case closed in the workspace."); }, onError: () => toast.error("Confirm the ranked candidates before closing the case.") });
  const planningData = planning.data;
  const viewerDimensions = useMemo<Knee3DDimensions>(() => ({
    femoralApMm: planningData?.dimensions?.femoralApMm,
    femoralWidthMm: planningData?.dimensions?.femoralWidthMm,
    tibialApMm: planningData?.dimensions?.tibialApMm,
    tibialWidthMm: planningData?.dimensions?.tibialWidthMm,
  }), [planningData?.dimensions?.femoralApMm, planningData?.dimensions?.femoralWidthMm, planningData?.dimensions?.tibialApMm, planningData?.dimensions?.tibialWidthMm]);
  const planningMeasures = [["Femoral AP", viewerDimensions.femoralApMm], ["Femoral width / ML", viewerDimensions.femoralWidthMm], ["Tibial AP", viewerDimensions.tibialApMm], ["Tibial width / ML", viewerDimensions.tibialWidthMm]];
  const detailRows = selectedCandidate ? [
    ["Femoral AP", selectedCandidate.referenceDimensions?.femoralApMm, selectedCandidate.dimensionDeltasMm?.femoralApMm],
    ["Femoral width / ML", selectedCandidate.referenceDimensions?.femoralWidthMm, selectedCandidate.dimensionDeltasMm?.femoralWidthMm],
    ["Tibial AP", selectedCandidate.referenceDimensions?.tibialApMm, selectedCandidate.dimensionDeltasMm?.tibialApMm],
    ["Tibial width / ML", selectedCandidate.referenceDimensions?.tibialWidthMm, selectedCandidate.dimensionDeltasMm?.tibialWidthMm],
  ] : [];

  return <KneeCoAppShell eyebrow="Planning workspace" title="Implant Analysis"><div className="mx-auto max-w-7xl">
    <section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-9"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">Four-dimension reference fit</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.04em] text-[#352C30]">Implant Analysis</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#7A676E]">Review four image-derived dimensions alongside an interactive before-and-after knee interpretation.</p></div><span className="flex w-fit items-center gap-2 rounded-full bg-[#F8E7EB] px-3 py-2 text-xs font-extrabold text-[#934F60]"><LockKeyhole className="h-3.5 w-3.5" />Eligible planning cases only</span></div></section>
    {eligibleCases.length === 0 ? <section className="mt-7 rounded-[1.5rem] border border-dashed border-[#DEC9CE] bg-white p-10 text-center"><Box className="mx-auto h-8 w-8 text-[#A6556A]" /><h3 className="mt-4 text-xl font-extrabold text-[#493940]">No eligible implant analysis cases</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#806C73]">Implant Analysis becomes available after an OA-positive assessment and all four planning dimensions are available.</p><Button type="button" onClick={() => setLocation("/cases")} className="mt-6 rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">Open Case Overview</Button></section> : <>
      <div className="mt-7 flex gap-3 overflow-x-auto pb-1">{eligibleCases.map((record) => <button key={record.id} type="button" onClick={() => setLocation(`/implant-analysis/${record.id}`)} className={`min-w-[210px] rounded-xl border px-4 py-3 text-left ${record.id === activeReference ? "border-[#C97C8D] bg-[#FFF4F6]" : "border-[#E9DEE1] bg-white"}`}><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#A6556A]">Planning case</p><p className="mt-1 text-sm font-extrabold text-[#493940]">{record.patientLabel}</p><p className="mt-1 text-xs text-[#806C73]">{record.id}</p></button>)}</div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[1.05fr_.95fr]">
        <Knee3DModule hasUploadedStudy={Boolean(activeCase?.sourceStudy)} studyFileName={activeCase?.sourceStudy?.fileName} dimensions={viewerDimensions} />
        <section className="rounded-[1.5rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,.3)]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#A6556A]">Planning measurements</p><h3 className="mt-2 text-xl font-extrabold text-[#493940]">Reference fit inputs</h3></div><Ruler className="h-5 w-5 text-[#A6556A]" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{planningMeasures.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#EEE3E5] bg-[#FFFCFC] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#9C858C]">{label}</p><p className="mt-2 text-2xl font-extrabold text-[#493940]">{typeof value === "number" ? `${value.toFixed(1)} mm` : "—"}</p></div>)}</div>
          {planningData?.rankings?.length ? <><div className="mt-7 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#A6556A]">Ranked sizing references</p><p className="mt-1 text-xs text-[#806C73]">Sorted by four-dimension proximity. Select an arrow to compare values.</p></div><Sparkles className="h-5 w-5 text-[#A6556A]" /></div><div className="mt-3 space-y-2">{planningData.rankings.map((candidate) => <div key={candidate.rank} className="flex items-center gap-3 rounded-xl border border-[#EEE3E5] p-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#733963] text-xs font-extrabold text-white">{candidate.rank}</span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-[#493940]">F AP {metric(candidate.referenceDimensions?.femoralApMm)} · F ML {metric(candidate.referenceDimensions?.femoralWidthMm)}</p><p className="mt-0.5 text-xs text-[#806C73]">T AP {metric(candidate.referenceDimensions?.tibialApMm)} · T ML {metric(candidate.referenceDimensions?.tibialWidthMm)} · proximity {candidate.dimensionalProximityScore.toFixed(1)}%</p></div><button type="button" aria-label={`View ranked reference ${candidate.rank} details`} onClick={() => setSelectedCandidate(candidate as CandidateDetail)} className="rounded-lg p-2 text-[#A6556A] transition hover:bg-[#FFF1F3]"><ArrowRight className="h-4 w-4" /></button></div>)}</div><p className="mt-4 text-xs leading-5 text-[#806C73]">{planningData.summary}</p><div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={() => activeReference && confirm.mutate({ caseReference: activeReference })} disabled={planningData.planningStatus === "confirmed" || planningData.planningStatus === "closed" || confirm.isPending} className="rounded-xl bg-[#733963] text-white hover:bg-[#5C2C4D]"><ClipboardCheck className="mr-2 h-4 w-4" />{planningData.planningStatus === "confirmed" ? "Case confirmed" : "Confirm case"}</Button><Button type="button" variant="outline" onClick={() => activeReference && close.mutate({ caseReference: activeReference })} disabled={planningData.planningStatus !== "confirmed" || close.isPending} className="rounded-xl border-[#EBCFD5] text-[#A6556A] hover:bg-[#FFF2F4]"><CheckCircle2 className="mr-2 h-4 w-4" />{planningData.planningStatus === "closed" ? "Case closed" : "Close case"}</Button></div></> : <div className="mt-7 rounded-2xl border border-dashed border-[#DEC9CE] bg-[#FFFAFB] p-6"><h4 className="font-extrabold text-[#493940]">Prepare ranked references</h4><p className="mt-2 text-sm leading-6 text-[#806C73]">Generate the ranked sizing references from the four available dimensions and the structured catalogue.</p><Button type="button" onClick={() => activeReference && rank.mutate({ caseReference: activeReference })} disabled={rank.isPending} className="mt-5 rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">{rank.isPending ? "Preparing ranking…" : "Generate reference ranking"}</Button></div>}</section>
      </div>
    </>}
    <Dialog open={Boolean(selectedCandidate)} onOpenChange={(open) => !open && setSelectedCandidate(null)}><DialogContent className="max-w-2xl rounded-[1.5rem] border-[#E8DADD] bg-white p-0"><DialogHeader className="border-b border-[#F0E7E9] bg-[#FFF7F8] p-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#A6556A]">Ranked reference {selectedCandidate?.rank}</p><DialogTitle className="mt-2 text-2xl font-extrabold text-[#493940]">Four-dimension reference comparison</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-[#806C73]">Proximity score {selectedCandidate?.dimensionalProximityScore.toFixed(1)}%. Compare catalogue values and their signed difference from the current image-derived values.</DialogDescription></DialogHeader><div className="p-6"><div className="grid gap-3 sm:grid-cols-2">{detailRows.map(([label, referenceValue, deltaValue]) => <div key={String(label)} className="rounded-xl border border-[#EEE3E5] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#9C858C]">{label}</p><div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A78B93]">Reference</p><p className="mt-1 text-lg font-extrabold text-[#493940]">{metric(referenceValue as number | undefined)}</p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A78B93]">Difference</p><p className="mt-1 text-sm font-extrabold text-[#A6556A]">{delta(deltaValue as number | undefined)}</p></div></div></div>)}</div><p className="mt-5 rounded-xl bg-[#F9F3F5] p-4 text-xs leading-5 text-[#806C73]">These references are ranked by the combined four-dimension proximity score. Confirm dimensional review before selecting a planning reference.</p></div></DialogContent></Dialog>
  </div></KneeCoAppShell>;
}
