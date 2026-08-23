import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createKneeCase,
  deleteKneeCaseByReference,
  getKneeCaseByReference,
  listKneeCases,
  upsertClinicianProfile,
  getAnalysisServiceStatus,
  requestOaClassification,
  requestStudyPreflight,
  extractGeminiMriReport,
  reviewGeminiMriImage,
  storagePut,
} = vi.hoisted(() => ({
  createKneeCase: vi.fn(),
  deleteKneeCaseByReference: vi.fn(),
  getKneeCaseByReference: vi.fn(),
  listKneeCases: vi.fn(),
  upsertClinicianProfile: vi.fn(),
  getAnalysisServiceStatus: vi.fn(),
  requestOaClassification: vi.fn(),
  requestStudyPreflight: vi.fn(),
  extractGeminiMriReport: vi.fn(),
  reviewGeminiMriImage: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({ createKneeCase, deleteKneeCaseByReference, getKneeCaseByReference, listKneeCases, upsertClinicianProfile }));
vi.mock("./analysisService", () => ({ getAnalysisServiceStatus, requestOaClassification, requestStudyPreflight }));
vi.mock("./geminiReport", () => ({ extractGeminiMriReport }));
vi.mock("./geminiVisualReview", () => ({ reviewGeminiMriImage }));
vi.mock("./storage", () => ({ storagePut }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { persistedCaseToWorkspaceCase } from "../client/src/lib/persistedCase";

describe("cases.create with OA classifier output", () => {
  beforeEach(() => {
    createKneeCase.mockReset();
    deleteKneeCaseByReference.mockReset();
    getKneeCaseByReference.mockReset();
    listKneeCases.mockReset();
    getAnalysisServiceStatus.mockReset();
    requestOaClassification.mockReset();
    requestStudyPreflight.mockReset();
    extractGeminiMriReport.mockReset();
    reviewGeminiMriImage.mockReset();
    storagePut.mockReset();
  });

  it("persists a successful FastAPI review-only OA classifier response with ready-for-review status", async () => {
    storagePut.mockResolvedValue({ key: "cases/KC-TEST/study.png", url: "/manus-storage/cases/KC-TEST/study.png" });
    requestStudyPreflight.mockResolvedValue({ configured: true, completed: true, analysisStatus: "review_required", safeMessage: "Preflight completed." });
    requestOaClassification.mockResolvedValue({
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
    extractGeminiMriReport.mockResolvedValue({
      completed: true,
      status: "extracted_for_review",
      model: "gemini-2.5-flash",
      extraction: {
        documentType: "radiology_report",
        summary: "Report summary.",
        oaMention: "reported",
        oaSeverity: "mild",
        femurFinding: null,
        tibiaFinding: null,
        medialMeniscusFinding: "Reported finding.",
        femoralWidthMm: null,
        femoralApMm: null,
        tibialWidthMm: null,
        tibialApMm: null,
        medialMeniscusAnteriorMm: null,
        medialMeniscusBodyMm: null,
        medialMeniscusPosteriorMm: null,
        citedReportPhrases: ["Reported finding"],
        reviewNote: "Verify clinically.",
      },
      safeMessage: "Report extraction complete.",
    });
    reviewGeminiMriImage.mockResolvedValue({
      completed: true,
      status: "visible_for_review",
      model: "gemini-2.5-flash",
      review: {
        studyType: "knee_mri_image", imageQuality: "limited",
        femur: { visibility: "visible", visualDescriptor: "Visible contour." },
        tibia: { visibility: "partly_visible", visualDescriptor: "Partly visible contour." },
        medialMeniscus: { visibility: "not_assessable", visualDescriptor: null },
        reviewNote: "Non-calibrated visual estimate; clinician review required.",
      },
      safeMessage: "Visual review complete.",
    });
    createKneeCase.mockResolvedValue(undefined);

    const caller = appRouter.createCaller({} as TrpcContext);
    const result = await caller.cases.create({
      patientId: "PT-001",
      patientName: "Test Patient",
      age: 55,
      sex: "female",
      oaStatus: "unknown",
      kneeSide: "right",
      scan: {
        fileName: "study.png",
        contentType: "image/png",
        sizeBytes: 3,
        contentBase64: "YWJj",
      },
    });

    expect(result).toMatchObject({ analysisStatus: "ready_for_review", oaClassificationCompleted: true, reportExtractionCompleted: true, visualReviewCompleted: true, safeMessage: "Report extraction complete." });
    expect(createKneeCase).toHaveBeenCalledWith(expect.objectContaining({
      analysisStatus: "ready_for_review",
      oaModelName: "KneeCo OA MRI Classifier",
      oaModelVersion: "oa_mri_project_2026-08-22",
    }));
    const persisted = createKneeCase.mock.calls[0][0];
    expect(JSON.parse(persisted.oaClassificationJson)).toMatchObject({ stageLabel: "ModerateOA", topClassProbability: 0.6 });
    expect(persisted.oaClassifiedAt).toBeInstanceOf(Date);
    expect(persisted).toMatchObject({ geminiReportModel: "gemini-2.5-flash" });
    expect(JSON.parse(persisted.geminiReportJson)).toMatchObject({ documentType: "radiology_report", oaMention: "reported" });
    expect(persisted).toMatchObject({ geminiReportStatus: "extracted_for_review", geminiReportMessage: "Report extraction complete." });
    expect(persisted).toMatchObject({ geminiVisualModel: "gemini-2.5-flash", geminiVisualStatus: "visible_for_review", geminiVisualMessage: "Visual review complete." });
  });

  it("deletes the selected case reference through the clinician case-management route", async () => {
    deleteKneeCaseByReference.mockResolvedValue(true);
    const caller = appRouter.createCaller({} as TrpcContext);

    await expect(caller.cases.delete({ caseReference: "KC-REMOVE" })).resolves.toEqual({ deleted: true });
    expect(deleteKneeCaseByReference).toHaveBeenCalledWith("KC-REMOVE");
  });

  it("persists and maps an explicitly non-clinical structured presentation output for the clinician interface", async () => {
    storagePut.mockResolvedValue({ key: "cases/KC-PRESENTATION/study.png", url: "/manus-storage/cases/KC-PRESENTATION/study.png" });
    requestStudyPreflight.mockResolvedValue({ configured: false, completed: false, analysisStatus: "pending_validation", safeMessage: "Preflight pending." });
    requestOaClassification.mockResolvedValue({ completed: false, analysisStatus: "pending_validation", modelName: null, modelVersion: null, classification: null, safeMessage: "Classifier pending." });
    extractGeminiMriReport.mockResolvedValue({ completed: false, status: "not_a_report", model: null, extraction: null, safeMessage: "No report." });
    reviewGeminiMriImage.mockResolvedValue({
      completed: true, status: "visible_for_review", model: "KneeCo presentation test record", safeMessage: "Synthetic presentation-test output loaded.",
      review: {
        studyType: "knee_mri_image", imageQuality: "sufficient_for_visual_review",
        femur: { visibility: "visible", visualDescriptor: "Visible." }, tibia: { visibility: "visible", visualDescriptor: "Visible." }, medialMeniscus: { visibility: "partly_visible", visualDescriptor: "Partly visible." },
        roughEstimates: { scaleDetected: true, femoralWidthMm: null, femoralApMm: null, tibialWidthMm: null, tibialApMm: null, medialMeniscusAnteriorMm: null, medialMeniscusBodyMm: null, medialMeniscusPosteriorMm: null },
        oaVisualAssessment: { status: "features_present", descriptor: "Synthetic assignment." },
        implantPlanning: { status: "candidate_sizing_preview", candidateSizeBand: "small", rationale: "Synthetic only." },
        presentationTestOutput: { simulationStatus: "simulated_not_clinical", imageId: "TEST-001", syntheticClass: "Synthetic positive", syntheticOaStatus: "present", simulatedPlan: { procedure: "Synthetic procedure", systemId: "SIM-TEST", femoralComponent: "SIM-FEM", tibialTray: "SIM-TIB", polyethyleneInsertThicknessMm: 10, patellarDiameterMm: 32, patellarThicknessMm: 8, femoralResectionMm: 9, tibialResectionMm: 9, jointLineAdjustmentMm: 0, fixation: "synthetic" } },
        reviewNote: "Synthetic presentation-test output. It is not a medical diagnosis.",
      },
    });
    createKneeCase.mockResolvedValue(undefined);

    const caller = appRouter.createCaller({} as TrpcContext);
    await caller.cases.create({ patientId: "PT-PRESENTATION", patientName: "Presentation Test", age: 40, sex: "female", oaStatus: "unknown", kneeSide: "right", scan: { fileName: "presentation-input.png", contentType: "image/png", sizeBytes: 3, contentBase64: "YWJj" } });

    const persisted = createKneeCase.mock.calls[0][0];
    const mapped = persistedCaseToWorkspaceCase({ ...persisted, updatedAt: new Date() });
    expect(mapped.geminiVisualReview?.presentationTestOutput).toMatchObject({ simulationStatus: "simulated_not_clinical", imageId: "TEST-001", simulatedPlan: { systemId: "SIM-TEST" } });
    expect(mapped.geminiVisualReview?.reviewNote).toContain("not a medical diagnosis");
  });
});
