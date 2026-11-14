// The API returns images as objects ({ id, imageUrl, sortOrder }); screens render them with
// <Image source={{ uri }}>, which needs a string (an object crashes the app on Android).
export const toImageUrls = (images: unknown): string[] | undefined => {
  if (!Array.isArray(images)) return undefined;
  return images
    .map((img, index) => typeof img === 'string'
      ? { url: img, order: index }
      : { url: img?.imageUrl ?? img?.url, order: img?.sortOrder ?? index })
    .filter((img): img is { url: string; order: number } => typeof img.url === 'string' && img.url.length > 0)
    .sort((a, b) => a.order - b.order)
    .map(img => img.url);
};
