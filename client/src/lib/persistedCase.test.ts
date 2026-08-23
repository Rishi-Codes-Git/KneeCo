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
    geminiReportModel: null,
    geminiReportJson: null,
    geminiReportStatus: null,
    geminiReportMessage: null,
    geminiVisualModel: null,
    geminiVisualJson: null,
    geminiVisualStatus: null,
    geminiVisualMessage: null,
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

  it("parses a stored report extraction separately from image-model outputs", () => {
    const result = persistedCaseToWorkspaceCase({
      ...baseCase,
      analysisStatus: "ready_for_review",
      geminiReportModel: "gemini-2.5-flash",
      geminiReportStatus: "extracted_for_review",
      geminiReportMessage: "Report extraction complete.",
      geminiReportJson: JSON.stringify({
        summary: "Report summary.", oaMention: "reported", oaSeverity: "mild", femurFinding: null, tibiaFinding: null,
        medialMeniscusFinding: "Extrusion reported.", femoralWidthMm: null, femoralApMm: null, tibialWidthMm: null, tibialApMm: null,
        medialMeniscusAnteriorMm: null, medialMeniscusBodyMm: null, medialMeniscusPosteriorMm: null, citedReportPhrases: ["Mild OA"], reviewNote: "Verify clinically.",
      }),
    });
    expect(result.geminiReportResult).toMatchObject({ model: "gemini-2.5-flash", oaMention: "reported", medialMeniscusFinding: "Extrusion reported." });
    expect(result.geminiReportState).toEqual({ status: "extracted_for_review", message: "Report extraction complete." });
  });

  it("keeps a non-report extraction state visible without fabricating report findings", () => {
    const result = persistedCaseToWorkspaceCase({
      ...baseCase,
      analysisStatus: "review_required",
      geminiReportStatus: "not_a_report",
      geminiReportMessage: "The uploaded file was not recognised as a readable knee radiology report.",
    });
    expect(result.geminiReportResult).toBeNull();
    expect(result.geminiReportState).toEqual({
      status: "not_a_report",
      message: "The uploaded file was not recognised as a readable knee radiology report.",
    });
  });

  it("maps non-calibrated visual anatomy descriptors without creating mm values", () => {
    const result = persistedCaseToWorkspaceCase({
      ...baseCase,
      geminiVisualModel: "gemini-2.5-flash",
      geminiVisualStatus: "visible_for_review",
      geminiVisualMessage: "Non-calibrated visual anatomy descriptors are available.",
      geminiVisualJson: JSON.stringify({
        studyType: "knee_mri_image", imageQuality: "limited",
        femur: { visibility: "visible", visualDescriptor: "Visible contour." },
        tibia: { visibility: "partly_visible", visualDescriptor: "Partly visible contour." },
        medialMeniscus: { visibility: "not_assessable", visualDescriptor: null },
        reviewNote: "Non-calibrated visual estimate; clinician review required.",
      }),
    });
    expect(result.geminiVisualReview).toMatchObject({ model: "gemini-2.5-flash", femur: { visibility: "visible" } });
    expect(JSON.stringify(result.geminiVisualReview)).not.toMatch(/mm|millimet/iu);
  });
});
