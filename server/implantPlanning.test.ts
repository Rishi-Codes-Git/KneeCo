import { afterEach, describe, expect, it, vi } from "vitest";

const { getImplantPlanByCaseReference, getKneeCaseByReference, getPresentationTestCaseByFileName, listImplantCatalogue, upsertImplantPlan } = vi.hoisted(() => ({
  getImplantPlanByCaseReference: vi.fn(),
  getKneeCaseByReference: vi.fn(),
  getPresentationTestCaseByFileName: vi.fn(),
  listImplantCatalogue: vi.fn(),
  upsertImplantPlan: vi.fn(),
}));

vi.mock("./db", () => ({ getImplantPlanByCaseReference, getKneeCaseByReference, getPresentationTestCaseByFileName, listImplantCatalogue, upsertImplantPlan }));

import { createImplantRanking, getImplantPlanningResult } from "./implantPlanning";

const dimensions = { femoralApMm: 60, femoralWidthMm: 70, tibialApMm: 47, tibialWidthMm: 71 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("implant planning", () => {
  it("allows ranking only when an OA-present case has all four background planning dimensions", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    getKneeCaseByReference.mockResolvedValue({ scanFileName: "eligible.png" });
    getPresentationTestCaseByFileName.mockResolvedValue({ syntheticOaStatus: "present", syntheticDimensionsJson: JSON.stringify(dimensions) });
    getImplantPlanByCaseReference.mockResolvedValue(undefined);
    listImplantCatalogue.mockResolvedValue([
      { femoralApMm: 60, femoralWidthMm: 70, tibialApMm: 47, tibialWidthMm: 71, suggestedFemoralSize: "M", suggestedTibialSize: "S" },
      { femoralApMm: 50, femoralWidthMm: 56, tibialApMm: 42, tibialWidthMm: 62, suggestedFemoralSize: "XS", suggestedTibialSize: "XS" },
    ]);

    const result = await createImplantRanking("KC-ELIGIBLE");

    expect(result).toMatchObject({ eligible: true, dimensions, planningStatus: "ready_for_review" });
    expect(result.rankings[0]).toMatchObject({ rank: 1, femoralSize: "M", tibialSize: "S" });
    expect(result.rankings[0].referenceDimensions).toEqual(dimensions);
    expect(result.rankings[0].dimensionDeltasMm).toEqual({ femoralApMm: 0, femoralWidthMm: 0, tibialApMm: 0, tibialWidthMm: 0 });
    expect(upsertImplantPlan).toHaveBeenCalledWith(expect.objectContaining({ caseReference: "KC-ELIGIBLE", planningStatus: "ready_for_review" }));
  });

  it("keeps implant analysis unavailable when OA-present eligibility is absent", async () => {
    getKneeCaseByReference.mockResolvedValue({ scanFileName: "not-eligible.png" });
    getPresentationTestCaseByFileName.mockResolvedValue({ syntheticOaStatus: "absent", syntheticDimensionsJson: JSON.stringify(dimensions) });

    const result = await getImplantPlanningResult("KC-NOT-ELIGIBLE");

    expect(result).toMatchObject({ eligible: false, dimensions: null, rankings: [] });
    expect(listImplantCatalogue).not.toHaveBeenCalled();
  });
});
