import type { OaClassificationResult, StudyPreflightResult } from "./analysisService";

export function buildCaseAnalysisPersistence(preflight: StudyPreflightResult, oaClassification: OaClassificationResult) {
  const hasOaReviewResult = oaClassification.completed && oaClassification.classification;
  return {
    analysisStatus: hasOaReviewResult ? "ready_for_review" as const : preflight.analysisStatus,
    oaModelName: hasOaReviewResult ? oaClassification.modelName : null,
    oaModelVersion: hasOaReviewResult ? oaClassification.modelVersion : null,
    oaClassificationJson: hasOaReviewResult ? JSON.stringify(oaClassification.classification) : null,
    oaClassifiedAt: hasOaReviewResult ? new Date() : null,
    safeMessage: hasOaReviewResult ? oaClassification.safeMessage : preflight.safeMessage,
  };
}
