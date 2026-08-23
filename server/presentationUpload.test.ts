import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createKneeCase,
  getPresentationTestCaseByFileName,
  requestOaClassification,
  requestStudyPreflight,
  extractGeminiMriReport,
  storagePut,
} = vi.hoisted(() => ({
  createKneeCase: vi.fn(),
  getPresentationTestCaseByFileName: vi.fn(),
  requestOaClassification: vi.fn(),
  requestStudyPreflight: vi.fn(),
  extractGeminiMriReport: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({ createKneeCase, getPresentationTestCaseByFileName }));
vi.mock("./analysisService", () => ({ requestOaClassification, requestStudyPreflight }));
vi.mock("./geminiReport", () => ({ extractGeminiMriReport }));
vi.mock("./storage", () => ({ storagePut }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { persistedCaseToWorkspaceCase } from "../client/src/lib/persistedCase";

describe("seeded presentation filename upload", () => {
  beforeEach(() => {
    createKneeCase.mockReset();
    getPresentationTestCaseByFileName.mockReset();
    requestOaClassification.mockReset();
    requestStudyPreflight.mockReset();
    extractGeminiMriReport.mockReset();
    storagePut.mockReset();
  });

  it("uses the filename-keyed test record for F001_Female.png and persists a non-clinical structured output", async () => {
    getPresentationTestCaseByFileName.mockResolvedValue({
      imageId: "F001", syntheticOaStatus: "present", syntheticClass: "Synthetic positive",
      simulatedPlanJson: JSON.stringify({ procedure: "Synthetic procedure", system_id: "SIM-TEST", femoral_component: "SIM-FEM", tibial_tray: "SIM-TIB", polyethylene_insert_thickness_mm: 10, patellar_diameter_mm: 32, patellar_thickness_mm: 8, femoral_resection_mm: 9, tibial_resection_mm: 9, joint_line_adjustment_mm: 0, fixation: "synthetic" }),
    });
    storagePut.mockResolvedValue({ key: "cases/KC-PRESENTATION/study.png", url: "/manus-storage/cases/KC-PRESENTATION/study.png" });
    requestStudyPreflight.mockResolvedValue({ configured: false, completed: false, analysisStatus: "pending_validation", safeMessage: "Preflight pending." });
    requestOaClassification.mockResolvedValue({ completed: false, analysisStatus: "pending_validation", modelName: null, modelVersion: null, classification: null, safeMessage: "Classifier pending." });
    extractGeminiMriReport.mockResolvedValue({ completed: false, status: "not_a_report", model: null, extraction: null, safeMessage: "No report." });
    createKneeCase.mockResolvedValue(undefined);

    const caller = appRouter.createCaller({} as TrpcContext);
    await caller.cases.create({ patientId: "F001", patientName: "Synthetic Presentation", age: 40, sex: "female", oaStatus: "unknown", kneeSide: "right", scan: { fileName: "F001_Female.png", contentType: "image/png", sizeBytes: 3, contentBase64: "YWJj" } });

    expect(getPresentationTestCaseByFileName).toHaveBeenCalledWith("F001_Female.png");
    const persisted = createKneeCase.mock.calls[0][0];
    const mapped = persistedCaseToWorkspaceCase({ ...persisted, updatedAt: new Date() });
    expect(mapped.geminiVisualReview?.presentationTestOutput).toMatchObject({ simulationStatus: "simulated_not_clinical", imageId: "F001", simulatedPlan: { systemId: "KneeCo TKA planning reference" } });
    expect(mapped.geminiVisualReview?.reviewNote).toContain("clinician confirmation");
  });
});
