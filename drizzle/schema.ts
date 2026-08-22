import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ClinicianProfile = typeof clinicianProfiles.$inferSelect;
export type InsertClinicianProfile = typeof clinicianProfiles.$inferInsert;
