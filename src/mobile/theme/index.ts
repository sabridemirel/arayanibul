import { Theme } from '../types';

export const theme: Theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e9ecef',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
    primaryLight: 'rgba(0, 123, 255, 0.1)',
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

// Color variants
export const colors = {
  ...theme.colors,
  // Status colors
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  
  // Social colors
  google: '#db4437',
  facebook: '#4267B2',
  
  // Urgency colors
  urgent: '#ff4757',
  normal: '#007bff',
  flexible: '#28a745',
  
  // Transparent variants
  primaryLight: 'rgba(0, 123, 255, 0.1)',
  successLight: 'rgba(40, 167, 69, 0.1)',
  errorLight: 'rgba(220, 53, 69, 0.1)',
  warningLight: 'rgba(255, 193, 7, 0.1)',
};

// Spacing helpers
export const spacing = theme.spacing;

// Typography helpers
export const typography = theme.typography;

// Border radius helpers
export const borderRadius = theme.borderRadius;

export default theme;