import { describe, expect, it } from "vitest";
import { validateNewCaseForm } from "./caseFormValidation";

describe("validateNewCaseForm", () => {
  it("explains a short patient ID without exposing a schema error", () => {
    expect(validateNewCaseForm({ patientId: "K", patientName: "Asha Raman", age: "49" })).toEqual({
      patientId: "Enter a patient ID with at least 2 characters.",
    });
  });

  it("returns no errors for complete valid intake details", () => {
    expect(validateNewCaseForm({ patientId: "KC-PT-0001", patientName: "Asha Raman", age: "49" })).toEqual({});
  });
});
