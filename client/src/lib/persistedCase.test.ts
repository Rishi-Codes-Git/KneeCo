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
});
