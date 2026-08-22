import { describe, expect, it } from "vitest";
import { filterIllustrativeCases, illustrativeCases } from "./caseArchive";

describe("All Cases archive filtering", () => {
  it("filters illustrative cases by patient/case search", () => {
    expect(filterIllustrativeCases(illustrativeCases, "dm-018", "all").map((record) => record.id)).toEqual(["KC-2026-018"]);
  });

  it("filters illustrative cases by case status", () => {
    expect(filterIllustrativeCases(illustrativeCases, "", "clinician_review").map((record) => record.id)).toEqual(["KC-2026-018"]);
  });
});
