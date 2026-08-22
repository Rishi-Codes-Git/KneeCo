import { describe, expect, it } from "vitest";
import { normaliseRegistrationDraft } from "./authDraft";

describe("normaliseRegistrationDraft", () => {
  it("trims profile data and normalises the email address", () => {
    expect(
      normaliseRegistrationDraft({
        fullName: "  Dr. Anika Rao ",
        clinicName: "  Coimbatore Ortho Clinic ",
        email: " ANIKA@EXAMPLE.COM ",
        licenceFileName: "  licence.pdf ",
      }),
    ).toEqual({
      fullName: "Dr. Anika Rao",
      clinicName: "Coimbatore Ortho Clinic",
      email: "anika@example.com",
      licenceFileName: "licence.pdf",
    });
  });

  it("stores a missing optional licence as null", () => {
    expect(
      normaliseRegistrationDraft({ fullName: "Mira", clinicName: "Knee Clinic", email: "mira@example.com", licenceFileName: "" }),
    ).toMatchObject({ licenceFileName: null });
  });
});
