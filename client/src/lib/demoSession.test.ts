import { describe, expect, it } from "vitest";
import { defaultDemoClinician, endDemoSession, getDemoClinician, startDemoSession } from "./demoSession";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("KneeCo mock clinician session", () => {
  it("enters and exits the prototype using the prefilled clinician", () => {
    const storage = memoryStorage();
    startDemoSession(storage);

    expect(getDemoClinician(storage)).toEqual(defaultDemoClinician);

    endDemoSession(storage);
    expect(getDemoClinician(storage)).toBeNull();
  });
});
