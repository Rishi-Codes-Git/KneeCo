import { describe, expect, it } from "vitest";
import { defaultClinicianSession, endClinicianSession, getClinicianSession, startClinicianSession } from "./clinicianSession";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("KneeCo clinician session", () => {
  it("starts and ends a prefilled clinician workspace session", () => {
    const storage = memoryStorage();
    startClinicianSession(storage);

    expect(getClinicianSession(storage)).toEqual(defaultClinicianSession);

    endClinicianSession(storage);
    expect(getClinicianSession(storage)).toBeNull();
  });
});
