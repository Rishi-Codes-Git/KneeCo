import { describe, expect, it } from "vitest";
import { caseDetailPath, closedIllustrativeCases, filterIllustrativeCases, getIllustrativeCase, illustrativeCases, kneeAnalysisPath } from "./caseArchive";

describe("All Cases archive filtering", () => {
  it("filters illustrative cases by patient/case search", () => {
    expect(filterIllustrativeCases(illustrativeCases, "dm-018", "all").map((record) => record.id)).toEqual(["KC-2026-018"]);
  });

  it("filters illustrative cases by case status", () => {
    expect(filterIllustrativeCases(illustrativeCases, "", "clinician_review").map((record) => record.id)).toEqual(["KC-2026-018"]);
  });

  it("builds an addressable detail route and resolves its matching case", () => {
    const selectedId = "KC-2026-018";
    expect(caseDetailPath(selectedId)).toBe("/cases/KC-2026-018");
    expect(kneeAnalysisPath(selectedId)).toBe("/cases/KC-2026-018/analysis");
    expect(getIllustrativeCase(selectedId).patientLabel).toBe("Patient DM-018");
  });

  it("defaults safely to the first case when an overview case ID is unavailable", () => {
    expect(getIllustrativeCase("unknown-case").id).toBe("KC-2026-021");
  });

  it("keeps closed cases available to the shared case-detail resolver", () => {
    expect(filterIllustrativeCases(closedIllustrativeCases, "", "report_signed")).toHaveLength(4);
    expect(getIllustrativeCase("KC-2026-004").patientLabel).toBe("Patient RJ-004");
  });
});
