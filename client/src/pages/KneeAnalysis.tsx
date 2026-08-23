import { KneeCoAppShell } from "@/components/KneeCoAppShell";
import { Button } from "@/components/ui/button";
import { type IllustrativeCase } from "@/lib/caseArchive";
import { persistedCaseToWorkspaceCase } from "@/lib/persistedCase";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileImage, Maximize2, Minus, Plus, RotateCcw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type AnalysisTab = "mri" | "analysis";

const tabs: Array<{ id: AnalysisTab; label: string }> = [
  { id: "analysis", label: "Knee Analysis" },
  { id: "mri", label: "MRI View" },
];

function SourceStudyPanel({ study, onCreateCase }: { study: IllustrativeCase["sourceStudy"]; onCreateCase: () => void }) {
  if (study?.mimeType.startsWith("image/")) {
    return <div className="overflow-hidden rounded-[1.5rem] border border-[#EAE0E2] bg-[#F8F5F6]"><div className="flex items-center justify-between border-b border-[#EAE0E2] bg-white px-4 py-3"><span className="flex items-center gap-2 text-xs font-extrabold text-[#634B53]"><FileImage className="h-4 w-4 text-[#A6556A]" />{study.fileName}</span><span className="rounded-full bg-[#F8E7EB] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#995969]">Source study</span></div><div className="flex min-h-[320px] items-center justify-center p-4 sm:min-h-[460px]"><img src={study.url} alt={`Uploaded knee study: ${study.fileName}`} className="max-h-[440px] w-auto max-w-full rounded-xl object-contain shadow-[0_12px_32px_-22px_rgba(58,42,48,.5)]" /></div><p className="border-t border-[#EAE0E2] bg-white px-4 py-3 text-xs leading-5 text-[#806C73]">Review the source image alongside the Knee Analysis findings.</p></div>;
  }
  if (study?.mimeType === "application/pdf") {
    return <div className="overflow-hidden rounded-[1.5rem] border border-[#EAE0E2] bg-white"><div className="flex items-center justify-between border-b border-[#EAE0E2] px-4 py-3"><span className="flex items-center gap-2 text-xs font-extrabold text-[#634B53]"><FileImage className="h-4 w-4 text-[#A6556A]" />{study.fileName}</span><span className="rounded-full bg-[#F8E7EB] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#995969]">PDF source</span></div><iframe title={`Uploaded knee study: ${study.fileName}`} src={study.url} className="h-[460px] w-full bg-[#F8F5F6]" /><p className="border-t border-[#EAE0E2] px-4 py-3 text-xs leading-5 text-[#806C73]">Review the uploaded source alongside the Knee Analysis findings.</p></div>;
  }
  return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#DEC9CE] bg-[#FFFAFB] p-8 text-center sm:min-h-[360px]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7E5E9] text-[#A6556A]"><FileImage className="h-6 w-6" /></span><h4 className="mt-4 text-base font-extrabold text-[#493940]">No source study attached to this case</h4><p className="mt-2 max-w-sm text-sm leading-6 text-[#806C73]">Create a case with a knee study to begin the image review workflow.</p><Button type="button" onClick={onCreateCase} className="mt-5 rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]"><Upload className="mr-2 h-4 w-4" />Add a knee study</Button></div>;
}

