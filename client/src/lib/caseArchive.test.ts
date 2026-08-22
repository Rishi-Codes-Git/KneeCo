import { describe, expect, it } from "vitest";
import { caseDetailPath, filterIllustrativeCases, getIllustrativeCase, illustrativeCases } from "./caseArchive";

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
    expect(getIllustrativeCase(selectedId).patientLabel).toBe("Patient DM-018");
  });

  it("defaults safely to the first case when an overview case ID is unavailable", () => {
    expect(getIllustrativeCase("unknown-case").id).toBe("KC-2026-021");
  });
});
