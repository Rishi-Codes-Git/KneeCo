export type NewCaseFormValues = {
  patientId: string;
  patientName: string;
  age: string;
};

export type NewCaseFieldErrors = Partial<Record<keyof NewCaseFormValues, string>>;

export function validateNewCaseForm(values: NewCaseFormValues): NewCaseFieldErrors {
  const errors: NewCaseFieldErrors = {};
  if (values.patientId.trim().length < 2) errors.patientId = "Enter a patient ID with at least 2 characters.";
  if (values.patientName.trim().length < 2) errors.patientName = "Enter the patient’s full name.";
  const age = Number(values.age);
  if (!Number.isInteger(age) || age < 1 || age > 120) errors.age = "Enter an age between 1 and 120 years.";
  return errors;
}
