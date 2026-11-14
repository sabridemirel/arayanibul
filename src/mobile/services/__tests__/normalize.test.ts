import { toImageUrls } from '../imageUrls';

// The API returns images as objects ({ id, imageUrl, sortOrder }); <Image source={{ uri }}>
// needs strings, and an object there crashes the app on Android.
describe('toImageUrls', () => {
  it('maps image objects to URL strings ordered by sortOrder', () => {
    expect(toImageUrls([
      { id: 2, imageUrl: 'https://x/b.jpg', sortOrder: 1 },
      { id: 1, imageUrl: 'https://x/a.jpg', sortOrder: 0 },
    ])).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
  });

  it('keeps plain string images as they are', () => {
    expect(toImageUrls(['https://x/a.jpg'])).toEqual(['https://x/a.jpg']);
  });

  it('drops entries without a URL and passes through missing lists', () => {
    expect(toImageUrls([{ id: 1 }, null])).toEqual([]);
    expect(toImageUrls(undefined)).toBeUndefined();
  });
});
