import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { FieldRecord, FieldRecordPhoto, InsertUser, TripChecklistEvidence, TripChecklistItem, TripExpense, TripExpenseReceipt, Vendor, VendorConsultation, VendorConsultationPhoto, fieldRecordPhotos, fieldRecords, tripChecklistEvidence, tripChecklistItems, tripExpenseReceipts, tripExpenses, users, vendorConsultationPhotos, vendorConsultations, vendors } from "../drizzle/schema";
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

export type FieldRecordInput = {
  recordKey: string;
  label: string;
  vendorName: string;
  note: string;
  isChecked: boolean;
};

export type FieldRecordWithPhotos = Awaited<ReturnType<typeof listFieldRecordsForUser>>[number];

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("기록 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  return db;
}

export async function listFieldRecordsForUser(userId: number) {
  const db = await requireDb();
  const records: FieldRecord[] = await db.select().from(fieldRecords).where(eq(fieldRecords.userId, userId));
  const ids = records.map((record) => record.id);
  const photos: FieldRecordPhoto[] = ids.length
    ? await db.select().from(fieldRecordPhotos).where(inArray(fieldRecordPhotos.recordId, ids)).orderBy(desc(fieldRecordPhotos.createdAt))
    : [];

  return records.map((record) => ({
    ...record,
    isChecked: Boolean(record.isChecked),
    photos: photos.filter((photo) => photo.recordId === record.id),
  }));
}

export async function upsertFieldRecord(userId: number, input: FieldRecordInput) {
  const db = await requireDb();
  await db.insert(fieldRecords).values({
    userId,
    recordKey: input.recordKey,
    label: input.label,
    vendorName: input.vendorName,
    note: input.note,
    isChecked: input.isChecked ? 1 : 0,
  }).onDuplicateKeyUpdate({
    set: {
      label: input.label,
      vendorName: input.vendorName,
      note: input.note,
      isChecked: input.isChecked ? 1 : 0,
      updatedAt: new Date(),
    },
  });

  const [record] = await db.select().from(fieldRecords).where(and(eq(fieldRecords.userId, userId), eq(fieldRecords.recordKey, input.recordKey))).limit(1);
  if (!record) throw new Error("상담 기록을 저장하지 못했습니다.");
  return { ...record, isChecked: Boolean(record.isChecked) };
}

export async function addFieldRecordPhoto(recordId: number, photo: Omit<FieldRecordPhoto, "id" | "recordId" | "createdAt">) {
  const db = await requireDb();
  await db.insert(fieldRecordPhotos).values({ recordId, ...photo });
  const [saved]: FieldRecordPhoto[] = await db.select().from(fieldRecordPhotos).where(eq(fieldRecordPhotos.recordId, recordId)).orderBy(desc(fieldRecordPhotos.id)).limit(1);
  if (!saved) throw new Error("사진 정보를 저장하지 못했습니다.");
  return saved;
}

export async function deleteFieldRecordPhotoForUser(userId: number, photoId: number) {
  const db = await requireDb();
  const [owned] = await db.select({ photoId: fieldRecordPhotos.id }).from(fieldRecordPhotos)
    .innerJoin(fieldRecords, eq(fieldRecordPhotos.recordId, fieldRecords.id))
    .where(and(eq(fieldRecordPhotos.id, photoId), eq(fieldRecords.userId, userId))).limit(1);
  if (!owned) throw new Error("삭제할 사진을 찾을 수 없습니다.");
  await db.delete(fieldRecordPhotos).where(eq(fieldRecordPhotos.id, photoId));
}

export async function updateFieldRecordPhotoCaptionForUser(userId: number, photoId: number, caption: string) {
  const db = await requireDb();
  const [owned] = await db.select({ photoId: fieldRecordPhotos.id }).from(fieldRecordPhotos)
    .innerJoin(fieldRecords, eq(fieldRecordPhotos.recordId, fieldRecords.id))
    .where(and(eq(fieldRecordPhotos.id, photoId), eq(fieldRecords.userId, userId))).limit(1);
  if (!owned) throw new Error("수정할 사진을 찾을 수 없습니다.");
  await db.update(fieldRecordPhotos).set({ caption }).where(eq(fieldRecordPhotos.id, photoId));
  const [updated] = await db.select().from(fieldRecordPhotos).where(eq(fieldRecordPhotos.id, photoId)).limit(1);
  if (!updated) throw new Error("사진 캡션을 저장하지 못했습니다.");
  return updated;
}

