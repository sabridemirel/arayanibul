import { Alert } from 'react-native';
import { needAPI } from '../services/api';
import type { CategoryCheck } from '../services/api';

/**
 * Before a listing is saved: if its words point to a different category group than the chosen
 * one ("kiralık ev" under computer parts), offer the suggested category. Resolves with the
 * category to use, or null when the person wants to keep editing.
 */
export const confirmCategory = async (
  title: string,
  description: string,
  categoryId: number
): Promise<number | null> => {
  let check: CategoryCheck;
  try {
    check = await needAPI.checkCategory({ title, description, categoryId });
  } catch {
    return categoryId; // The server checks again when the listing is saved
  }
  if (check.matches || !check.suggestedCategoryId) return categoryId;

  const suggested = check.suggestedParentName
    ? `${check.suggestedParentName} › ${check.suggestedCategoryName}`
    : check.suggestedCategoryName;

  const suggestedId = check.suggestedCategoryId;
  return new Promise((resolve) => {
    Alert.alert(
      'Kategori İlanınıza Uymuyor Gibi',
      `Yazdıklarınız "${suggested}" kategorisine daha uygun görünüyor. ` +
        'Kategorinizi korursanız ilanınız yayına girmeden önce kısa bir incelemeden geçer.',
      [
        { text: 'Düzenlemeye Dön', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Kategorimi Koru', onPress: () => resolve(categoryId) },
        { text: `${check.suggestedCategoryName} Olarak Değiştir`, onPress: () => resolve(suggestedId) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
};
