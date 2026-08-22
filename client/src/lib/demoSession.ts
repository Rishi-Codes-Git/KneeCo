export type DemoClinician = {
  name: string;
  clinicName: string;
};

const DEMO_SESSION_KEY = "kneeco-demo-clinician";

export const defaultDemoClinician: DemoClinician = {
  name: "Dr. Asha Raman",
  clinicName: "Raman Orthopaedics",
};

export function getDemoClinician(storage: Pick<Storage, "getItem">): DemoClinician | null {
  const value = storage.getItem(DEMO_SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as DemoClinician;
  } catch {
    return null;
  }
}

export function startDemoSession(storage: Pick<Storage, "setItem">, clinician: DemoClinician = defaultDemoClinician) {
  storage.setItem(DEMO_SESSION_KEY, JSON.stringify(clinician));
}

export function endDemoSession(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(DEMO_SESSION_KEY);
}
