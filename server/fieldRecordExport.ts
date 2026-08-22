import ExcelJS from "exceljs";
import sharp from "sharp";
import type { FieldRecordWithPhotos } from "./db";
import { storageGetSignedUrl } from "./storage";

type ExportableFieldRecord = Pick<FieldRecordWithPhotos, "recordKey" | "label" | "vendorName" | "note" | "isChecked" | "updatedAt" | "photos">;
type ExportablePhoto = ExportableFieldRecord["photos"][number];
type Thumbnail = { buffer: Buffer; extension: "png" | "jpeg" };
type ThumbnailProvider = (photo: ExportablePhoto) => Promise<Thumbnail | null>;
type Category = { key: string; sheetName: string; title: string };
type SheetGroup = { kind: "카테고리" | "업체"; title: string; sheetName: string; records: ExportableFieldRecord[] };

const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CATEGORIES: Category[] = [
  { key: "vendor", sheetName: "업체·담당자", title: "업체 및 담당자" },
  { key: "product", sheetName: "부스·제품사양", title: "부스 위치 및 제품 사양" },
  { key: "pricing", sheetName: "가격·납기", title: "단가·견적 및 납기" },
  { key: "compliance", sheetName: "인증·샘플", title: "인증·샘플 및 현장 사진" },
  { key: "other", sheetName: "기타", title: "기타 상담 기록" },
];

