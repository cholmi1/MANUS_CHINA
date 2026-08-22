import { describe, expect, it } from "vitest";
import { decodeBase64FieldPhoto, safePhotoFileName } from "./fieldRecordUtils";

describe("field record photo utilities", () => {
  it("decodes valid base64 payloads", () => {
    const encoded = Buffer.from("field photo").toString("base64");
    expect(decodeBase64FieldPhoto(encoded).toString()).toBe("field photo");
  });

  it("rejects malformed base64 payloads", () => {
    expect(() => decodeBase64FieldPhoto("not-base64!")).toThrow("사진 데이터 형식");
  });

  it("creates an S3-safe file name", () => {
    expect(safePhotoFileName("상담 명함 (1).jpg")).toBe("_1_.jpg");
  });
});