export type TripChecklistInput = { itemKey: string; groupKey: string; label: string; note: string; isChecked: boolean };
export type TripExpenseInput = { id?: number; category: string; title: string; amount: number; currency: string; spentAt: Date; note: string };

export async function listTripChecklistItemsForUser(userId: number) {
  const db = await requireDb();
  const items: TripChecklistItem[] = await db.select().from(tripChecklistItems).where(eq(tripChecklistItems.userId, userId));
  const itemIds = items.map((item) => item.id);
  const evidence: TripChecklistEvidence[] = itemIds.length ? await db.select().from(tripChecklistEvidence).where(inArray(tripChecklistEvidence.checklistItemId, itemIds)).orderBy(desc(tripChecklistEvidence.createdAt)) : [];
  return items.map((item) => ({ ...item, isChecked: Boolean(item.isChecked), evidence: evidence.filter((file) => file.checklistItemId === item.id) }));
}

export async function upsertTripChecklistItem(userId: number, input: TripChecklistInput) {
  const db = await requireDb();
  await db.insert(tripChecklistItems).values({ userId, ...input, isChecked: input.isChecked ? 1 : 0 }).onDuplicateKeyUpdate({
    set: { groupKey: input.groupKey, label: input.label, note: input.note, isChecked: input.isChecked ? 1 : 0, updatedAt: new Date() },
  });
  const [item] = await db.select().from(tripChecklistItems).where(and(eq(tripChecklistItems.userId, userId), eq(tripChecklistItems.itemKey, input.itemKey))).limit(1);
  if (!item) throw new Error("체크리스트를 저장하지 못했습니다.");
  return { ...item, isChecked: Boolean(item.isChecked) };
}

export async function addTripChecklistEvidence(itemId: number, evidence: Omit<TripChecklistEvidence, "id" | "checklistItemId" | "createdAt">) {
  const db = await requireDb();
  await db.insert(tripChecklistEvidence).values({ checklistItemId: itemId, ...evidence });
  const [saved] = await db.select().from(tripChecklistEvidence).where(eq(tripChecklistEvidence.checklistItemId, itemId)).orderBy(desc(tripChecklistEvidence.id)).limit(1);
  if (!saved) throw new Error("증빙 파일 정보를 저장하지 못했습니다.");
  return saved;
}

export async function deleteTripChecklistEvidenceForUser(userId: number, evidenceId: number) {
  const db = await requireDb();
  const [owned] = await db.select({ id: tripChecklistEvidence.id }).from(tripChecklistEvidence).innerJoin(tripChecklistItems, eq(tripChecklistEvidence.checklistItemId, tripChecklistItems.id)).where(and(eq(tripChecklistEvidence.id, evidenceId), eq(tripChecklistItems.userId, userId))).limit(1);
  if (!owned) throw new Error("삭제할 증빙 파일을 찾을 수 없습니다.");
  await db.delete(tripChecklistEvidence).where(eq(tripChecklistEvidence.id, evidenceId));
}

export async function listTripExpensesForUser(userId: number) {
  const db = await requireDb();
  const expenses: TripExpense[] = await db.select().from(tripExpenses).where(eq(tripExpenses.userId, userId)).orderBy(desc(tripExpenses.spentAt), desc(tripExpenses.id));
  const expenseIds = expenses.map((expense) => expense.id);
  const receipts: TripExpenseReceipt[] = expenseIds.length ? await db.select().from(tripExpenseReceipts).where(inArray(tripExpenseReceipts.expenseId, expenseIds)).orderBy(desc(tripExpenseReceipts.createdAt)) : [];
  return expenses.map((expense) => ({ ...expense, receipts: receipts.filter((receipt) => receipt.expenseId === expense.id) }));
}