function KneeAssessment({ review, state }: { review: IllustrativeCase["geminiVisualReview"]; state: IllustrativeCase["geminiVisualState"] }) {
  if (!review) {
    return <section className="rounded-[1.6rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)]"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">KneeCo image assessment</p><h3 className="mt-2 text-xl font-extrabold text-[#3E3036]">Image review pending</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#806C73]">{state?.message ?? "Upload a readable knee MRI image to gather visual OA findings, anatomy descriptors, and available image-derived values."}</p></section>;
  }

  const roughMeasurements = [
    ["Femoral width", review.roughEstimates.femoralWidthMm], ["Femoral AP", review.roughEstimates.femoralApMm], ["Tibial width", review.roughEstimates.tibialWidthMm], ["Tibial AP", review.roughEstimates.tibialApMm],
    ["Meniscus anterior", review.roughEstimates.medialMeniscusAnteriorMm], ["Meniscus body", review.roughEstimates.medialMeniscusBodyMm], ["Meniscus posterior", review.roughEstimates.medialMeniscusPosteriorMm],
  ] as const;
  const structures = [["Femur", review.femur.visualDescriptor], ["Tibia", review.tibia.visualDescriptor], ["Medial meniscus", review.medialMeniscus.visualDescriptor]] as const;
  const oaLabel = review.oaVisualAssessment.status.replaceAll("_", " ");
  const oaTone = review.oaVisualAssessment.status === "features_present" ? "border-[#E9CBD2] bg-[#FFF5F6] text-[#873E51]" : review.oaVisualAssessment.status === "features_possible" ? "border-[#F0D6AD] bg-[#FFFAF0] text-[#986526]" : "border-[#DCE8E2] bg-[#F7FCF9] text-[#397B5D]";
  const planningLabel = review.implantPlanning.status === "candidate_sizing_preview" ? `${review.implantPlanning.candidateSizeBand} sizing preview` : "Planning not triggered";
  const presentationOutput = review.presentationTestOutput;
  const planningReferenceFields = presentationOutput ? [
    ["System", presentationOutput.simulatedPlan.systemId], ["Procedure", presentationOutput.simulatedPlan.procedure],
    ["Femoral component", presentationOutput.simulatedPlan.femoralComponent], ["Tibial tray", presentationOutput.simulatedPlan.tibialTray],
    ["Polyethylene insert", presentationOutput.simulatedPlan.polyethyleneInsertThicknessMm === null ? null : `${presentationOutput.simulatedPlan.polyethyleneInsertThicknessMm} mm`],
    ["Patellar component", presentationOutput.simulatedPlan.patellarDiameterMm === null ? null : `${presentationOutput.simulatedPlan.patellarDiameterMm} mm × ${presentationOutput.simulatedPlan.patellarThicknessMm} mm`],
    ["Femoral resection", presentationOutput.simulatedPlan.femoralResectionMm === null ? null : `${presentationOutput.simulatedPlan.femoralResectionMm} mm`],
    ["Tibial resection", presentationOutput.simulatedPlan.tibialResectionMm === null ? null : `${presentationOutput.simulatedPlan.tibialResectionMm} mm`],
    ["Joint-line adjustment", presentationOutput.simulatedPlan.jointLineAdjustmentMm === null ? null : `${presentationOutput.simulatedPlan.jointLineAdjustmentMm > 0 ? "+" : ""}${presentationOutput.simulatedPlan.jointLineAdjustmentMm} mm`],
    ["Fixation", presentationOutput.simulatedPlan.fixation],
  ] as const : [];

  return <section className="rounded-[1.6rem] border border-[#EDE3E5] bg-white p-6 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">KneeCo image assessment</p><h3 className="mt-2 text-2xl font-extrabold text-[#3E3036]">OA review and measurements</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#806C73]">Image-derived OA findings, anatomy observations, and available scale-guided values for clinician review.</p></div><span className="w-fit rounded-full bg-[#F8E7EB] px-3 py-1.5 text-xs font-extrabold text-[#934F60]">Image review</span></div>
    <div className={`mt-6 rounded-2xl border p-5 ${oaTone}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] opacity-75">Visual OA assessment</p><p className="mt-2 text-lg font-extrabold capitalize">{oaLabel}</p></div><span className="w-fit rounded-full bg-white/70 px-3 py-1.5 text-xs font-extrabold">Clinician review</span></div><p className="mt-3 max-w-3xl text-sm leading-6">{review.oaVisualAssessment.descriptor}</p></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{structures.map(([label, descriptor]) => <div key={label} className="rounded-xl border border-[#EEE3E5] bg-[#FFFCFC] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9C858C]">{label}</p><p className="mt-2 text-xs leading-5 text-[#806C73]">{descriptor ?? "No visual descriptor available."}</p></div>)}</div>
    <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#A6556A]">Image-derived values</p><p className="text-xs font-semibold text-[#9A858C]">{review.roughEstimates.scaleDetected ? "Scale marker detected" : "No confirmed scale marker"}</p></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{roughMeasurements.map(([label, value]) => <div key={label} className="rounded-xl border border-[#EEE3E5] bg-white p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9C858C]">{label}</p><p className="mt-2 text-xl font-extrabold text-[#493940]">{typeof value === "number" ? `${value.toFixed(1)} mm` : "—"}</p><p className="mt-1 text-xs text-[#9A858C]">{typeof value === "number" ? "Visual estimate" : "Not available"}</p></div>)}</div>
    {presentationOutput ? <section className="mt-6 rounded-2xl border border-[#E4CBD1] bg-[#FFF6F7] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#A6556A]">Planning reference</p><h4 className="mt-2 text-lg font-extrabold text-[#493940]">{presentationOutput.imageId} · {presentationOutput.syntheticClass}</h4></div><span className="w-fit rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9A5967]">Review required</span></div><p className="mt-3 text-sm leading-6 text-[#765E65]">Reference classification and component values are available for clinician review.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{planningReferenceFields.map(([label, value]) => <div key={label} className="rounded-xl border border-[#EAD9DD] bg-white p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#A17D86]">{label}</p><p className="mt-2 text-sm font-extrabold text-[#493940]">{value ?? "N/A"}</p></div>)}</div></section> : <div className="mt-6 rounded-xl border border-[#EEE3E5] bg-[#FFFCFC] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9C858C]">Planning support</p><p className="mt-2 text-sm font-extrabold capitalize text-[#493940]">{planningLabel}</p><p className="mt-2 text-xs leading-5 text-[#806C73]">{review.implantPlanning.rationale}</p></div>}<p className="mt-6 border-t border-[#F0E7E9] pt-4 text-xs leading-5 text-[#806C73]">{review.reviewNote} Image-derived values and OA findings require clinician confirmation.</p></section>;
}

export default function KneeAnalysis() {
  const [, setLocation] = useLocation();
  const [, analysisParams] = useRoute("/cases/:caseId/analysis");
  const [, caseParams] = useRoute("/cases/:caseId");
  const caseReference = analysisParams?.caseId ?? caseParams?.caseId ?? "unavailable";
  const storedCase = trpc.cases.get.useQuery({ caseReference });
  const record = storedCase.data ? persistedCaseToWorkspaceCase(storedCase.data) : null;
  const utils = trpc.useUtils();
  const deleteCase = trpc.cases.delete.useMutation({
    onSuccess: async (result) => {
      if (result.deleted) {
        toast.success("Case deleted from the workspace.");
        await utils.cases.list.invalidate();
        setLocation("/cases");
      }
    },
    onError: () => toast.error("Case deletion could not complete. Please try again."),
  });
  const [tab, setTab] = useState<AnalysisTab>("analysis");

  function removeCase() {
    if (window.confirm(`Delete case ${caseReference}? This removes it from the workspace.`)) {
      deleteCase.mutate({ caseReference });
    }
  }

  if (!record) {
    return <KneeCoAppShell eyebrow="Clinical case" title="Knee Analysis"><div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8E7EB] text-[#A6556A]"><FileImage className="h-6 w-6" /></span><h2 className="font-kneeco-display mt-5 text-3xl text-[#352C30]">{storedCase.isLoading ? "Loading case" : "Case not found"}</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#806C73]">{storedCase.isLoading ? "Preparing the measurement workspace." : "This case is no longer in the workspace. Create a new case to begin review."}</p>{!storedCase.isLoading && <Button type="button" onClick={() => setLocation("/new-case")} className="mt-6 rounded-xl bg-[#C97C8D] text-white hover:bg-[#A6556A]">Create New Case</Button>}</div></KneeCoAppShell>;
  }

  return <KneeCoAppShell eyebrow="Clinical case" title="Knee Analysis"><div className="mx-auto max-w-7xl"><button type="button" onClick={() => setLocation("/cases")} className="mb-5 inline-flex items-center text-sm font-extrabold text-[#8A5563] transition hover:text-[#733963]"><ArrowLeft className="mr-2 h-4 w-4" />Back to Case Overview</button>
    <section className="rounded-[1.75rem] border border-[#EFE4E6] bg-white p-7 shadow-[0_18px_45px_-35px_rgba(92,49,61,0.35)] sm:p-9"><div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#A6556A]">AI-assisted review</p><h2 className="font-kneeco-display mt-3 text-4xl tracking-[-0.04em] text-[#352C30]">Knee Analysis</h2><p className="mt-3 text-sm leading-6 text-[#7A676E]">Case {record.id} · {record.patientLabel} · {record.kneeSide} knee</p></div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-[#F8E7EB] px-3 py-2 text-xs font-extrabold text-[#934F60]">{record.geminiVisualReview ? "Assessment available" : "Awaiting image review"}</span><Button type="button" onClick={removeCase} disabled={deleteCase.isPending} variant="outline" className="rounded-xl border-[#EBCFD5] bg-white text-[#A6556A] hover:bg-[#FFF2F4] hover:text-[#8A3E50]"><Trash2 className="mr-2 h-4 w-4" />Delete Case</Button><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E7EB] text-[#A6556A]"><ShieldCheck className="h-5 w-5" /></span></div></div><div className="mt-8 flex w-full overflow-x-auto rounded-xl border border-[#EDE2E5] bg-[#FFFAFB] p-1.5">{tabs.map((item) => <button type="button" key={item.id} onClick={() => setTab(item.id)} className={`min-w-[150px] flex-1 rounded-lg px-4 py-2.5 text-sm font-extrabold transition ${tab === item.id ? "bg-[#733963] text-white shadow-sm" : "text-[#7E686F] hover:bg-white hover:text-[#533F47]"}`}>{item.label}</button>)}</div></section>
    {tab === "analysis" && <section className="mt-7"><KneeAssessment review={record.geminiVisualReview} state={record.geminiVisualState} /></section>}
    {tab === "mri" && <section className="mt-7"><div className="rounded-[1.6rem] border border-[#EDE3E5] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(92,49,61,0.38)] sm:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#A6556A]">MRI review</p><h3 className="mt-2 text-xl font-extrabold text-[#3E3036]">Source study</h3></div><div className="flex flex-wrap gap-2"><button type="button" disabled aria-label="Zoom out unavailable until a source image is available" className="rounded-lg border border-[#E6DADD] p-2 text-[#B5A2A7]"><Minus className="h-4 w-4" /></button><button type="button" disabled aria-label="Zoom in unavailable until a source image is available" className="rounded-lg border border-[#E6DADD] p-2 text-[#B5A2A7]"><Plus className="h-4 w-4" /></button><button type="button" disabled aria-label="Reset view unavailable until a source image is available" className="rounded-lg border border-[#E6DADD] p-2 text-[#B5A2A7]"><RotateCcw className="h-4 w-4" /></button><button type="button" disabled aria-label="Expand viewer unavailable until a source image is available" className="rounded-lg border border-[#E6DADD] p-2 text-[#B5A2A7]"><Maximize2 className="h-4 w-4" /></button></div></div><SourceStudyPanel study={record.sourceStudy} onCreateCase={() => setLocation("/new-case")} /></div></section>}
  </div></KneeCoAppShell>;
}
