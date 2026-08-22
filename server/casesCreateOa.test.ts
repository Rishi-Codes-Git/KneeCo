import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createKneeCase,
  getKneeCaseByReference,
  listKneeCases,
  upsertClinicianProfile,
  getAnalysisServiceStatus,
  requestOaClassification,
  requestStudyPreflight,
  storagePut,
} = vi.hoisted(() => ({
  createKneeCase: vi.fn(),
  getKneeCaseByReference: vi.fn(),
  listKneeCases: vi.fn(),
  upsertClinicianProfile: vi.fn(),
  getAnalysisServiceStatus: vi.fn(),
  requestOaClassification: vi.fn(),
  requestStudyPreflight: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({ createKneeCase, getKneeCaseByReference, listKneeCases, upsertClinicianProfile }));
vi.mock("./analysisService", () => ({ getAnalysisServiceStatus, requestOaClassification, requestStudyPreflight }));
vi.mock("./storage", () => ({ storagePut }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("cases.create with OA classifier output", () => {
  beforeEach(() => {
    createKneeCase.mockReset();
    getKneeCaseByReference.mockReset();
    listKneeCases.mockReset();
    getAnalysisServiceStatus.mockReset();
    requestOaClassification.mockReset();
    requestStudyPreflight.mockReset();
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

    expect(result).toMatchObject({ analysisStatus: "ready_for_review", oaClassificationCompleted: true, safeMessage: "Review only." });
    expect(createKneeCase).toHaveBeenCalledWith(expect.objectContaining({
      analysisStatus: "ready_for_review",
      oaModelName: "KneeCo OA MRI Classifier",
      oaModelVersion: "oa_mri_project_2026-08-22",
    }));
    const persisted = createKneeCase.mock.calls[0][0];
    expect(JSON.parse(persisted.oaClassificationJson)).toMatchObject({ stageLabel: "ModerateOA", topClassProbability: 0.6 });
    expect(persisted.oaClassifiedAt).toBeInstanceOf(Date);
  });
});
