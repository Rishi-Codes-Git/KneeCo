import { describe, expect, it } from "vitest";

const acceptedMriFile = /\.(jpg|jpeg|png|pdf)$/i;

describe("KneeCo MRI intake contract", () => {
  it("accepts the image and PDF file extensions supported by case intake", () => {
    expect(acceptedMriFile.test("knee-screenshot.png")).toBe(true);
    expect(acceptedMriFile.test("knee-scan.jpg")).toBe(true);
    expect(acceptedMriFile.test("knee-report.pdf")).toBe(true);
  });

  it("rejects unsupported volume formats", () => {
    expect(acceptedMriFile.test("knee-series.dcm")).toBe(false);
    expect(acceptedMriFile.test("knee-volume.nii.gz")).toBe(false);
  });
});
