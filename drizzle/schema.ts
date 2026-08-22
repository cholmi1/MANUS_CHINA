import { int, mysqlEnum, mysqlTable, text, timestamp, tinyint, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** A user-owned answer for one mandatory field-recording line. */
export const fieldRecords = mysqlTable("field_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  recordKey: varchar("recordKey", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  note: text("note").notNull(),
  isChecked: tinyint("isChecked").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userRecordKey: uniqueIndex("field_records_user_record_key").on(table.userId, table.recordKey),
}));

/** Image metadata only; actual photo bytes remain in S3 storage. */
export const fieldRecordPhotos = mysqlTable("field_record_photos", {
  id: int("id").autoincrement().primaryKey(),
  recordId: int("recordId").notNull().references(() => fieldRecords.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FieldRecord = typeof fieldRecords.$inferSelect;
export type FieldRecordPhoto = typeof fieldRecordPhotos.$inferSelect;
