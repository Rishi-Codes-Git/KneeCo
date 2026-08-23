import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewGeminiMriImage } from "./geminiVisualReview";

const input = { caseId: "KC-001", fileName: "study.png", contentType: "image/png", contentBase64: "YWJj" };
const review = {
  studyType: "knee_mri_image", imageQuality: "limited",
  femur: { visibility: "visible", visualDescriptor: "Distal femoral contour is visible." },
  tibia: { visibility: "partly_visible", visualDescriptor: "Proximal tibial contour is partly visible." },
  medialMeniscus: { visibility: "not_assessable", visualDescriptor: null },
  reviewNote: "This is a non-calibrated visual estimate requiring clinician review.",
};

afterEach(() => vi.unstubAllEnvs());

describe("reviewGeminiMriImage", () => {
  it("does not send PDFs to the visual image reviewer", async () => {
    const result = await reviewGeminiMriImage({ ...input, contentType: "application/pdf" });
    expect(result).toMatchObject({ completed: false, status: "not_an_image" });
  });

  it("returns relative descriptors without mm measurements", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const result = await reviewGeminiMriImage(input, (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(review) }] } }] }), { status: 200 })) as typeof fetch);
    expect(result).toMatchObject({ completed: true, status: "visible_for_review" });
    expect(JSON.stringify(result.review)).not.toMatch(/mm|millimet/iu);
    expect(result.review?.medialMeniscus.visibility).toBe("not_assessable");
  });

  it.runIf(process.env.RUN_GEMINI_LIVE_TEST === "true")("handles a non-clinical blank image without fabricating knee anatomy", async () => {
    const blankPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLnjwAAAABJRU5ErkJggg==";
    const result = await reviewGeminiMriImage({ ...input, fileName: "blank.png", contentBase64: blankPng });
    expect(result.status).toBe("not_knee_mri_or_unreadable");
    expect(result.review?.studyType).toBe("not_knee_mri_or_unreadable");
  }, 90_000);
});
