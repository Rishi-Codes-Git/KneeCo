import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { clinicianProfiles, implantCatalogue, implantPlans, InsertClinicianProfile, InsertImplantPlan, InsertKneeCase, InsertUser, kneeCases, presentationTestCases, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertClinicianProfile(profile: InsertClinicianProfile) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert clinician profile: database not available");
    return;
  }

  await db.insert(clinicianProfiles).values(profile).onDuplicateKeyUpdate({
    set: {
      fullName: profile.fullName,
      clinicName: profile.clinicName,
      professionalEmail: profile.professionalEmail,
      updatedAt: new Date(),
    },
  });
}

export async function createKneeCase(kneeCase: InsertKneeCase) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for case creation");
  await db.insert(kneeCases).values(kneeCase);
  return kneeCase;
}

export async function listKneeCases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kneeCases).orderBy(desc(kneeCases.createdAt));
}

export async function getKneeCaseByReference(caseReference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [kneeCase] = await db.select().from(kneeCases).where(eq(kneeCases.caseReference, caseReference)).limit(1);
  return kneeCase;
}

export async function deleteKneeCaseByReference(caseReference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for case deletion");
  const result = await db.delete(kneeCases).where(eq(kneeCases.caseReference, caseReference));
  return result[0].affectedRows > 0;
}

export async function updateKneeCaseReportStatus(caseReference: string, analysisStatus: "pending_validation" | "queued" | "processing" | "ready_for_review" | "review_required" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for report-status updates");
  const result = await db.update(kneeCases).set({ analysisStatus, updatedAt: new Date() }).where(eq(kneeCases.caseReference, caseReference));
  return result[0].affectedRows > 0;
}

export async function getPresentationTestCaseByFileName(fileName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [presentationTestCase] = await db.select().from(presentationTestCases).where(eq(presentationTestCases.fileName, fileName)).limit(1);
  return presentationTestCase;
}

export async function listImplantCatalogue() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(implantCatalogue);
}

export async function getImplantPlanByCaseReference(caseReference: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [plan] = await db.select().from(implantPlans).where(eq(implantPlans.caseReference, caseReference)).limit(1);
  return plan;
}

export async function upsertImplantPlan(plan: InsertImplantPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for implant planning");
  await db.insert(implantPlans).values(plan).onDuplicateKeyUpdate({
    set: {
      dimensionJson: plan.dimensionJson,
      rankingJson: plan.rankingJson,
      anonymousSummary: plan.anonymousSummary,
      planningStatus: plan.planningStatus,
      confirmedAt: plan.confirmedAt,
      closedAt: plan.closedAt,
      updatedAt: new Date(),
    },
  });
}

export async function updateCaseLifecycle(caseReference: string, lifecycle: "confirmed" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for case lifecycle updates");
  const now = new Date();
  const update = lifecycle === "confirmed"
    ? { caseLifecycle: lifecycle, caseConfirmedAt: now, caseClosedAt: null, updatedAt: now }
    : { caseLifecycle: lifecycle, caseClosedAt: now, updatedAt: now };
  const result = await db.update(kneeCases).set(update).where(eq(kneeCases.caseReference, caseReference));
  return result[0].affectedRows > 0;
}

export async function updateImplantPlanStatus(caseReference: string, status: "confirmed" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for implant plan lifecycle updates");
  const now = new Date();
  const update = status === "confirmed"
    ? { planningStatus: status, confirmedAt: now, closedAt: null, updatedAt: now }
    : { planningStatus: status, closedAt: now, updatedAt: now };
  const result = await db.update(implantPlans).set(update).where(eq(implantPlans.caseReference, caseReference));
  return result[0].affectedRows > 0;
}

// TODO: add feature queries here as your schema grows.
