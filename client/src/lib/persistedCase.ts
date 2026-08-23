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
  geminiVisualModel: string | null;
  geminiVisualJson: string | null;
  geminiVisualStatus: string | null;
  geminiVisualMessage: string | null;
  scanFileKey: string;
  scanFileName: string;
  scanMimeType: string;
  updatedAt: Date | string;
};

const sexLabel = { female: "Female", male: "Male", intersex: "Intersex", not_recorded: "Not recorded" } as const;
const kneeSideLabel = { left: "Left", right: "Right", bilateral: "Bilateral", unknown: "Not recorded" } as const;

export function persistedCaseToWorkspaceCase(kneeCase: PersistedKneeCase): IllustrativeCase {
  const requiresReview = kneeCase.analysisStatus === "review_required" || kneeCase.analysisStatus === "ready_for_review";
  const isFailed = kneeCase.analysisStatus === "failed";
  const timestamp = new Date(kneeCase.updatedAt);
  let oaClassifierResult: IllustrativeCase["oaClassifierResult"] = null;
  let geminiReportResult: IllustrativeCase["geminiReportResult"] = null;
  let geminiReportState: IllustrativeCase["geminiReportState"] = null;
  let geminiVisualReview: IllustrativeCase["geminiVisualReview"] = null;
  let geminiVisualState: IllustrativeCase["geminiVisualState"] = null;

  if (kneeCase.geminiReportStatus && kneeCase.geminiReportMessage && ["not_configured", "extracted_for_review", "not_a_report", "failed"].includes(kneeCase.geminiReportStatus)) {
    geminiReportState = { status: kneeCase.geminiReportStatus as NonNullable<IllustrativeCase["geminiReportState"]>["status"], message: kneeCase.geminiReportMessage };
  }
  if (kneeCase.geminiVisualStatus && kneeCase.geminiVisualMessage && ["not_configured", "not_an_image", "visible_for_review", "not_knee_mri_or_unreadable", "failed"].includes(kneeCase.geminiVisualStatus)) {
    geminiVisualState = { status: kneeCase.geminiVisualStatus as NonNullable<IllustrativeCase["geminiVisualState"]>["status"], message: kneeCase.geminiVisualMessage };
  }
  if (kneeCase.oaClassificationJson && kneeCase.oaModelName && kneeCase.oaModelVersion) {
    try {
      const parsed = JSON.parse(kneeCase.oaClassificationJson) as { stageLabel?: string; topClassProbability?: number; stageProbabilities?: Record<string, number> };
      if (["Normal", "MildOA", "ModerateOA", "SevereOA"].includes(parsed.stageLabel ?? "") && typeof parsed.topClassProbability === "number" && parsed.stageProbabilities) {
        oaClassifierResult = { stageLabel: parsed.stageLabel as NonNullable<IllustrativeCase["oaClassifierResult"]>["stageLabel"], topClassProbability: parsed.topClassProbability, stageProbabilities: parsed.stageProbabilities, modelName: kneeCase.oaModelName, modelVersion: kneeCase.oaModelVersion };
      }
    } catch { oaClassifierResult = null; }
  }
  if (kneeCase.geminiReportJson && kneeCase.geminiReportModel) {
    try {
      const parsed = JSON.parse(kneeCase.geminiReportJson) as Omit<NonNullable<IllustrativeCase["geminiReportResult"]>, "model">;
      if (parsed && typeof parsed === "object" && ["reported", "not_reported", "unclear"].includes(parsed.oaMention) && Array.isArray(parsed.citedReportPhrases)) {
        geminiReportResult = { ...parsed, model: kneeCase.geminiReportModel };
      }
    } catch { geminiReportResult = null; }
  }
  if (kneeCase.geminiVisualJson && kneeCase.geminiVisualModel) {
    try {
      const parsed = JSON.parse(kneeCase.geminiVisualJson) as Omit<NonNullable<IllustrativeCase["geminiVisualReview"]>, "model"> & { studyType?: string };
      if (parsed.studyType === "knee_mri_image" && parsed.femur && parsed.tibia && parsed.medialMeniscus) {
        geminiVisualReview = {
          model: kneeCase.geminiVisualModel,
          imageQuality: parsed.imageQuality,
          femur: parsed.femur,
          tibia: parsed.tibia,
          medialMeniscus: parsed.medialMeniscus,
          roughEstimates: parsed.roughEstimates,
          oaVisualAssessment: parsed.oaVisualAssessment,
          implantPlanning: parsed.implantPlanning,
          presentationTestOutput: parsed.presentationTestOutput?.simulationStatus === "simulated_not_clinical" ? parsed.presentationTestOutput : undefined,
          reviewNote: parsed.reviewNote,
        };
      }
    } catch { geminiVisualReview = null; }
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
    sourceStudy: { url: `/manus-storage/${kneeCase.scanFileKey}`, fileName: kneeCase.scanFileName, mimeType: kneeCase.scanMimeType },
    oaClassifierResult,
    geminiReportResult,
    geminiReportState,
    geminiVisualReview,
    geminiVisualState,
  };
}
