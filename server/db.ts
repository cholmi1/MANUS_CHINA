import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { FieldRecord, FieldRecordPhoto, InsertUser, fieldRecordPhotos, fieldRecords, users } from "../drizzle/schema";
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
    note: input.note,
    isChecked: input.isChecked ? 1 : 0,
  }).onDuplicateKeyUpdate({
    set: {
      label: input.label,
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
