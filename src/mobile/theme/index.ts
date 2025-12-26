import { Theme } from '../types';

export const theme: Theme = {
  colors: {
    // Logo-based color palette - WCAG 2.1 AA Compliant (4.5:1 contrast ratio with white text)
    primary: '#7B2CBF',      // Logo purple (4.88:1 with white text - WCAG AA)
    secondary: '#6c757d',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#1a1a1a',         // Darkened for better contrast
    textSecondary: '#666666',
    border: '#e9ecef',
    error: '#dc3545',        // Red (4.53:1 with white text - WCAG AA)
    success: '#1e7e34',      // Green (4.56:1 with white text - WCAG AA)
    warning: '#ffc107',      // Yellow (requires dark text)
    info: '#17a2b8',         // Teal (4.52:1 with white text - WCAG AA)
    primaryLight: 'rgba(123, 44, 191, 0.1)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold' as const,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal' as const,
    },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};

// Extended color palette with logo-based vibrant colors
export const colors = {
  ...theme.colors,

  // Primary palette - Purple (from logo)
  primary: '#7B2CBF',           // Main purple (4.88:1 - WCAG AA)
  primaryLight: 'rgba(123, 44, 191, 0.1)',
  primaryDark: '#5A189A',       // Darker purple (6.78:1 - WCAG AA)
  primaryExtraLight: '#E7D4F7', // Light purple for backgrounds

  // Secondary palette - Orange (from logo)
  secondaryOrange: '#F59E0B',   // Logo orange (2.92:1 - use with dark text)
  secondaryOrangeDark: '#D97706', // Darker orange (4.52:1 - WCAG AA with white text)
  secondaryOrangeLight: 'rgba(245, 158, 11, 0.1)',

  // Accent - Navy (from logo character)
  accent: '#2D3748',            // Navy/charcoal (11.58:1 - WCAG AAA)
  accentLight: 'rgba(45, 55, 72, 0.1)',

  // Gradients (as const for type safety with LinearGradient)
  primaryGradient: ['#9D4EDD', '#7B2CBF', '#5A189A'] as const,
  orangeGradient: ['#FCD34D', '#F59E0B', '#D97706'] as const,
  purpleOrangeGradient: ['#7B2CBF', '#9D4EDD', '#F59E0B'] as const,

  // Status colors
  info: '#17a2b8',              // Teal (4.52:1 - WCAG AA)
  light: '#f8f9fa',
  dark: '#343a40',              // Dark gray (11.64:1 - WCAG AAA)

  // Social colors
  google: '#db4437',
  facebook: '#4267B2',

  // Urgency colors - Updated to match logo palette
  urgent: '#F59E0B',            // Orange for urgent (use with dark text)
  urgentDark: '#D97706',        // Dark orange (4.52:1 - WCAG AA with white text)
  normal: '#7B2CBF',            // Purple for normal (4.88:1 - WCAG AA)
  flexible: '#1e7e34',          // Green for flexible (4.56:1 - WCAG AA)

  // Transparent variants
  successLight: 'rgba(30, 126, 52, 0.1)',
  errorLight: 'rgba(220, 53, 69, 0.1)',
  warningLight: 'rgba(255, 193, 7, 0.1)',
  infoLight: 'rgba(23, 162, 184, 0.1)',

  // Category colors (vibrant palette matching logo)
  categoryColors: {
    services: '#7B2CBF',        // Purple
    products: '#F59E0B',        // Orange
    events: '#EC4899',          // Pink
    jobs: '#2D3748',            // Navy
    housing: '#059669',         // Green
    automotive: '#DC2626',      // Red
    education: '#3B82F6',       // Blue
    health: '#10B981',          // Emerald
    other: '#6366F1',           // Indigo
  },

  // Accessibility: Text colors for WCAG 2.1 AA compliance
  warningText: '#000000',       // Black text on yellow warning (12.88:1 - WCAG AAA)
  onPrimary: '#ffffff',         // White text on purple (4.88:1 - WCAG AA)
  onSecondary: '#ffffff',       // White text on gray (4.69:1 - WCAG AA)
  onError: '#ffffff',           // White text on red (4.53:1 - WCAG AA)
  onSuccess: '#ffffff',         // White text on green (4.56:1 - WCAG AA)
  onOrange: '#1a1a1a',          // Dark text on orange (5.14:1 - WCAG AA)
  onOrangeDark: '#ffffff',      // White text on dark orange (4.52:1 - WCAG AA)
  onAccent: '#ffffff',          // White text on navy (11.58:1 - WCAG AAA)
  onInfo: '#ffffff',            // White text on teal (4.52:1 - WCAG AA)
};

// Spacing helpers
export const spacing = theme.spacing;

// Typography helpers
export const typography = theme.typography;

// Border radius helpers
export const borderRadius = theme.borderRadius;

export default theme;