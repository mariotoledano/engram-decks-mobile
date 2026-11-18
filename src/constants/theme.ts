/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E1A16',
    background: '#F4EFE6',
    backgroundElement: '#FFFBF5',
    backgroundSelected: '#E7E0D4',
    textSecondary: '#6F675F',
    accent: '#C4622D',
    accentPressed: '#9A4A20',
    onAccent: '#FFFBF5',
    moss: '#3E6B58',
    danger: '#9B3A32',
    line: '#D9D1C3',
  },
  dark: {
    text: '#F3EDE4',
    background: '#141210',
    backgroundElement: '#1E1B18',
    backgroundSelected: '#2A2622',
    textSecondary: '#B7AFA4',
    accent: '#E08A52',
    accentPressed: '#C4622D',
    onAccent: '#1E1A16',
    moss: '#7DAB96',
    danger: '#E07A72',
    line: '#3A342E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