function protectSpreadsheetText(value: string): string {
  const text = value ?? "";
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function stamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((values, part) => {
    values[part.type] = part.value;
    return values;
  }, {});
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

function categoryFor(record: ExportableFieldRecord): Category {
  const index = Number(record.recordKey.replace("record-", ""));
  if (index === 0) return CATEGORIES[0];
  if ([1, 2].includes(index)) return CATEGORIES[1];
  if ([3, 4, 5].includes(index)) return CATEGORIES[2];
  if ([6, 7].includes(index)) return CATEGORIES[3];
  return CATEGORIES[4];
}

function safeVendorSheetName(vendorName: string, usedNames: Set<string>): string {
  const stem = `업체_${vendorName.replace(/[\\/:?*\[\]]/g, " ").replace(/\s+/g, " ").trim() || "미지정"}`;
  let candidate = stem.slice(0, 31);
  let serial = 2;
  while (usedNames.has(candidate)) {
    const suffix = ` (${serial})`;
    candidate = `${stem.slice(0, 31 - suffix.length)}${suffix}`;
    serial += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

async function loadThumbnail(photo: ExportablePhoto): Promise<Thumbnail | null> {
  try {
    const signedUrl = await storageGetSignedUrl(photo.storageKey);
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`사진을 불러오지 못했습니다 (${response.status}).`);
    const source = Buffer.from(await response.arrayBuffer());
    const buffer = await sharp(source).rotate().resize({ width: 118, height: 76, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return { buffer, extension: "png" };
  } catch (error) {
    console.warn("[FieldRecordExport] Thumbnail skipped", { photoId: photo.id, error });
    return null;
  }
}

function styleSheetTitle(sheet: ExcelJS.Worksheet, title: string, generatedAt: Date) {
  sheet.mergeCells("A1:K1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `CVT200 · ${title}`;
  titleCell.font = { name: "Noto Sans KR", size: 15, bold: true, color: { argb: "FFF7F4ED" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16222C" } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:K2");
  sheet.getCell("A2").value = `생성 시각: ${generatedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 현장 사진은 행별 썸네일과 캡션으로 함께 정리됩니다.`;
  sheet.getCell("A2").font = { name: "Noto Sans KR", size: 9, color: { argb: "FF56635F" } };
  sheet.getCell("A2").alignment = { vertical: "middle" };
  sheet.getRow(2).height = 24;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 23;
  row.eachCell((cell) => {
    cell.font = { name: "Noto Sans KR", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF286F66" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFB8CBC4" } } };
  });
}

function styleRecordRow(row: ExcelJS.Row, isChecked: boolean, stripe: boolean) {
  row.eachCell((cell, column) => {
    cell.font = { name: "Noto Sans KR", size: 10, color: { argb: "FF1D2A30" } };
    cell.alignment = { vertical: "top", wrapText: true, horizontal: [1, 4, 6].includes(column) ? "center" : "left" };
    cell.border = { bottom: { style: "hair", color: { argb: "FFD5D8D2" } } };
    if (stripe) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBFAF6" } };
  });
  row.getCell(4).font = { name: "Noto Sans KR", size: 10, bold: true, color: { argb: isChecked ? "FF286F66" : "FF9A4B39" } };
  row.getCell(11).numFmt = "yyyy-mm-dd hh:mm";
}

async function addRecordsSheet(workbook: ExcelJS.Workbook, sheetGroup: SheetGroup, generatedAt: Date, thumbnailProvider: ThumbnailProvider) {
  const sheet = workbook.addWorksheet(sheetGroup.sheetName, { views: [{ state: "frozen", ySplit: 4 }] });
  styleSheetTitle(sheet, sheetGroup.title, generatedAt);
  sheet.getRow(4).values = ["번호", "업체명", "기록 항목", "완료", "현장 메모", "사진 수", "현장 사진(썸네일)", "사진 파일명", "사진 캡션", "사진 주소", "최종 저장"];
  styleHeader(sheet.getRow(4));
  sheet.columns = [
    { width: 7 }, { width: 26 }, { width: 31 }, { width: 10 }, { width: 43 }, { width: 9 },
    { width: 20 }, { width: 28 }, { width: 32 }, { width: 48 }, { width: 20 },
  ];

  for (let index = 0; index < sheetGroup.records.length; index += 1) {
    const record = sheetGroup.records[index];
    const thumbnails = await Promise.all(record.photos.map(async (photo: ExportablePhoto) => ({ photo, thumbnail: await thumbnailProvider(photo) })));
    const photoRows = thumbnails.length ? thumbnails : [{ photo: null, thumbnail: null }];
    for (let photoIndex = 0; photoIndex < photoRows.length; photoIndex += 1) {
      const entry = photoRows[photoIndex];
      const row = sheet.addRow(photoIndex === 0 ? [
        index + 1,
        protectSpreadsheetText(record.vendorName),
        protectSpreadsheetText(record.label),
        record.isChecked ? "완료" : "미완료",
        protectSpreadsheetText(record.note),
        record.photos.length,
        "",
        entry.photo ? protectSpreadsheetText(entry.photo.fileName) : "",
        entry.photo ? protectSpreadsheetText(entry.photo.caption) : "",
        entry.photo ? protectSpreadsheetText(entry.photo.url) : "",
        record.updatedAt,
      ] : ["", "", "", "", "", "", "", protectSpreadsheetText(entry.photo?.fileName ?? ""), protectSpreadsheetText(entry.photo?.caption ?? ""), protectSpreadsheetText(entry.photo?.url ?? ""), ""]);
      row.height = entry.thumbnail ? 62 : 30;
      styleRecordRow(row, record.isChecked, index % 2 === 1);
      if (entry.thumbnail) {
        const imageId = workbook.addImage({ buffer: Buffer.from(entry.thumbnail.buffer) as any, extension: entry.thumbnail.extension });
        sheet.addImage(imageId, { tl: { col: 6, row: row.number - 1 }, ext: { width: 112, height: 72 }, editAs: "oneCell" });
      }
    }
  }
  sheet.autoFilter = { from: "A4", to: "K4" };
}

function addSummarySheet(workbook: ExcelJS.Workbook, sheetGroups: SheetGroup[], generatedAt: Date) {
  const sheet = workbook.addWorksheet("요약", { views: [{ state: "frozen", ySplit: 4 }] });
  styleSheetTitle(sheet, "상담 기록 요약", generatedAt);
  sheet.getRow(4).values = ["분류", "분류명", "워크시트", "기록 수", "완료 수", "첨부 사진 수", "확인 방법"];
  styleHeader(sheet.getRow(4));
  sheet.columns = [{ width: 13 }, { width: 28 }, { width: 27 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 38 }];
  sheetGroups.forEach((group, index) => {
    const row = sheet.addRow([
      group.kind,
      group.title,
      group.sheetName,
      group.records.length,
      group.records.filter((record) => record.isChecked).length,
      group.records.reduce((sum, record) => sum + record.photos.length, 0),
      group.kind === "업체" ? "해당 업체의 상담 기록·사진 캡션·썸네일을 확인합니다." : "상담 카테고리별 메모·사진을 확인합니다.",
    ]);
    row.height = 28;
    row.eachCell((cell) => {
      cell.font = { name: "Noto Sans KR", size: 10, color: { argb: "FF1D2A30" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD5D8D2" } } };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBFAF6" } };
    });
  });
  sheet.autoFilter = { from: "A4", to: "G4" };
}

function createSheetGroups(records: ExportableFieldRecord[]): SheetGroup[] {
  const categoryGroups = CATEGORIES.map((category) => ({ kind: "카테고리" as const, title: category.title, sheetName: category.sheetName, records: records.filter((record) => categoryFor(record).key === category.key) }));
  const vendors = new Map<string, ExportableFieldRecord[]>();
  records.forEach((record) => {
    const vendorName = record.vendorName.trim();
    if (!vendorName) return;
    const bucket = vendors.get(vendorName) ?? [];
    bucket.push(record);
    vendors.set(vendorName, bucket);
  });
  const usedNames = new Set(["요약", ...categoryGroups.map((group) => group.sheetName)]);
  const vendorGroups = Array.from(vendors.entries()).sort(([left], [right]) => left.localeCompare(right, "ko")).map(([vendorName, vendorRecords]) => ({
    kind: "업체" as const,
    title: vendorName,
    sheetName: safeVendorSheetName(vendorName, usedNames),
    records: vendorRecords,
  }));
  return [...categoryGroups, ...vendorGroups];
}

export async function createFieldRecordExport(records: ExportableFieldRecord[], generatedAt = new Date(), options: { thumbnailProvider?: ThumbnailProvider } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CVT200 Field Ledger";
  workbook.created = generatedAt;
  const thumbnailProvider = options.thumbnailProvider ?? loadThumbnail;
  const sheetGroups = createSheetGroups(records);

  addSummarySheet(workbook, sheetGroups, generatedAt);
  for (const sheetGroup of sheetGroups) {
    await addRecordsSheet(workbook, sheetGroup, generatedAt, thumbnailProvider);
  }

  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    fileName: `CVT200_상담기록_${stamp(generatedAt)}.xlsx`,
    mimeType: EXCEL_MIME_TYPE,
    dataBase64: bytes.toString("base64"),
    recordCount: records.length,
  };
}
