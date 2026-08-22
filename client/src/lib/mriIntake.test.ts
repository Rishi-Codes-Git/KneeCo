import { describe, expect, it } from "vitest";
import { getMriIntakeError, maxMriIntakeBytes } from "./mriIntake";

describe("MRI intake validation", () => {
  it("accepts supported DICOM and NIfTI names within the intake limit", () => {
    expect(getMriIntakeError("knee-study.dcm", 1024)).toBeNull();
    expect(getMriIntakeError("knee-volume.nii.gz", maxMriIntakeBytes)).toBeNull();
  });

  it("rejects unsupported image formats and oversize files", () => {
    expect(getMriIntakeError("knee-screenshot.png", 1024)).toContain("DICOM");
    expect(getMriIntakeError("knee-study.dcm", maxMriIntakeBytes + 1)).toContain("20 MB");
  });
});
