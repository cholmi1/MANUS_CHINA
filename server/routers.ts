import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { addFieldRecordPhoto, addTripChecklistEvidence, addTripExpenseReceipt, addVendorConsultationPhotoForUser, deleteFieldRecordPhotoForUser, deleteTripChecklistEvidenceForUser, deleteTripExpenseForUser, deleteTripExpenseReceiptForUser, deleteVendorConsultationPhotoForUser, deleteVendorForUser, getTripExpenseForUser, listFieldRecordsForUser, listTripChecklistItemsForUser, listTripExpensesForUser, listVendorsForUser, updateFieldRecordPhotoCaptionForUser, updateVendorConsultationPhotoCaptionForUser, upsertFieldRecord, upsertTripChecklistItem, upsertTripExpense, upsertVendorConsultationForUser, upsertVendorForUser } from "./db";
import { createFieldRecordExport, flattenVendorFoldersForExport } from "./fieldRecordExport";
import { decodeBase64FieldPhoto, decodeBase64Upload, safePhotoFileName } from "./fieldRecordUtils";
import { storagePut } from "./storage";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const recordInput = z.object({
  recordKey: z.string().min(1).max(64),
  label: z.string().min(1).max(255),
  vendorName: z.string().max(160),
  note: z.string().max(10_000),
  isChecked: z.boolean(),
});

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const proofMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const checklistInput = z.object({ itemKey: z.string().min(1).max(64), groupKey: z.string().min(1).max(32), label: z.string().min(1).max(255), note: z.string().max(10_000), isChecked: z.boolean() });
const proofInput = z.object({ fileName: z.string().min(1).max(255), mimeType: z.enum(proofMimeTypes), dataBase64: z.string().min(4).max(14_000_000) });
const expenseInput = z.object({ id: z.number().int().positive().optional(), category: z.string().min(1).max(32), title: z.string().min(1).max(160), amount: z.number().int().min(0).max(999_999_999), currency: z.enum(["KRW", "CNY", "USD"]), spentAt: z.date(), note: z.string().max(10_000) });
const vendorInput = z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(160), contactName: z.string().max(120), booth: z.string().max(120) });
const vendorConsultationInput = z.object({ vendorId: z.number().int().positive(), recordKey: z.string().min(1).max(64), label: z.string().min(1).max(255), note: z.string().max(10_000), isChecked: z.boolean() });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  fieldRecords: router({
    list: protectedProcedure.query(({ ctx }) => listFieldRecordsForUser(ctx.user.id)),
    export: protectedProcedure.mutation(async ({ ctx }) => {
      const records = await listFieldRecordsForUser(ctx.user.id);
      return createFieldRecordExport(records);
    }),
    upsert: protectedProcedure.input(recordInput).mutation(({ ctx, input }) => upsertFieldRecord(ctx.user.id, input)),
    uploadPhoto: protectedProcedure.input(recordInput.extend({
      fileName: z.string().min(1).max(255),
      mimeType: z.enum(imageMimeTypes),
      dataBase64: z.string().min(4).max(12_000_000),
    })).mutation(async ({ ctx, input }) => {
      const record = await upsertFieldRecord(ctx.user.id, input);
      const data = decodeBase64FieldPhoto(input.dataBase64);
      const fileName = safePhotoFileName(input.fileName);
      let stored: { key: string; url: string };
      try {
        stored = await storagePut(`field-records/${ctx.user.id}/${input.recordKey}/${fileName}`, data, input.mimeType);
      } catch (error) {
        console.error("[FieldRecord] Photo upload failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "사진 업로드에 실패했습니다. 다시 시도해 주세요." });
      }
      const photo = await addFieldRecordPhoto(record.id, { storageKey: stored.key, url: stored.url, fileName, caption: "", mimeType: input.mimeType });
      return { record, photo };
    }),
    updatePhotoCaption: protectedProcedure.input(z.object({ photoId: z.number().int().positive(), caption: z.string().max(500) })).mutation(async ({ ctx, input }) => {
      return updateFieldRecordPhotoCaptionForUser(ctx.user.id, input.photoId, input.caption);
    }),
    deletePhoto: protectedProcedure.input(z.object({ photoId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteFieldRecordPhotoForUser(ctx.user.id, input.photoId);
      return { success: true } as const;
    }),
  }),
  tripChecklist: router({
    list: protectedProcedure.query(({ ctx }) => listTripChecklistItemsForUser(ctx.user.id)),
    upsert: protectedProcedure.input(checklistInput).mutation(({ ctx, input }) => upsertTripChecklistItem(ctx.user.id, input)),
    uploadEvidence: protectedProcedure.input(checklistInput.extend(proofInput.shape)).mutation(async ({ ctx, input }) => {
      const item = await upsertTripChecklistItem(ctx.user.id, input);
      const data = decodeBase64Upload(input.dataBase64);
      const fileName = safePhotoFileName(input.fileName);
      const stored = await storagePut(`trip-checklist/${ctx.user.id}/${input.itemKey}/${fileName}`, data, input.mimeType);
      const evidence = await addTripChecklistEvidence(item.id, { storageKey: stored.key, url: stored.url, fileName, mimeType: input.mimeType });
      return { item, evidence };
    }),
    deleteEvidence: protectedProcedure.input(z.object({ evidenceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteTripChecklistEvidenceForUser(ctx.user.id, input.evidenceId);
      return { success: true } as const;
    }),
  }),
  expenses: router({
    list: protectedProcedure.query(({ ctx }) => listTripExpensesForUser(ctx.user.id)),
    upsert: protectedProcedure.input(expenseInput).mutation(({ ctx, input }) => upsertTripExpense(ctx.user.id, input)),
    delete: protectedProcedure.input(z.object({ expenseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteTripExpenseForUser(ctx.user.id, input.expenseId);
      return { success: true } as const;
    }),
    uploadReceipt: protectedProcedure.input(proofInput.extend({ expenseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const expense = await getTripExpenseForUser(ctx.user.id, input.expenseId);
      const data = decodeBase64Upload(input.dataBase64);
      const fileName = safePhotoFileName(input.fileName);
      const stored = await storagePut(`trip-expenses/${ctx.user.id}/${expense.id}/${fileName}`, data, input.mimeType);
      const receipt = await addTripExpenseReceipt(expense.id, { storageKey: stored.key, url: stored.url, fileName, mimeType: input.mimeType });
      return { expense, receipt };
    }),
    deleteReceipt: protectedProcedure.input(z.object({ receiptId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteTripExpenseReceiptForUser(ctx.user.id, input.receiptId);
      return { success: true } as const;
    }),
  }),
  vendors: router({
    list: protectedProcedure.query(({ ctx }) => listVendorsForUser(ctx.user.id)),
    export: protectedProcedure.mutation(async ({ ctx }) => {
      const vendorFolders = await listVendorsForUser(ctx.user.id);
      return createFieldRecordExport(flattenVendorFoldersForExport(vendorFolders));
    }),
    upsert: protectedProcedure.input(vendorInput).mutation(({ ctx, input }) => upsertVendorForUser(ctx.user.id, input)),
    delete: protectedProcedure.input(z.object({ vendorId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await deleteVendorForUser(ctx.user.id, input.vendorId); return { success: true } as const; }),
    upsertConsultation: protectedProcedure.input(vendorConsultationInput).mutation(({ ctx, input }) => upsertVendorConsultationForUser(ctx.user.id, input)),
    uploadConsultationPhoto: protectedProcedure.input(vendorConsultationInput.extend({ fileName: z.string().min(1).max(255), mimeType: z.enum(imageMimeTypes), dataBase64: z.string().min(4).max(12_000_000) })).mutation(async ({ ctx, input }) => {
      const consultation = await upsertVendorConsultationForUser(ctx.user.id, input);
      const data = decodeBase64FieldPhoto(input.dataBase64);
      const fileName = safePhotoFileName(input.fileName);
      const stored = await storagePut(`vendor-consultations/${ctx.user.id}/${input.vendorId}/${consultation.id}/${fileName}`, data, input.mimeType);
      const photo = await addVendorConsultationPhotoForUser(ctx.user.id, input.vendorId, consultation.id, { storageKey: stored.key, url: stored.url, fileName, caption: "", mimeType: input.mimeType });
      return { consultation, photo };
    }),
    updateConsultationPhotoCaption: protectedProcedure.input(z.object({ photoId: z.number().int().positive(), caption: z.string().max(500) })).mutation(async ({ ctx, input }) => { await updateVendorConsultationPhotoCaptionForUser(ctx.user.id, input.photoId, input.caption); return { success: true } as const; }),
    deleteConsultationPhoto: protectedProcedure.input(z.object({ photoId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await deleteVendorConsultationPhotoForUser(ctx.user.id, input.photoId); return { success: true } as const; }),
  }),
});

export type AppRouter = typeof appRouter;
