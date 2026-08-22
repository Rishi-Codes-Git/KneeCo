import { describe, expect, it } from "vitest";

const acceptedMriFile = /\.(dcm|nii|nii\.gz)$/i;

describe("KneeCo MRI intake contract", () => {
  it("accepts the DICOM and NIfTI file extensions supported by case intake", () => {
    expect(acceptedMriFile.test("knee-series.dcm")).toBe(true);
    expect(acceptedMriFile.test("knee-volume.nii")).toBe(true);
    expect(acceptedMriFile.test("knee-volume.nii.gz")).toBe(true);
  });

  it("rejects presentation-image formats that cannot support the MRI measurement pipeline", () => {
    expect(acceptedMriFile.test("knee-screenshot.png")).toBe(false);
    expect(acceptedMriFile.test("knee-photo.jpg")).toBe(false);
  });
});