export async function upsertTripExpense(userId: number, input: TripExpenseInput) {
  const db = await requireDb();
  if (input.id) {
    const [owned] = await db.select({ id: tripExpenses.id }).from(tripExpenses).where(and(eq(tripExpenses.id, input.id), eq(tripExpenses.userId, userId))).limit(1);
    if (!owned) throw new Error("수정할 비용 항목을 찾을 수 없습니다.");
    await db.update(tripExpenses).set({ category: input.category, title: input.title, amount: input.amount, currency: input.currency, spentAt: input.spentAt, note: input.note, updatedAt: new Date() }).where(eq(tripExpenses.id, input.id));
    const [updated] = await db.select().from(tripExpenses).where(eq(tripExpenses.id, input.id)).limit(1);
    if (!updated) throw new Error("비용 항목을 저장하지 못했습니다.");
    return updated;
  }
  await db.insert(tripExpenses).values({ userId, category: input.category, title: input.title, amount: input.amount, currency: input.currency, spentAt: input.spentAt, note: input.note });
  const [created] = await db.select().from(tripExpenses).where(eq(tripExpenses.userId, userId)).orderBy(desc(tripExpenses.id)).limit(1);
  if (!created) throw new Error("비용 항목을 저장하지 못했습니다.");
  return created;
}

export async function getTripExpenseForUser(userId: number, expenseId: number) {
  const db = await requireDb();
  const [expense] = await db.select().from(tripExpenses).where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, userId))).limit(1);
  if (!expense) throw new Error("영수증을 첨부할 비용 항목을 찾을 수 없습니다.");
  return expense;
}

export async function deleteTripExpenseForUser(userId: number, expenseId: number) {
  const db = await requireDb();
  const [owned] = await db.select({ id: tripExpenses.id }).from(tripExpenses).where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, userId))).limit(1);
  if (!owned) throw new Error("삭제할 비용 항목을 찾을 수 없습니다.");
  await db.delete(tripExpenses).where(eq(tripExpenses.id, expenseId));
}

export async function addTripExpenseReceipt(expenseId: number, receipt: Omit<TripExpenseReceipt, "id" | "expenseId" | "createdAt">) {
  const db = await requireDb();
  await db.insert(tripExpenseReceipts).values({ expenseId, ...receipt });
  const [saved] = await db.select().from(tripExpenseReceipts).where(eq(tripExpenseReceipts.expenseId, expenseId)).orderBy(desc(tripExpenseReceipts.id)).limit(1);
  if (!saved) throw new Error("영수증 정보를 저장하지 못했습니다.");
  return saved;
}

export async function deleteTripExpenseReceiptForUser(userId: number, receiptId: number) {
  const db = await requireDb();
  const [owned] = await db.select({ id: tripExpenseReceipts.id }).from(tripExpenseReceipts).innerJoin(tripExpenses, eq(tripExpenseReceipts.expenseId, tripExpenses.id)).where(and(eq(tripExpenseReceipts.id, receiptId), eq(tripExpenses.userId, userId))).limit(1);
  if (!owned) throw new Error("삭제할 영수증 파일을 찾을 수 없습니다.");
  await db.delete(tripExpenseReceipts).where(eq(tripExpenseReceipts.id, receiptId));
}

export type VendorInput = { id?: number; name: string; contactName: string; booth: string };
export type VendorConsultationInput = { vendorId: number; recordKey: string; label: string; note: string; isChecked: boolean };

async function requireVendorOwner(userId: number, vendorId: number) {
  const db = await requireDb();
  const [vendor] = await db.select().from(vendors).where(and(eq(vendors.id, vendorId), eq(vendors.userId, userId))).limit(1);
  if (!vendor) throw new Error("업체 폴더를 찾을 수 없습니다.");
  return vendor;
}

export async function listVendorsForUser(userId: number) {
  const db = await requireDb();
  const vendorRows: Vendor[] = await db.select().from(vendors).where(eq(vendors.userId, userId)).orderBy(desc(vendors.updatedAt), desc(vendors.id));
  const vendorIds = vendorRows.map((vendor) => vendor.id);
  const consultations: VendorConsultation[] = vendorIds.length ? await db.select().from(vendorConsultations).where(inArray(vendorConsultations.vendorId, vendorIds)).orderBy(vendorConsultations.id) : [];
  const consultationIds = consultations.map((consultation) => consultation.id);
  const photos: VendorConsultationPhoto[] = consultationIds.length ? await db.select().from(vendorConsultationPhotos).where(inArray(vendorConsultationPhotos.consultationId, consultationIds)).orderBy(desc(vendorConsultationPhotos.createdAt)) : [];
  return vendorRows.map((vendor) => ({ ...vendor, consultations: consultations.filter((consultation) => consultation.vendorId === vendor.id).map((consultation) => ({ ...consultation, isChecked: Boolean(consultation.isChecked), photos: photos.filter((photo) => photo.consultationId === consultation.id) })) }));
}

