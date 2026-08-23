import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the existing Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Clinician-entered profile data collected only after authenticated sign-up. */
export const clinicianProfiles = mysqlTable("clinicianProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  clinicName: varchar("clinicName", { length: 200 }).notNull(),
  professionalEmail: varchar("professionalEmail", { length: 320 }).notNull(),
  licenceFileKey: varchar("licenceFileKey", { length: 1024 }),
  licenceVerificationStatus: mysqlEnum("licenceVerificationStatus", ["not_submitted", "pending", "verified"]).default("not_submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Clinical case metadata; scan bytes remain in protected object storage. */
export const kneeCases = mysqlTable("kneeCases", {
  id: int("id").autoincrement().primaryKey(),
  caseReference: varchar("caseReference", { length: 40 }).notNull().unique(),
  patientId: varchar("patientId", { length: 80 }).notNull(),
  patientName: varchar("patientName", { length: 160 }).notNull(),
  age: int("age").notNull(),
  sex: mysqlEnum("sex", ["female", "male", "intersex", "not_recorded"]).notNull(),
  oaStatus: mysqlEnum("oaStatus", ["yes", "no", "unknown"]).notNull(),
  lifestyleContext: varchar("lifestyleContext", { length: 500 }),
  kneeSide: mysqlEnum("kneeSide", ["left", "right", "bilateral", "unknown"]).notNull(),
  scanFileKey: varchar("scanFileKey", { length: 1024 }).notNull(),
  scanFileName: varchar("scanFileName", { length: 255 }).notNull(),
  scanMimeType: varchar("scanMimeType", { length: 120 }).notNull(),
  scanSizeBytes: int("scanSizeBytes").notNull(),
  analysisStatus: mysqlEnum("analysisStatus", ["pending_validation", "queued", "processing", "ready_for_review", "review_required", "failed"]).default("pending_validation").notNull(),
  oaModelName: varchar("oaModelName", { length: 160 }),
  oaModelVersion: varchar("oaModelVersion", { length: 120 }),
  oaClassificationJson: text("oaClassificationJson"),
  oaClassifiedAt: timestamp("oaClassifiedAt"),
  geminiReportModel: varchar("geminiReportModel", { length: 120 }),
  geminiReportJson: text("geminiReportJson"),
  geminiReportExtractedAt: timestamp("geminiReportExtractedAt"),
  geminiReportStatus: varchar("geminiReportStatus", { length: 40 }),
  geminiReportMessage: varchar("geminiReportMessage", { length: 700 }),
  geminiVisualModel: varchar("geminiVisualModel", { length: 120 }),
  geminiVisualJson: text("geminiVisualJson"),
  geminiVisualStatus: varchar("geminiVisualStatus", { length: 40 }),
  geminiVisualMessage: varchar("geminiVisualMessage", { length: 700 }),
  caseLifecycle: mysqlEnum("caseLifecycle", ["active", "confirmed", "closed"]).default("active").notNull(),
  caseConfirmedAt: timestamp("caseConfirmedAt"),
  caseClosedAt: timestamp("caseClosedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Private filename-keyed synthetic records for presentation testing; never clinical patient data. */
export const presentationTestCases = mysqlTable("presentationTestCases", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull().unique(),
  imageId: varchar("imageId", { length: 80 }).notNull().unique(),
  age: int("age").notNull(),
  sex: mysqlEnum("sex", ["female", "male"]).notNull(),
  weightKg: int("weightKg").notNull(),
  syntheticOaStatus: mysqlEnum("syntheticOaStatus", ["present", "absent"]).notNull(),
  syntheticClass: varchar("syntheticClass", { length: 80 }).notNull(),
  syntheticDimensionsJson: text("syntheticDimensionsJson"),
  simulatedPlanJson: text("simulatedPlanJson").notNull(),
  simulationStatus: mysqlEnum("simulationStatus", ["simulated_not_clinical"]).default("simulated_not_clinical").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Anonymous reference rows imported from the user-provided implant sizing dataset. */
export const implantCatalogue = mysqlTable("implantCatalogue", {
  id: int("id").autoincrement().primaryKey(),
  datasetKey: varchar("datasetKey", { length: 80 }).notNull().unique(),
  age: int("age").notNull(),
  sex: mysqlEnum("sex", ["female", "male"]).notNull(),
  femoralApMm: double("femoralApMm").notNull(),
  femoralWidthMm: double("femoralWidthMm").notNull(),
  tibialApMm: double("tibialApMm").notNull(),
  tibialWidthMm: double("tibialWidthMm").notNull(),
  suggestedFemoralSize: varchar("suggestedFemoralSize", { length: 30 }).notNull(),
  suggestedTibialSize: varchar("suggestedTibialSize", { length: 30 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Anonymous, clinician-controlled implant ranking state; not an operative plan. */
export const implantPlans = mysqlTable("implantPlans", {
  id: int("id").autoincrement().primaryKey(),
  caseReference: varchar("caseReference", { length: 40 }).notNull().unique(),
  dimensionJson: text("dimensionJson").notNull(),
  rankingJson: text("rankingJson").notNull(),
  anonymousSummary: text("anonymousSummary"),
  planningStatus: mysqlEnum("planningStatus", ["ready_for_review", "confirmed", "closed"]).default("ready_for_review").notNull(),
  confirmedAt: timestamp("confirmedAt"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ClinicianProfile = typeof clinicianProfiles.$inferSelect;
export type InsertClinicianProfile = typeof clinicianProfiles.$inferInsert;
export type KneeCase = typeof kneeCases.$inferSelect;
export type InsertKneeCase = typeof kneeCases.$inferInsert;
export type PresentationTestCase = typeof presentationTestCases.$inferSelect;
export type InsertPresentationTestCase = typeof presentationTestCases.$inferInsert;
export type ImplantCatalogueRow = typeof implantCatalogue.$inferSelect;
export type InsertImplantCatalogueRow = typeof implantCatalogue.$inferInsert;
export type ImplantPlan = typeof implantPlans.$inferSelect;
export type InsertImplantPlan = typeof implantPlans.$inferInsert;
