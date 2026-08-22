import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createFieldRecordExport } from "./fieldRecordExport";

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0NwAAAABJRU5ErkJggg==", "base64");

describe("field record Excel export", () => {
  it("separates records into category sheets and embeds photo thumbnails", async () => {
    const generatedAt = new Date("2026-08-22T08:30:00.000Z");
    const exportFile = await createFieldRecordExport([{
      recordKey: "record-0", label: "상호 · 담당자", note: "담당자와 MOQ를 확인했습니다.", isChecked: true, updatedAt: generatedAt,
      photos: [{ id: 1, recordId: 1, storageKey: "field/a.png", url: "/manus-storage/field/a.png", fileName: "명함.png", mimeType: "image/png", createdAt: generatedAt }],
    }, {
      recordKey: "record-3", label: "단가 · MOQ", note: "가격 구간을 정리했습니다.", isChecked: false, updatedAt: generatedAt, photos: [],
    }], generatedAt, { thumbnailProvider: async () => ({ buffer: onePixelPng, extension: "png" }) });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exportFile.dataBase64, "base64"));
    const vendorSheet = workbook.getWorksheet("업체·담당자");
    const pricingSheet = workbook.getWorksheet("가격·납기");
    const summarySheet = workbook.getWorksheet("요약");

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["요약", "업체·담당자", "부스·제품사양", "가격·납기", "인증·샘플", "기타"]);
    expect(vendorSheet?.getCell("B5").value).toBe("상호 · 담당자");
    expect(pricingSheet?.getCell("B5").value).toBe("단가 · MOQ");
    expect(summarySheet?.getCell("A5").value).toBe("업체 및 담당자");
    expect(vendorSheet?.getImages()).toHaveLength(1);
    expect(exportFile.fileName).toMatch(/\.xlsx$/);
  });

  it("escapes formula-like field text to prevent spreadsheet injection", async () => {
    const exportFile = await createFieldRecordExport([{
      recordKey: "record-0", label: "=UNSAFE", note: "+TEXT", isChecked: false, updatedAt: new Date(), photos: [],
    }]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(exportFile.dataBase64, "base64"));
    const sheet = workbook.getWorksheet("업체·담당자");

    expect(sheet?.getCell("B5").value).toBe("'=UNSAFE");
    expect(sheet?.getCell("D5").value).toBe("'+TEXT");
  });
});
