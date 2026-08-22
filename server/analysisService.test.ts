import { describe, expect, it, vi } from "vitest";
import { getAnalysisServiceStatus, requestStudyPreflight } from "./analysisService";

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
