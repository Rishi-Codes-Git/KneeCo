export type ClinicianSession = {
  name: string;
  clinicName: string;
  email: string;
};

const CLINICIAN_SESSION_KEY = "kneeco-clinician-session";

export const defaultClinicianSession: ClinicianSession = {
  name: "Dr. Asha Raman",
  clinicName: "Raman Orthopaedics",
  email: "dr.asha.raman@ramanortho.in",
};

export function getClinicianSession(storage: Pick<Storage, "getItem">): ClinicianSession | null {
  const value = storage.getItem(CLINICIAN_SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as ClinicianSession;
  } catch {
    return null;
  }
}

export function startClinicianSession(storage: Pick<Storage, "setItem">, clinician: ClinicianSession = defaultClinicianSession) {
  storage.setItem(CLINICIAN_SESSION_KEY, JSON.stringify(clinician));
}

export function updateClinicianSession(storage: Pick<Storage, "setItem">, clinician: ClinicianSession) {
  storage.setItem(CLINICIAN_SESSION_KEY, JSON.stringify(clinician));
}

export function endClinicianSession(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(CLINICIAN_SESSION_KEY);
}
