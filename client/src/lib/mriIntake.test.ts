import { describe, expect, it } from "vitest";
import { getMriIntakeError, maxMriIntakeBytes } from "./mriIntake";

describe("MRI intake validation", () => {
  it("accepts supported image and PDF names within the intake limit", () => {
    expect(getMriIntakeError("knee-study.png", 1024)).toBeNull();
    expect(getMriIntakeError("knee-report.pdf", maxMriIntakeBytes)).toBeNull();
  });

  it("rejects unsupported formats and oversize files", () => {
    expect(getMriIntakeError("knee-volume.nii.gz", 1024)).toContain("JPG");
    expect(getMriIntakeError("knee-study.png", maxMriIntakeBytes + 1)).toContain("20 MB");
  });
});
