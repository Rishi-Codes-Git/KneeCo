import type { IllustrativeCase } from "./caseArchive";

export type PersistedKneeCase = {
  caseReference: string;
  patientName: string;
  age: number;
  sex: "female" | "male" | "intersex" | "not_recorded";
  oaStatus: "yes" | "no" | "unknown";
  lifestyleContext: string | null;
  kneeSide: "left" | "right" | "bilateral" | "unknown";
  analysisStatus: "pending_validation" | "queued" | "processing" | "ready_for_review" | "review_required" | "failed";
  updatedAt: Date | string;
};

const sexLabel = {
  female: "Female",
  male: "Male",
  intersex: "Intersex",
  not_recorded: "Not recorded",
} as const;

const kneeSideLabel = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
  unknown: "Not recorded",
} as const;

export function persistedCaseToWorkspaceCase(kneeCase: PersistedKneeCase): IllustrativeCase {
  const requiresReview = kneeCase.analysisStatus === "review_required" || kneeCase.analysisStatus === "ready_for_review";
  const isFailed = kneeCase.analysisStatus === "failed";
  const timestamp = new Date(kneeCase.updatedAt);
  return {
    id: kneeCase.caseReference,
    patientLabel: kneeCase.patientName,
    age: kneeCase.age,
    sex: sexLabel[kneeCase.sex],
    kneeSide: kneeSideLabel[kneeCase.kneeSide],
    oaStatus: kneeCase.oaStatus === "yes" ? "Known" : kneeCase.oaStatus === "no" ? "Not indicated" : "Not recorded",
    lifestyleContext: kneeCase.lifestyleContext || "Not recorded",
    status: requiresReview ? "clinician_review" : "intake_complete",
    statusLabel: requiresReview ? "Review recommended" : isFailed ? "Preflight needs review" : "Intake complete",
    statusNote: requiresReview ? "Technical preflight completed. Validated model output and clinician review remain required." : isFailed ? "Technical preflight did not complete. No anatomy or measurement result was created." : "Image/PDF study is stored and waiting for technical preflight or validated model availability.",
    meniscusThickness: null,
    updatedAt: Number.isNaN(timestamp.getTime()) ? "Recent" : timestamp.toISOString().slice(0, 10),
    reviewer: null,
  };
}
