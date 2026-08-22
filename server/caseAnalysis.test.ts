import { describe, expect, it } from "vitest";
import { buildCaseAnalysisPersistence } from "./caseAnalysis";

describe("buildCaseAnalysisPersistence", () => {
  const preflight = {
    configured: true,
    completed: true,
    analysisStatus: "review_required" as const,
    safeMessage: "Technical preflight completed.",
  };

  it("persists a successful classifier response as a review-only ready-for-review result", () => {
    const result = buildCaseAnalysisPersistence(preflight, {
      completed: true,
      analysisStatus: "ready_for_review",
      modelName: "KneeCo OA MRI Classifier",
      modelVersion: "oa_mri_project_2026-08-22",
      classification: {
        stageLabel: "ModerateOA",
        stageProbabilities: { Normal: 0.1, MildOA: 0.2, ModerateOA: 0.6, SevereOA: 0.1 },
        topClassProbability: 0.6,
      },
      safeMessage: "Review only.",
    });

    expect(result.analysisStatus).toBe("ready_for_review");
    expect(result.oaModelName).toBe("KneeCo OA MRI Classifier");
    expect(JSON.parse(result.oaClassificationJson ?? "{}")).toMatchObject({ stageLabel: "ModerateOA" });
    expect(result.oaClassifiedAt).toBeInstanceOf(Date);
  });

  it("does not persist classifier fields when no model result was generated", () => {
    const result = buildCaseAnalysisPersistence(preflight, {
      completed: false,
      analysisStatus: "pending_validation",
      modelName: null,
      modelVersion: null,
      classification: null,
      safeMessage: "Classifier unavailable.",
    });

    expect(result).toMatchObject({ analysisStatus: "review_required", oaModelName: null, oaClassificationJson: null, oaClassifiedAt: null });
  });
});
