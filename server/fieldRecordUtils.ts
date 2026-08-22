/** Validation helpers for base64 image payloads sent through protected tRPC calls. */
export const MAX_FIELD_PHOTO_BYTES = 8 * 1024 * 1024;

export function decodeBase64FieldPhoto(base64: string): Buffer {
  const normalized = base64.replace(/\s/g, "");
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("사진 데이터 형식이 올바르지 않습니다.");
  }

  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.length || buffer.length > MAX_FIELD_PHOTO_BYTES) {
    throw new Error("사진은 8MB 이하로 업로드해 주세요.");
  }

  return buffer;
}

export function safePhotoFileName(fileName: string): string {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return normalized.slice(0, 120) || "field-photo.jpg";
}
