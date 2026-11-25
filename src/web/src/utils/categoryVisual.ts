import { useEffect, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import {
  ComputerDesktopIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  ShoppingBagIcon,
  TruckIcon,
  HeartIcon,
  BookOpenIcon,
  CakeIcon,
  BuildingOffice2Icon,
  GlobeEuropeAfricaIcon,
  PuzzlePieceIcon,
  FireIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import PawIcon from '../components/PawIcon';
import { categoryAPI } from '../services/api';
import type { Category } from '../services/api';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface CategoryVisual {
  Icon: IconComponent;
  /** Soft tint behind the icon */
  background: string;
  /** Icon / label colour, dark enough for text on the tint */
  foreground: string;
}

/** Keyed by root category id (seeded, stable: see backend SeedData). */
const ROOT_VISUALS: Record<number, CategoryVisual> = {
  1: { Icon: ComputerDesktopIcon, background: '#E6EEFB', foreground: '#1D4E9E' }, // Elektronik
  2: { Icon: HomeIcon, background: '#FBEFD9', foreground: '#8A5A00' }, // Ev & Yaşam
  3: { Icon: WrenchScrewdriverIcon, background: '#EFE6F9', foreground: '#5A189A' }, // Hizmetler
  4: { Icon: ShoppingBagIcon, background: '#FBE6EF', foreground: '#A11852' }, // Moda & Güzellik
  5: { Icon: TruckIcon, background: '#E8ECEF', foreground: '#37474F' }, // Otomotiv
  6: { Icon: HeartIcon, background: '#FBE8E6', foreground: '#A8261A' }, // Sağlık & Spor
  7: { Icon: BookOpenIcon, background: '#E3F1F3', foreground: '#0F5E6B' }, // Eğitim & Kitap
  8: { Icon: CakeIcon, background: '#FCEBDD', foreground: '#9A4A0B' }, // Yiyecek & İçecek
  9: { Icon: BuildingOffice2Icon, background: '#E5F2E8', foreground: '#1E6B34' }, // Emlak
  10: { Icon: GlobeEuropeAfricaIcon, background: '#E1F0FA', foreground: '#0B5A8A' }, // Seyahat & Turizm
  11: { Icon: PuzzlePieceIcon, background: '#FBF3D0', foreground: '#7A5C00' }, // Bebek & Çocuk
  12: { Icon: PawIcon, background: '#F1EAE2', foreground: '#6B4423' }, // Evcil Hayvan
};

/** Root categories added after the first seed have no fixed id, so they are matched by name. */
const NAMED_VISUALS: Record<string, CategoryVisual> = {
  'Camping & Caravan': { Icon: FireIcon, background: '#E4F2E4', foreground: '#2E6B2E' }, // Kamp & Karavan
};

const FALLBACK_VISUAL: CategoryVisual = {
  Icon: TagIcon,
  background: '#EFE6F9',
  foreground: '#5A189A',
};

/** Visual for a (sub)category: walks up to its root category. */
export const getCategoryVisual = (
  categoryId: number | undefined,
  categories: Category[]
): CategoryVisual => {
  let current = categories.find((c) => c.id === categoryId);
  // Guard against malformed parent chains
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

// The category list is small and rarely changes: fetch it once per page load and share it.
let categoriesPromise: Promise<Category[]> | null = null;

const loadCategories = (): Promise<Category[]> => {
  if (!categoriesPromise) {
    categoriesPromise = categoryAPI.getCategories().catch((error) => {
      categoriesPromise = null;
      throw error;
    });
  }
  return categoriesPromise;
};

/** All categories (flat list, roots and subcategories). Empty until loaded. */
export const useCategories = (): Category[] => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch((error) => console.error('Error fetching categories:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
};
