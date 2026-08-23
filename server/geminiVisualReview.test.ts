import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewGeminiMriImage } from "./geminiVisualReview";

const input = { caseId: "KC-001", fileName: "study.png", contentType: "image/png", contentBase64: "YWJj" };
const review = {
  studyType: "knee_mri_image", imageQuality: "limited",
  femur: { visibility: "visible", visualDescriptor: "Distal femoral contour is visible." },
  tibia: { visibility: "partly_visible", visualDescriptor: "Proximal tibial contour is partly visible." },
  medialMeniscus: { visibility: "not_assessable", visualDescriptor: null },
  roughEstimates: { scaleDetected: true, femoralWidthMm: 72, femoralApMm: 61, tibialWidthMm: 70, tibialApMm: 48, medialMeniscusAnteriorMm: null, medialMeniscusBodyMm: null, medialMeniscusPosteriorMm: null },
  oaVisualAssessment: { status: "features_possible", descriptor: "Visual features require confirmation." },
  implantPlanning: { status: "not_triggered", candidateSizeBand: "not_available", rationale: "No planning preview triggered." },
  reviewNote: "These are rough image estimates requiring clinician confirmation.",
};

afterEach(() => vi.unstubAllEnvs());

describe("reviewGeminiMriImage", () => {
  it("does not send PDFs to the visual image reviewer", async () => {
    const result = await reviewGeminiMriImage({ ...input, contentType: "application/pdf" });
    expect(result).toMatchObject({ completed: false, status: "not_an_image" });
  });

  it("returns rough estimates only with an explicit detected scale and non-definitive planning support", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const result = await reviewGeminiMriImage(input, (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(review) }] } }] }), { status: 200 })) as typeof fetch);
    expect(result).toMatchObject({ completed: true, status: "visible_for_review" });
    expect(result.review?.roughEstimates.scaleDetected).toBe(true);
    expect(result.review?.roughEstimates.femoralWidthMm).toBe(72);
    expect(result.review?.implantPlanning.status).toBe("not_triggered");
    expect(result.review?.medialMeniscus.visibility).toBe("not_assessable");
  });

  it.runIf(process.env.RUN_GEMINI_LIVE_TEST === "true")("handles a non-clinical blank image without fabricating knee anatomy", async () => {
    const blankPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLnjwAAAABJRU5ErkJggg==";
    const result = await reviewGeminiMriImage({ ...input, fileName: "blank.png", contentBase64: blankPng });
    expect(result.status).toBe("not_knee_mri_or_unreadable");
    expect(result.review?.studyType).toBe("not_knee_mri_or_unreadable");
  }, 90_000);
});
