// The API returns images as objects ({ id, imageUrl, sortOrder }); screens render them with
// <Image source={{ uri }}>, which needs a string (an object crashes the app on Android).
/** Images with their ids, in display order (needed to remove one from a listing). */
export const toImageItems = (images: unknown): { id: number; url: string }[] => {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img) => img && typeof img === 'object' && typeof img.id === 'number')
    .map((img, index) => ({ id: img.id as number, url: (img.imageUrl ?? img.url) as string, order: img.sortOrder ?? index }))
    .filter((img) => typeof img.url === 'string' && img.url.length > 0)
    .sort((a, b) => a.order - b.order)
    .map(({ id, url }) => ({ id, url }));
};

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
