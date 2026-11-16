import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest side kept on upload; matches the server's MaxImageDimension. */
export const MAX_IMAGE_DIMENSION = 2048;
const JPEG_QUALITY = 0.88;

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Downscales a picked photo on the device and re-encodes it as JPEG, so 12–48 MP camera photos
 * (and HEIC) upload as well under 1 MB and stay under the server's 5 MB limit.
 */
export async function prepareImageForUpload(image: PickedImage): Promise<PickedImage> {
  const context = ImageManipulator.manipulate(image.uri);
  const longest = Math.max(image.width, image.height);
  if (longest > MAX_IMAGE_DIMENSION) {
    context.resize(
      image.width >= image.height ? { width: MAX_IMAGE_DIMENSION } : { height: MAX_IMAGE_DIMENSION },
    );
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: result.uri, width: result.width, height: result.height };
}
