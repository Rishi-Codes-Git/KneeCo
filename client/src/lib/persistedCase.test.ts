import { describe, expect, it } from "vitest";
import { persistedCaseToWorkspaceCase } from "./persistedCase";

describe("persistedCaseToWorkspaceCase", () => {
  const baseCase = {
    caseReference: "KC-UPLOAD-001",
    patientName: "Samira Patel",
    age: 58,
    sex: "female" as const,
    oaStatus: "unknown" as const,
    lifestyleContext: null,
    kneeSide: "right" as const,
    oaModelName: null,
    oaModelVersion: null,
    oaClassificationJson: null,
    scanFileKey: "cases/KC-UPLOAD-001/study.png",
    scanFileName: "study.png",
    scanMimeType: "image/png",
    updatedAt: "2026-08-23T00:00:00.000Z",
  };

  it("maps a stored preflight-review case to a clinician-review workspace record without inventing a measurement", () => {
    const result = persistedCaseToWorkspaceCase({ ...baseCase, analysisStatus: "review_required" });
    expect(result).toMatchObject({ id: "KC-UPLOAD-001", status: "clinician_review", statusLabel: "Review recommended", meniscusThickness: null });
  });

  it("maps a stored pending case to intake complete", () => {
    const result = persistedCaseToWorkspaceCase({ ...baseCase, analysisStatus: "pending_validation" });
    expect(result).toMatchObject({ status: "intake_complete", statusLabel: "Intake complete" });
  });

  it("exposes a stored image study for the source-study preview", () => {
    const result = persistedCaseToWorkspaceCase({ ...baseCase, analysisStatus: "pending_validation" });
    expect(result.sourceStudy).toEqual({
      url: "/manus-storage/cases/KC-UPLOAD-001/study.png",
      fileName: "study.png",
      mimeType: "image/png",
    });
  });

  it("parses a stored classifier output as review-only metadata", () => {
    const result = persistedCaseToWorkspaceCase({
      ...baseCase,
      analysisStatus: "ready_for_review",
      oaModelName: "KneeCo OA MRI Classifier",
      oaModelVersion: "oa_mri_project_2026-08-22",
      oaClassificationJson: JSON.stringify({ stageLabel: "ModerateOA", topClassProbability: 0.6, stageProbabilities: { Normal: 0.1, MildOA: 0.2, ModerateOA: 0.6, SevereOA: 0.1 } }),
    });
    expect(result.oaClassifierResult).toMatchObject({ stageLabel: "ModerateOA", topClassProbability: 0.6 });
  });
});
