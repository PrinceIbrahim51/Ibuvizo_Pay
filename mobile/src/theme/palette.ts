export type ThemeName = 'aurora' | 'light' | 'dark';

export type Palette = {
  name: ThemeName;
  /** Full-screen background gradient (top -> bottom). */
  background: readonly [string, string, ...string[]];
  /** Hero header gradient behind the title area. */
  hero: readonly [string, string, ...string[]];
  heroText: string;
  heroSubtext: string;
  card: string;
  cardBorder: string;
  cardStrong: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryGradient: readonly [string, string, ...string[]];
  sendGradient: readonly [string, string, ...string[]];
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  input: string;
  divider: string;
  tabBar: string;
  tabActiveBg: string;
  statusBar: 'light' | 'dark';
  blurTint: 'light' | 'dark';
};

const shared = {
  primary: '#2F5BFF',
  primaryGradient: ['#2563FF', '#5B4CF5', '#7C4DFF'] as const,
  sendGradient: ['#8B5CF6', '#5B6CFF', '#38BDF8'] as const,
  success: '#16A34A',
  danger: '#E11D48',
  warning: '#F59E0B',
};

export const palettes: Record<ThemeName, Palette> = {
  aurora: {
    ...shared,
    name: 'aurora',
    background: ['#3C4BE6', '#6C7BF7', '#C9D4FF', '#EEF1FF', '#F4F0FF'],
    hero: ['#3A3FD9', '#5B5BF0', '#3BB8EE'],
    heroText: '#FFFFFF',
    heroSubtext: 'rgba(255,255,255,0.82)',
    card: 'rgba(255,255,255,0.78)',
    cardBorder: 'rgba(255,255,255,0.9)',
    cardStrong: 'rgba(255,255,255,0.92)',
    text: '#0B1440',
    textMuted: '#5B6488',
    successBg: 'rgba(22,163,74,0.12)',
    dangerBg: 'rgba(225,29,72,0.10)',
    input: 'rgba(238,242,255,0.95)',
    divider: 'rgba(91,100,136,0.14)',
    tabBar: 'rgba(255,255,255,0.88)',
    tabActiveBg: 'rgba(47,91,255,0.12)',
    statusBar: 'light',
    blurTint: 'light',
  },
  light: {
    ...shared,
    name: 'light',
    background: ['#F5F7FF', '#EEF1FF', '#F7F5FF'],
    hero: ['#4F63F6', '#6F7DF8', '#5CC6F2'],
    heroText: '#FFFFFF',
    heroSubtext: 'rgba(255,255,255,0.85)',
    card: '#FFFFFF',
    cardBorder: '#E6E9F7',
    cardStrong: '#FFFFFF',
    text: '#0B1440',
    textMuted: '#5B6488',
    successBg: 'rgba(22,163,74,0.10)',
    dangerBg: 'rgba(225,29,72,0.08)',
    input: '#F1F4FF',
    divider: '#E6E9F7',
    tabBar: '#FFFFFF',
    tabActiveBg: 'rgba(47,91,255,0.10)',
    statusBar: 'light',
    blurTint: 'light',
  },
  dark: {
    ...shared,
    name: 'dark',
    primary: '#6E8BFF',
    background: ['#0B1030', '#111842', '#0E1433'],
    hero: ['#1E2A78', '#3A2F8F', '#0E5E86'],
    heroText: '#FFFFFF',
    heroSubtext: 'rgba(255,255,255,0.75)',
    card: 'rgba(30,38,84,0.78)',
    cardBorder: 'rgba(120,140,255,0.18)',
    cardStrong: 'rgba(36,45,98,0.95)',
    text: '#EEF1FF',
    textMuted: '#A5ADD6',
    successBg: 'rgba(34,197,94,0.16)',
    dangerBg: 'rgba(244,63,94,0.16)',
    input: 'rgba(20,27,66,0.9)',
    divider: 'rgba(165,173,214,0.16)',
    tabBar: 'rgba(17,24,66,0.95)',
    tabActiveBg: 'rgba(110,139,255,0.18)',
    statusBar: 'light',
    blurTint: 'dark',
  },
};

/** Tile gradients from the design (Send, Scan & Pay, Request, Bank Transfer, ...). */
export const tileGradients = {
  blue: ['#3B82F6', '#2563EB'] as const,
  purple: ['#8B5CF6', '#6D28D9'] as const,
  green: ['#34D399', '#10B981'] as const,
  orange: ['#FB923C', '#F97316'] as const,
  pink: ['#FB7185', '#E11D48'] as const,
  teal: ['#2DD4BF', '#0D9488'] as const,
  indigo: ['#818CF8', '#4F46E5'] as const,
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
