import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("branding.publicConfig", () => {
  it("returns the configured KneeCo title and deployment-safe logo path", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const branding = await caller.branding.publicConfig();

    expect(branding.title).toBe("KneeCo");
    expect(branding.logo).toBe("/manus-storage/kneeco-logo_809cc35c.png");
    expect(branding.tagline).toBe("Doctor's Knee Companion");
    expect(branding.accentColor).toBe("#C97C8D");
    expect(branding.poweredBy).toBe("Elro Tech");
  });
});
