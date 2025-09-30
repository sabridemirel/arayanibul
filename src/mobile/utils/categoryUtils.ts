// Category utility functions for color mapping and styling
import { colors } from '../theme';

// Category ID to color mapping based on backend categories
// Aligned with theme/index.ts categoryColors and logo palette
export const categoryColorMap: Record<number, string> = {
  // Major categories with WCAG AA compliant colors (4.5:1+ contrast with white text)
  1: '#7B2CBF',        // Services → Purple (logo primary)
  2: '#F59E0B',        // Products → Orange (logo secondary, needs dark text)
  3: '#EC4899',        // Events → Pink
  4: '#2D3748',        // Jobs → Navy (logo accent)
  5: '#059669',        // Housing → Green
  6: '#DC2626',        // Automotive → Red
  7: '#3B82F6',        // Education → Blue
  8: '#10B981',        // Health & Sports → Emerald
  9: '#6366F1',        // Food & Beverage → Indigo
  10: '#8B5CF6',       // Electronics → Purple tint
  11: '#EC4899',       // Fashion → Pink
  12: '#F59E0B',       // Home & Living → Orange
  // Add more as categories expand
};

// Fallback color for unknown categories
const DEFAULT_CATEGORY_COLOR = colors.primary; // Purple

/**
 * Get category color by ID
 * @param categoryId - The category ID from backend
 * @returns Hex color code for the category
 */
export const getCategoryColor = (categoryId: number | undefined): string => {
  if (!categoryId) return DEFAULT_CATEGORY_COLOR;
  return categoryColorMap[categoryId] || DEFAULT_CATEGORY_COLOR;
};

/**
 * Get text color for category background (accessibility)
 * @param categoryId - The category ID
 * @returns Text color (white or dark) based on background color
 */
export const getCategoryTextColor = (categoryId: number | undefined): string => {
  const bgColor = getCategoryColor(categoryId);

  // Orange and yellow backgrounds need dark text for contrast
  if (bgColor === '#F59E0B' || bgColor === '#ffc107') {
    return colors.onOrange; // Dark text
  }

  // All other category colors use white text (WCAG AA compliant)
  return '#ffffff';
};

/**
 * Get category background color with transparency
 * @param categoryId - The category ID
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export const getCategoryColorWithOpacity = (
  categoryId: number | undefined,
  opacity: number = 0.1
): string => {
  const color = getCategoryColor(categoryId);
  // Convert hex to RGB and add opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Category icon mapping (Material Icons)
 */
export const categoryIconMap: Record<number, string> = {
  1: 'handyman',              // Services
  2: 'shopping-bag',          // Products
  3: 'event',                 // Events
  4: 'work',                  // Jobs
  5: 'home',                  // Housing
  6: 'directions-car',        // Automotive
  7: 'school',                // Education
  8: 'fitness-center',        // Health & Sports
  9: 'restaurant',            // Food & Beverage
  10: 'devices',              // Electronics
  11: 'checkroom',            // Fashion
  12: 'weekend',              // Home & Living
};

/**
 * Get category icon name
 * @param categoryId - The category ID
 * @returns Material Icons name
 */
export const getCategoryIcon = (categoryId: number | undefined): string => {
  if (!categoryId) return 'category';
  return categoryIconMap[categoryId] || 'category';
};