export async function upsertVendorForUser(userId: number, input: VendorInput) {
  const db = await requireDb();
  if (input.id) {
    await requireVendorOwner(userId, input.id);
    await db.update(vendors).set({ name: input.name, contactName: input.contactName, booth: input.booth, updatedAt: new Date() }).where(eq(vendors.id, input.id));
    const [updated] = await db.select().from(vendors).where(eq(vendors.id, input.id)).limit(1);
    if (!updated) throw new Error("업체 폴더를 저장하지 못했습니다.");
    return updated;
  }
  await db.insert(vendors).values({ userId, name: input.name, contactName: input.contactName, booth: input.booth });
  const [created] = await db.select().from(vendors).where(and(eq(vendors.userId, userId), eq(vendors.name, input.name))).limit(1);
  if (!created) throw new Error("업체 폴더를 저장하지 못했습니다.");
  return created;
}

export async function deleteVendorForUser(userId: number, vendorId: number) {
  const db = await requireDb();
  await requireVendorOwner(userId, vendorId);
  await db.delete(vendors).where(eq(vendors.id, vendorId));
}

export async function upsertVendorConsultationForUser(userId: number, input: VendorConsultationInput) {
  const db = await requireDb();
  await requireVendorOwner(userId, input.vendorId);
  await db.insert(vendorConsultations).values({ ...input, isChecked: input.isChecked ? 1 : 0 }).onDuplicateKeyUpdate({ set: { label: input.label, note: input.note, isChecked: input.isChecked ? 1 : 0, updatedAt: new Date() } });
  const [saved] = await db.select().from(vendorConsultations).where(and(eq(vendorConsultations.vendorId, input.vendorId), eq(vendorConsultations.recordKey, input.recordKey))).limit(1);
  if (!saved) throw new Error("업체 상담 기록을 저장하지 못했습니다.");
  return { ...saved, isChecked: Boolean(saved.isChecked) };
}

export async function addVendorConsultationPhotoForUser(userId: number, vendorId: number, consultationId: number, photo: Omit<VendorConsultationPhoto, "id" | "consultationId" | "createdAt">) {
  const db = await requireDb();
  await requireVendorOwner(userId, vendorId);
  const [consultation] = await db.select().from(vendorConsultations).where(and(eq(vendorConsultations.id, consultationId), eq(vendorConsultations.vendorId, vendorId))).limit(1);
  if (!consultation) throw new Error("상담 기록을 찾을 수 없습니다.");
  await db.insert(vendorConsultationPhotos).values({ consultationId, ...photo });
  const [saved] = await db.select().from(vendorConsultationPhotos).where(eq(vendorConsultationPhotos.consultationId, consultationId)).orderBy(desc(vendorConsultationPhotos.id)).limit(1);
  if (!saved) throw new Error("상담 사진 정보를 저장하지 못했습니다.");
  return saved;
}

export async function updateVendorConsultationPhotoCaptionForUser(userId: number, photoId: number, caption: string) {
  const db = await requireDb();
  const [owned] = await db.select({ id: vendorConsultationPhotos.id }).from(vendorConsultationPhotos).innerJoin(vendorConsultations, eq(vendorConsultationPhotos.consultationId, vendorConsultations.id)).innerJoin(vendors, eq(vendorConsultations.vendorId, vendors.id)).where(and(eq(vendorConsultationPhotos.id, photoId), eq(vendors.userId, userId))).limit(1);
  if (!owned) throw new Error("수정할 상담 사진을 찾을 수 없습니다.");
  await db.update(vendorConsultationPhotos).set({ caption }).where(eq(vendorConsultationPhotos.id, photoId));
}

export async function deleteVendorConsultationPhotoForUser(userId: number, photoId: number) {
  const db = await requireDb();
  const [owned] = await db.select({ id: vendorConsultationPhotos.id }).from(vendorConsultationPhotos).innerJoin(vendorConsultations, eq(vendorConsultationPhotos.consultationId, vendorConsultations.id)).innerJoin(vendors, eq(vendorConsultations.vendorId, vendors.id)).where(and(eq(vendorConsultationPhotos.id, photoId), eq(vendors.userId, userId))).limit(1);
  if (!owned) throw new Error("삭제할 상담 사진을 찾을 수 없습니다.");
  await db.delete(vendorConsultationPhotos).where(eq(vendorConsultationPhotos.id, photoId));
}
