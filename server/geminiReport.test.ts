import { afterEach, describe, expect, it, vi } from "vitest";
import { extractGeminiMriReport } from "./geminiReport";

const reportResult = {
  documentType: "radiology_report",
  summary: "Report-supported medial compartment changes.",
  oaMention: "reported",
  oaSeverity: "mild",
  femurFinding: "No focal femoral lesion reported.",
  tibiaFinding: null,
  medialMeniscusFinding: "Medial meniscus extrusion reported.",
  femoralWidthMm: null,
  femoralApMm: null,
  tibialWidthMm: null,
  tibialApMm: null,
  medialMeniscusAnteriorMm: null,
  medialMeniscusBodyMm: null,
  medialMeniscusPosteriorMm: null,
  citedReportPhrases: ["Mild osteoarthritic change", "Medial meniscus extrusion"],
  reviewNote: "Clinician verification required.",
};

afterEach(() => { vi.unstubAllEnvs(); });

describe("extractGeminiMriReport", () => {
  const input = { caseId: "KC-001", fileName: "report.pdf", contentType: "application/pdf", contentBase64: "YWJj" };

  it("returns a friendly unconfigured state without calling Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const result = await extractGeminiMriReport(input);
    expect(result).toMatchObject({ completed: false, status: "not_configured", extraction: null });
  });

  it("returns only structured report-supported fields from Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const result = await extractGeminiMriReport(input, (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reportResult) }] } }] }), { status: 200 })) as typeof fetch);
    expect(result).toMatchObject({ completed: true, status: "extracted_for_review", model: "gemini-3.6-flash" });
    expect(result.extraction).toMatchObject({ oaMention: "reported", medialMeniscusFinding: "Medial meniscus extrusion reported.", femoralWidthMm: null });
  });

  it("treats an image that is not a readable report as a non-error state", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const result = await extractGeminiMriReport(input, (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...reportResult, documentType: "not_a_radiology_report", summary: null, oaMention: "unclear", femurFinding: null, medialMeniscusFinding: null, citedReportPhrases: [] }) }] } }] }), { status: 200 })) as typeof fetch);
    expect(result).toMatchObject({ completed: false, status: "not_a_report" });
  });

  it.runIf(process.env.RUN_GEMINI_LIVE_TEST === "true")("uses the configured Gemini model for a non-clinical unreadable-image check", async () => {
    const blankPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLnjwAAAABJRU5ErkJggg==";
    const result = await extractGeminiMriReport({ caseId: "LIVE-CHECK", fileName: "blank.png", contentType: "image/png", contentBase64: blankPng });
    expect(result.status).toBe("not_a_report");
    expect(result.extraction?.documentType).toMatch(/not_a_radiology_report|unreadable/);
  }, 90_000);
});
