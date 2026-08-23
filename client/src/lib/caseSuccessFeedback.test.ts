import { describe, expect, it } from "vitest";
import { getCaseCreationFeedback } from "./caseSuccessFeedback";

describe("getCaseCreationFeedback", () => {
  const base = { caseReference: "KC-001", safeMessage: "Safe message.", reportExtractionMessage: "Gemini message." };

  it("explains when an upload is not a readable report without presenting an error", () => {
    const result = getCaseCreationFeedback({ ...base, reportExtractionStatus: "not_a_report" });
    expect(result).toMatchObject({ tone: "info" });
    expect(result.detail).toContain("No readable radiology report");
  });

  it("explains extraction failure without claiming report findings", () => {
    const result = getCaseCreationFeedback({ ...base, reportExtractionStatus: "failed" });
    expect(result.detail).toContain("No report findings were saved");
  });
});
