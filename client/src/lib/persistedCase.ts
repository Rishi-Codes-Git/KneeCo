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
  oaModelName: string | null;
  oaModelVersion: string | null;
  oaClassificationJson: string | null;
  geminiReportModel: string | null;
  geminiReportJson: string | null;
  geminiReportStatus: string | null;
  geminiReportMessage: string | null;
  scanFileKey: string;
  scanFileName: string;
  scanMimeType: string;
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
  let oaClassifierResult: IllustrativeCase["oaClassifierResult"] = null;
  let geminiReportResult: IllustrativeCase["geminiReportResult"] = null;
  let geminiReportState: IllustrativeCase["geminiReportState"] = null;
  if (kneeCase.geminiReportStatus && kneeCase.geminiReportMessage && ["not_configured", "extracted_for_review", "not_a_report", "failed"].includes(kneeCase.geminiReportStatus)) {
    geminiReportState = { status: kneeCase.geminiReportStatus as NonNullable<IllustrativeCase["geminiReportState"]>["status"], message: kneeCase.geminiReportMessage };
  }
  if (kneeCase.oaClassificationJson && kneeCase.oaModelName && kneeCase.oaModelVersion) {
    try {
      const parsed = JSON.parse(kneeCase.oaClassificationJson) as { stageLabel?: string; topClassProbability?: number; stageProbabilities?: Record<string, number> };
      if (["Normal", "MildOA", "ModerateOA", "SevereOA"].includes(parsed.stageLabel ?? "") && typeof parsed.topClassProbability === "number" && parsed.stageProbabilities) {
        oaClassifierResult = {
          stageLabel: parsed.stageLabel as NonNullable<IllustrativeCase["oaClassifierResult"]>["stageLabel"],
          topClassProbability: parsed.topClassProbability,
          stageProbabilities: parsed.stageProbabilities,
          modelName: kneeCase.oaModelName,
          modelVersion: kneeCase.oaModelVersion,
        };
      }
    } catch {
      oaClassifierResult = null;
    }
  }
  if (kneeCase.geminiReportJson && kneeCase.geminiReportModel) {
    try {
      const parsed = JSON.parse(kneeCase.geminiReportJson) as Omit<NonNullable<IllustrativeCase["geminiReportResult"]>, "model">;
      if (parsed && typeof parsed === "object" && ["reported", "not_reported", "unclear"].includes(parsed.oaMention) && Array.isArray(parsed.citedReportPhrases)) {
        geminiReportResult = { ...parsed, model: kneeCase.geminiReportModel };
      }
    } catch {
      geminiReportResult = null;
    }
  }
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
    sourceStudy: {
      url: `/manus-storage/${kneeCase.scanFileKey}`,
      fileName: kneeCase.scanFileName,
      mimeType: kneeCase.scanMimeType,
    },
    oaClassifierResult,
    geminiReportResult,
    geminiReportState,
  };
}
