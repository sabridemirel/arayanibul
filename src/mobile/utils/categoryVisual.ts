// Category tile colours and icons, the same as the web (src/web/src/utils/categoryVisual.ts),
// so a listing looks alike on both. Subcategories take their root category's visual.
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { categoryAPI } from '../services/api';
import type { Category } from '../types';

export interface CategoryVisual {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  /** Soft tile background */
  background: string;
  /** Icon / label colour, dark enough for text on the tint */
  foreground: string;
}

const ROOT_VISUALS: Record<number, CategoryVisual> = {
  1: { icon: 'computer', background: '#E6EEFB', foreground: '#1D4E9E' }, // Elektronik
  2: { icon: 'home', background: '#FBEFD9', foreground: '#8A5A00' }, // Ev & Yaşam
  3: { icon: 'build', background: '#EFE6F9', foreground: '#5A189A' }, // Hizmetler
  4: { icon: 'shopping-bag', background: '#FBE6EF', foreground: '#A11852' }, // Moda & Güzellik
  5: { icon: 'directions-car', background: '#E8ECEF', foreground: '#37474F' }, // Otomotiv
  6: { icon: 'favorite', background: '#FBE8E6', foreground: '#A8261A' }, // Sağlık & Spor
  7: { icon: 'menu-book', background: '#E3F1F3', foreground: '#0F5E6B' }, // Eğitim & Kitap
  8: { icon: 'cake', background: '#FCEBDD', foreground: '#9A4A0B' }, // Yiyecek & İçecek
  9: { icon: 'apartment', background: '#E5F2E8', foreground: '#1E6B34' }, // Emlak
  10: { icon: 'public', background: '#E1F0FA', foreground: '#0B5A8A' }, // Seyahat & Turizm
  11: { icon: 'extension', background: '#FBF3D0', foreground: '#7A5C00' }, // Bebek & Çocuk
  12: { icon: 'pets', background: '#F1EAE2', foreground: '#6B4423' }, // Evcil Hayvan
};

/** Root categories added after the first seed have no fixed id, so they are matched by name. */
const NAMED_VISUALS: Record<string, CategoryVisual> = {
  'Camping & Caravan': { icon: 'local-fire-department', background: '#E4F2E4', foreground: '#2E6B2E' },
};

const FALLBACK_VISUAL: CategoryVisual = { icon: 'sell', background: '#EFE6F9', foreground: '#5A189A' };

export const getCategoryVisual = (categoryId: number | undefined, categories: Category[]): CategoryVisual => {
  let current = categories.find((c) => c.id === categoryId);
  for (let depth = 0; current?.parentCategoryId && depth < 5; depth++) {
    const parent = categories.find((c) => c.id === current!.parentCategoryId);
    if (!parent) break;
    current = parent;
  }
  return (
    ROOT_VISUALS[current?.id ?? categoryId ?? 0] ??
    (current ? NAMED_VISUALS[current.name] : undefined) ??
    FALLBACK_VISUAL
  );
};

// The category list is small and rarely changes: fetch it once and share it between cards.
let categoriesPromise: Promise<Category[]> | null = null;
let loaded: Category[] = [];

const loadCategories = (): Promise<Category[]> => {
  if (!categoriesPromise) {
    categoriesPromise = categoryAPI
      .getCategories()
      .then((list) => {
        loaded = list;
        return list;
      })
      .catch((error) => {
        categoriesPromise = null;
        throw error;
      });
  }
  return categoriesPromise;
};

/** All categories (flat list). Starts with what is already loaded so cards do not flicker. */
export const useCategories = (): Category[] => {
  const [categories, setCategories] = useState<Category[]>(loaded);
  useEffect(() => {
    let cancelled = false;
    loadCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        // Cards fall back to the neutral tile
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return categories;
};
