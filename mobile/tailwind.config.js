/** @type {import('tailwindcss').Config} */
// Screens are styled with the typed tokens in src/theme/tokens.ts.
// These values mirror them so any remaining utility classes stay on-brand.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F3F7F5',
        surface: '#FFFFFF',
        border: 'rgba(11,31,23,0.08)',
        ink: '#0B1F17',
        primary: { DEFAULT: '#10B981', dark: '#047857', deep: '#064E3B' },
        success: '#059669',
        danger: '#DC2626',
        warning: '#D97706',
        muted: '#7C8D85',
      },
      fontFamily: {
        sans: ['SpaceGrotesk_400Regular'],
        mono: ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
