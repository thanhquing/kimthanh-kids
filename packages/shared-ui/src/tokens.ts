/**
 * Shared design tokens — single source of truth for colors, spacing, radii.
 * Web (Tailwind) and Native (NativeWind) both derive their themes from here.
 */
export const colors = {
  brand: {
    50: '#FFF7F0',
    100: '#FFE9D5',
    200: '#FFCCA1',
    300: '#FFA866',
    400: '#FF8A33',
    500: '#FF6F0A',
    600: '#E25A00',
    700: '#B34500',
    800: '#823200',
    900: '#522000',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
  },
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, "Helvetica Neue", sans-serif',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const;

export type ColorToken = keyof typeof colors;
