import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createFieldRecordExport } from "./fieldRecordExport";

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0NwAAAABJRU5ErkJggg==", "base64");

describe("field record Excel export", () => {
  it("creates category and vendor sheets with photo thumbnails and captions", async () => {
    const generatedAt = new Date("2026-08-22T08:30:00.000Z");
    const exportFile = await createFieldRecordExport([{
      recordKey: "record-0", vendorName: "Shenzhen ABC Components", label: "상호 · 담당자", note: "담당자와 MOQ를 확인했습니다.", isChecked: true, updatedAt: generatedAt,
      photos: [{ id: 1, recordId: 1, storageKey: "field/a.png", url: "/manus-storage/field/a.png", fileName: "명함.png", caption: "담당자 명함 전면", mimeType: "image/png", createdAt: generatedAt }],
    }, {
      recordKey: "record-3", vendorName: "Yiwu Paper Lab", label: "단가 · MOQ", note: "가격 구간을 정리했습니다.", isChecked: false, updatedAt: generatedAt, photos: [],
    }], generatedAt, { thumbnailProvider: async () => ({ buffer: onePixelPng, extension: "png" }) });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exportFile.dataBase64, "base64"));
    const vendorSheet = workbook.getWorksheet("업체_Shenzhen ABC Components");
    const categorySheet = workbook.getWorksheet("업체·담당자");
    const summarySheet = workbook.getWorksheet("요약");

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["요약", "업체·담당자", "부스·제품사양", "가격·납기", "인증·샘플", "기타", "업체_Shenzhen ABC Components", "업체_Yiwu Paper Lab"]);
    expect(vendorSheet?.getCell("B5").value).toBe("Shenzhen ABC Components");
    expect(vendorSheet?.getCell("I5").value).toBe("담당자 명함 전면");
    expect(categorySheet?.getImages()).toHaveLength(1);
    expect(summarySheet?.getCell("A10").value).toBe("업체");
    expect(exportFile.fileName).toMatch(/\.xlsx$/);
  });

  it("escapes formula-like vendor, label, note, and caption text", async () => {
    const exportFile = await createFieldRecordExport([{
      recordKey: "record-0", vendorName: "=VENDOR", label: "=UNSAFE", note: "+TEXT", isChecked: false, updatedAt: new Date(),
      photos: [{ id: 2, recordId: 1, storageKey: "field/b.png", url: "/manus-storage/field/b.png", fileName: "@photo.png", caption: "-CAPTION", mimeType: "image/png", createdAt: new Date() }],
    }], new Date(), { thumbnailProvider: async () => null });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exportFile.dataBase64, "base64"));
    const sheet = workbook.getWorksheet("업체·담당자");

    expect(sheet?.getCell("B5").value).toBe("'=VENDOR");
    expect(sheet?.getCell("C5").value).toBe("'=UNSAFE");
    expect(sheet?.getCell("E5").value).toBe("'+TEXT");
    expect(sheet?.getCell("I5").value).toBe("'-CAPTION");
  });
});
