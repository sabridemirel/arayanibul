/** Longest side kept on upload; matches the server's MaxImageDimension. */
export const MAX_IMAGE_DIMENSION = 2048;
const JPEG_QUALITY = 0.88;
const PASS_THROUGH_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PASS_THROUGH_MAX_BYTES = 1024 * 1024;

export class ImageDecodeError extends Error {}

/**
 * Downscales a picked photo in the browser before upload so phone photos (often 3–12 MB, or HEIC)
 * stay under the server's 5 MB limit. createImageBitmap applies the EXIF orientation.
 * Small images that are already a supported format are sent unchanged.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageDecodeError(file.name);
  }

  try {
    const { width, height } = bitmap;
    const fitsAlready = Math.max(width, height) <= MAX_IMAGE_DIMENSION;
    if (fitsAlready && file.size <= PASS_THROUGH_MAX_BYTES && PASS_THROUGH_TYPES.includes(file.type)) {
      return file;
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageDecodeError(file.name);
    // JPEG has no transparency; paint white behind PNG/WebP cut-outs instead of black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new ImageDecodeError(file.name);

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
