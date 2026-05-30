export const colors = {
  // Brand
  primary: {
    400: '#facc15', // Gold accent
    500: '#eab308', // Primary gold
    600: '#ca8a04',
  },
  
  // Backgrounds
  dark: {
    900: '#0f172a', // Main slate bg
    950: '#020617', // Deep slate bg
  },
  
  // Text
  text: {
    primary: '#ffffff',
    secondary: '#94a3b8', // slate-400
    tertiary: '#64748b', // slate-500
  },
  
  // States
  success: '#10b981', // emerald-500
  error: '#ef4444', // red-500
  warning: '#f97316', // orange-500
  
  // UI Elements
  border: 'rgba(255, 255, 255, 0.05)',
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const typography = {
  fontFamily: {
    regular: 'System', // Will use Inter/San Francisco/Roboto
    bold: 'System',
    black: 'System',
  },
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  }
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  glowPrimary: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  }
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};

export default theme;
