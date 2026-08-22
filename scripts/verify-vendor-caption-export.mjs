import ExcelJS from "exceljs";
import { listFieldRecordsForUser } from "../server/db.ts";
import { createFieldRecordExport } from "../server/fieldRecordExport.ts";

const records = await listFieldRecordsForUser(1);
const exported = await createFieldRecordExport(records);
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(Buffer.from(exported.dataBase64, "base64"));

const vendorSheet = workbook.getWorksheet("업체_Shenzhen Nova Tech");
console.log(JSON.stringify({
  fileName: exported.fileName,
  worksheetNames: workbook.worksheets.map((sheet) => sheet.name),
  vendorValue: vendorSheet?.getCell("B5").value ?? null,
  captionValue: vendorSheet?.getCell("I5").value ?? null,
  thumbnailCount: vendorSheet?.getImages().length ?? 0,
}, null, 2));
