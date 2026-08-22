import { describe, expect, it } from "vitest";
import { normaliseRegistrationDraft } from "../client/src/lib/authDraft";

describe("clinician signup payload", () => {
  it("provides only normalised non-sensitive profile fields to the onboarding procedure", () => {
    const draft = normaliseRegistrationDraft({
      fullName: "  Dr. Mira Shah ",
      clinicName: "  Shah Knee Clinic ",
      email: " MIRA@EXAMPLE.COM ",
      licenceFileName: null,
    });

    expect({
      fullName: draft.fullName,
      clinicName: draft.clinicName,
      professionalEmail: draft.email,
    }).toEqual({
      fullName: "Dr. Mira Shah",
      clinicName: "Shah Knee Clinic",
      professionalEmail: "mira@example.com",
    });
  });
});
