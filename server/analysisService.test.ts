import { describe, expect, it, vi } from "vitest";
import { getAnalysisServiceStatus, requestOaClassification, requestStudyPreflight } from "./analysisService";

describe("getAnalysisServiceStatus", () => {
  it("reports a safe unconfigured state when no service URL is provided", async () => {
    const previousUrl = process.env.AI_SERVICE_URL;
    delete process.env.AI_SERVICE_URL;

    const result = await getAnalysisServiceStatus();

    expect(result).toMatchObject({ configured: false, state: "not_configured" });
    process.env.AI_SERVICE_URL = previousUrl;
  });

  it("passes through a model-ready service status without treating it as validated", async () => {
    const previousUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = "http://analysis.local";
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: "awaiting_validation_scan",
        safe_message: "Automatic inference is disabled pending validation.",
      }),
    });

    const result = await getAnalysisServiceStatus(fetchStub as unknown as typeof fetch);

    expect(result).toEqual({
      configured: true,
      state: "awaiting_validation_scan",
      safeMessage: "Automatic inference is disabled pending validation.",
    });
    process.env.AI_SERVICE_URL = previousUrl;
  });
});

describe("requestStudyPreflight", () => {
  const study = {
    caseId: "KC-PREFLIGHT-001",
    fileName: "knee-study.png",
    contentType: "image/png",
    contentBase64: "aGVsbG8=",
  };

  it("stores a safe pending state when the FastAPI URL is not configured", async () => {
    const previousUrl = process.env.AI_SERVICE_URL;
    delete process.env.AI_SERVICE_URL;

    const result = await requestStudyPreflight(study);

    expect(result).toMatchObject({ configured: false, completed: false, analysisStatus: "pending_validation" });
    process.env.AI_SERVICE_URL = previousUrl;
  });

  it("maps a successful FastAPI preflight to clinician review rather than an inference result", async () => {
    const previousUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = "http://analysis.local";
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ safe_message: "Technical preflight completed." }),
    });

    const result = await requestStudyPreflight(study, fetchStub as unknown as typeof fetch);

    expect(result).toEqual({
      configured: true,
      completed: true,
      analysisStatus: "review_required",
      safeMessage: "Technical preflight completed.",
    });
    process.env.AI_SERVICE_URL = previousUrl;
  });
});

describe("requestOaClassification", () => {
  const study = {
    caseId: "KC-OA-001",
    fileName: "knee-study.png",
    contentType: "image/png",
    contentBase64: "aGVsbG8=",
  };

  it("keeps the case pending when FastAPI is not configured", async () => {
    const previousUrl = process.env.AI_SERVICE_URL;
    delete process.env.AI_SERVICE_URL;

    const result = await requestOaClassification(study);

    expect(result).toMatchObject({ completed: false, analysisStatus: "pending_validation", classification: null });
    process.env.AI_SERVICE_URL = previousUrl;
  });

  it("stores only a review-only classifier result from FastAPI", async () => {
    const previousUrl = process.env.AI_SERVICE_URL;
    process.env.AI_SERVICE_URL = "http://analysis.local";
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "model_result_for_review",
        model_id: "KneeCo OA MRI Classifier",
        model_version: "oa_mri_project_2026-08-22",
        stage_label: "ModerateOA",
        stage_probabilities: { Normal: 0.1, MildOA: 0.2, ModerateOA: 0.6, SevereOA: 0.1 },
        top_class_probability: 0.6,
        safe_message: "Review only.",
      }),
    });

    const result = await requestOaClassification(study, fetchStub as unknown as typeof fetch);

    expect(result).toMatchObject({
      completed: true,
      analysisStatus: "ready_for_review",
      classification: { stageLabel: "ModerateOA", topClassProbability: 0.6 },
    });
    process.env.AI_SERVICE_URL = previousUrl;
  });
});
