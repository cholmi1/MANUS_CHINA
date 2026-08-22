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
  vendorName: varchar("vendorName", { length: 160 }).notNull().default(""),
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
  caption: varchar("caption", { length: 500 }).notNull().default(""),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FieldRecord = typeof fieldRecords.$inferSelect;
export type FieldRecordPhoto = typeof fieldRecordPhotos.$inferSelect;

/** A supplier or exhibitor folder owned by one user. */
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  contactName: varchar("contactName", { length: 120 }).notNull().default(""),
  booth: varchar("booth", { length: 120 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userVendorName: uniqueIndex("vendors_user_name").on(table.userId, table.name),
}));

/** One mandatory field-recording answer scoped to exactly one vendor folder. */
export const vendorConsultations = mysqlTable("vendor_consultations", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  recordKey: varchar("recordKey", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  note: text("note").notNull().default(""),
  isChecked: tinyint("isChecked").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  vendorRecordKey: uniqueIndex("vendor_consultations_vendor_key").on(table.vendorId, table.recordKey),
}));

/** Photo metadata associated with a vendor-scoped consultation line. */
export const vendorConsultationPhotos = mysqlTable("vendor_consultation_photos", {
  id: int("id").autoincrement().primaryKey(),
  consultationId: int("consultationId").notNull().references(() => vendorConsultations.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  caption: varchar("caption", { length: 500 }).notNull().default(""),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type VendorConsultation = typeof vendorConsultations.$inferSelect;
export type VendorConsultationPhoto = typeof vendorConsultationPhotos.$inferSelect;

/** User-owned preparation or reservation task with attached evidence metadata. */
export const tripChecklistItems = mysqlTable("trip_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemKey: varchar("itemKey", { length: 64 }).notNull(),
  groupKey: varchar("groupKey", { length: 32 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  note: text("note").notNull().default(""),
  isChecked: tinyint("isChecked").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userItemKey: uniqueIndex("trip_checklist_user_item_key").on(table.userId, table.itemKey),
}));

/** Evidence bytes stay in S3; this table retains ownership and file metadata. */
export const tripChecklistEvidence = mysqlTable("trip_checklist_evidence", {
  id: int("id").autoincrement().primaryKey(),
  checklistItemId: int("checklistItemId").notNull().references(() => tripChecklistItems.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** One out-of-pocket trip expense entered under a standard category. */
export const tripExpenses = mysqlTable("trip_expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 32 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("KRW"),
  spentAt: timestamp("spentAt").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Receipt or proof-file metadata for a trip expense. */
export const tripExpenseReceipts = mysqlTable("trip_expense_receipts", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: int("expenseId").notNull().references(() => tripExpenses.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripChecklistItem = typeof tripChecklistItems.$inferSelect;
export type TripChecklistEvidence = typeof tripChecklistEvidence.$inferSelect;
export type TripExpense = typeof tripExpenses.$inferSelect;
export type TripExpenseReceipt = typeof tripExpenseReceipts.$inferSelect;
