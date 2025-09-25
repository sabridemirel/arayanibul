import React, { createContext, useContext, ReactNode } from 'react';
import { Theme } from '../types';
import theme from '../theme';

interface ThemeContextType {
  theme: Theme;
  colors: typeof theme.colors;
  spacing: typeof theme.spacing;
  typography: typeof theme.typography;
  borderRadius: typeof theme.borderRadius;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const value: ThemeContextType = {
    theme,
    colors: theme.colors,
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;