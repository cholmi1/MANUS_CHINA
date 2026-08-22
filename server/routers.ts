import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { addFieldRecordPhoto, deleteFieldRecordPhotoForUser, listFieldRecordsForUser, upsertFieldRecord } from "./db";
import { createFieldRecordExport } from "./fieldRecordExport";
import { decodeBase64FieldPhoto, safePhotoFileName } from "./fieldRecordUtils";
import { storagePut } from "./storage";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const recordInput = z.object({
  recordKey: z.string().min(1).max(64),
  label: z.string().min(1).max(255),
  note: z.string().max(10_000),
  isChecked: z.boolean(),
});

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

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
      const photo = await addFieldRecordPhoto(record.id, { storageKey: stored.key, url: stored.url, fileName, mimeType: input.mimeType });
      return { record, photo };
    }),
    deletePhoto: protectedProcedure.input(z.object({ photoId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteFieldRecordPhotoForUser(ctx.user.id, input.photoId);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
