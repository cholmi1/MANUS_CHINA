import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createFieldRecordExport } from "./fieldRecordExport";

describe("field record Excel export", () => {
  it("creates a readable worksheet with notes and photo references", async () => {
    const generatedAt = new Date("2026-08-22T08:30:00.000Z");
    const exportFile = await createFieldRecordExport([{
      recordKey: "record-0",
      label: "상호 · 담당자",
      note: "담당자와 MOQ를 확인했습니다.",
      isChecked: true,
      updatedAt: generatedAt,
      photos: [{ id: 1, recordId: 1, storageKey: "field/a.png", url: "/manus-storage/field/a.png", fileName: "명함.png", mimeType: "image/png", createdAt: generatedAt }],
    }], generatedAt);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exportFile.dataBase64, "base64"));
    const sheet = workbook.getWorksheet("상담 기록");

    expect(sheet?.getCell("B5").value).toBe("상호 · 담당자");
    expect(sheet?.getCell("C5").value).toBe("완료");
    expect(sheet?.getCell("F5").value).toBe("명함.png");
    expect(sheet?.getCell("G5").value).toBe("/manus-storage/field/a.png");
    expect(exportFile.fileName).toMatch(/\.xlsx$/);
  });

  it("escapes formula-like field text to prevent spreadsheet injection", async () => {
    const exportFile = await createFieldRecordExport([{
      recordKey: "record-1", label: "=UNSAFE", note: "+TEXT", isChecked: false, updatedAt: new Date(), photos: [],
    }]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exportFile.dataBase64, "base64"));
    const sheet = workbook.getWorksheet("상담 기록");

    expect(sheet?.getCell("B5").value).toBe("'=UNSAFE");
    expect(sheet?.getCell("D5").value).toBe("'+TEXT");
  });
});
