import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertClinicianProfile } = vi.hoisted(() => ({ upsertClinicianProfile: vi.fn() }));

vi.mock("./db", () => ({ upsertClinicianProfile }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "clinician-test",
      name: "Dr. Mira Shah",
      email: "mira@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("profile.completeSignup", () => {
  beforeEach(() => upsertClinicianProfile.mockReset());

  it("persists normalised clinician data only after authenticated access", async () => {
    upsertClinicianProfile.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(
      caller.profile.completeSignup({
        fullName: "Dr. Mira Shah",
        clinicName: "Shah Knee Clinic",
        professionalEmail: "MIRA@EXAMPLE.COM",
      }),
    ).resolves.toEqual({ success: true });

    expect(upsertClinicianProfile).toHaveBeenCalledWith({
      userId: 42,
      fullName: "Dr. Mira Shah",
      clinicName: "Shah Knee Clinic",
      professionalEmail: "mira@example.com",
    });
  });
});
