export type RegistrationDraft = {
  fullName: string;
  clinicName: string;
  email: string;
  licenceFileName: string | null;
};

export function normaliseRegistrationDraft(input: RegistrationDraft): RegistrationDraft {
  return {
    fullName: input.fullName.trim(),
    clinicName: input.clinicName.trim(),
    email: input.email.trim().toLowerCase(),
    licenceFileName: input.licenceFileName?.trim() || null,
  };
}
