// Client-side: turn a picked/captured File into a downscaled JPEG base64 string.
// Phone photos are multi-MB; we cap the longest edge so the upload + vision call
// stay fast and cheap. EXIF orientation is honored where the browser supports it.

export interface EncodedImage {
  base64: string; // no "data:" prefix — ready for ScanRequest.image_base64
  mime: string; // always "image/jpeg" after re-encode
  previewUrl: string; // full data: URL for an <img> preview
}

export async function fileToEncodedImage(
  file: File,
  maxDim = 2000,
  quality = 0.85,
): Promise<EncodedImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const mime = "image/jpeg";
  const previewUrl = canvas.toDataURL(mime, quality);
  const base64 = previewUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Failed to encode image");

  return { base64, mime, previewUrl };
}
