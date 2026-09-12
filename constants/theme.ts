import { Platform } from 'react-native';

export const SparkTheme = {
  // Backgrounds
  bg: '#060010',          // Deep cosmic void
  bgAlt: '#090218',       // Secondary cosmic background
  surface: '#0e051f',     // Elevated card background
  surfaceStrong: '#14082c', // High contrast surface
  card: '#13082a',        // Inner card base
  cardBorder: 'rgba(139, 92, 246, 0.28)',
  
  // Cyber Card tokens
  cyberBorder: '#8b5cf6', // Electric violet border
  cyberBorderGlow: 'rgba(192, 132, 252, 0.5)',
  cyberOffset: '#7c3aed', // Offset purple drop shadow
  cyberTab: '#ede9fe',    // Glowing tab pill
  cyberTabGlow: 'rgba(232, 121, 249, 0.85)',
  
  // Primary brand & accent colors
  primary: '#7c3aed',     // Royal electric purple
  primaryLight: '#9333ea',// Neon purple
  accent: '#a855f7',      // Bright purple
  lavender: '#c084fc',    // Neon lavender
  fuchsia: '#e879f9',     // Radiant neon fuchsia
  
  // Status colors
  emerald: '#34d399',     // Check-in verified green
  emeraldBg: 'rgba(16, 185, 129, 0.15)',
  emeraldBorder: 'rgba(52, 211, 153, 0.4)',
  
  rose: '#f43f5e',        // Alert / error red
  roseBg: 'rgba(244, 63, 94, 0.15)',
  roseBorder: 'rgba(244, 63, 94, 0.4)',
  
  cyan: '#38bdf8',        // Total / highlight blue
  cyanBg: 'rgba(56, 189, 248, 0.15)',
  cyanBorder: 'rgba(56, 189, 248, 0.4)',
  
  // Text colors
  text: '#ede9fe',        // Off-white primary text
  textSecondary: '#c4b5fd', // Soft lavender text
  textMuted: '#7c6f96',    // Muted purple text
  textDim: '#5b5075',      // Very dim placeholder text
  
  // Input tokens
  inputBg: '#13082a',
  inputBorder: 'rgba(139, 92, 246, 0.32)',
  inputBorderFocus: '#c084fc',
  
  // Gradients
  gradients: {
    primary: ['#7c3aed', '#a855f7'] as [string, string],
    radiant: ['#9333ea', '#7c3aed', '#4f46e5'] as [string, string, string],
    fuchsia: ['#e879f9', '#c084fc', '#a855f7'] as [string, string, string],
    cyberInner: ['#090218', '#050010'] as [string, string],
    cardGlass: ['rgba(124, 58, 237, 0.16)', 'rgba(20, 5, 45, 0.85)'] as [string, string],
    emerald: ['#059669', '#10b981'] as [string, string],
    laser: ['#e879f9', '#c084fc', '#38bdf8'] as [string, string, string],
  }
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#7c3aed',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#7c3aed',
  },
  dark: {
    text: '#ede9fe',
    background: '#060010',
    tint: '#a855f7',
    icon: '#c4b5fd',
    tabIconDefault: '#7c6f96',
    tabIconSelected: '#e879f9',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, 'Space Grotesk', system-ui, sans-serif",
    serif: "Copernicus, Literata, Lora, Georgia, serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Consolas, monospace",
  },
});
