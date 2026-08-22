import ExcelJS from "exceljs";
import type { FieldRecordWithPhotos } from "./db";

type ExportableFieldRecord = Pick<FieldRecordWithPhotos, "recordKey" | "label" | "note" | "isChecked" | "updatedAt" | "photos">;

const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function protectSpreadsheetText(value: string): string {
  const text = value ?? "";
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function stamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((values, part) => {
    values[part.type] = part.value;
    return values;
  }, {});
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

export async function createFieldRecordExport(records: ExportableFieldRecord[], generatedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CVT200 Field Ledger";
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet("상담 기록", { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells("A1:H1");
  const title = sheet.getCell("A1");
  title.value = "CVT200 · 상담 기록 내보내기";
  title.font = { name: "Noto Sans KR", size: 15, bold: true, color: { argb: "FFF7F4ED" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16222C" } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = `생성 시각: ${generatedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 사진은 파일명과 보관 주소로 함께 정리됩니다.`;
  sheet.getCell("A2").font = { name: "Noto Sans KR", size: 9, color: { argb: "FF56635F" } };
  sheet.getCell("A2").alignment = { vertical: "middle" };
  sheet.getRow(2).height = 24;

  const headers = ["번호", "기록 항목", "완료", "현장 메모", "사진 수", "사진 파일명", "사진 주소", "최종 저장"];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 23;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Noto Sans KR", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF286F66" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB8CBC4" } } };
  });

  records.forEach((record, index) => {
    const photoNames = record.photos.map((photo) => protectSpreadsheetText(photo.fileName)).join("\n");
    const photoUrls = record.photos.map((photo) => protectSpreadsheetText(photo.url)).join("\n");
    const row = sheet.addRow([
      index + 1,
      protectSpreadsheetText(record.label),
      record.isChecked ? "완료" : "미완료",
      protectSpreadsheetText(record.note),
      record.photos.length,
      photoNames,
      photoUrls,
      record.updatedAt,
    ]);
    row.height = Math.max(30, Math.min(100, 24 + (record.note.length + photoNames.length) / 2));
    row.eachCell((cell, column) => {
      cell.font = { name: "Noto Sans KR", size: 10, color: { argb: "FF1D2A30" } };
      cell.alignment = { vertical: "top", wrapText: true, horizontal: column === 1 || column === 3 || column === 5 ? "center" : "left" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD5D8D2" } } };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBFAF6" } };
    });
    row.getCell(3).font = { name: "Noto Sans KR", size: 10, bold: true, color: { argb: record.isChecked ? "FF286F66" : "FF9A4B39" } };
    row.getCell(8).numFmt = "yyyy-mm-dd hh:mm";
  });

  sheet.columns = [
    { width: 7 }, { width: 35 }, { width: 11 }, { width: 55 },
    { width: 10 }, { width: 34 }, { width: 52 }, { width: 20 },
  ];
  sheet.autoFilter = { from: "A4", to: "H4" };

  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    fileName: `CVT200_상담기록_${stamp(generatedAt)}.xlsx`,
    mimeType: EXCEL_MIME_TYPE,
    dataBase64: bytes.toString("base64"),
    recordCount: records.length,
  };
}
