/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#111827',
        surfaceHover: '#1f2937',
        border: '#1e293b',
        primary: {
          DEFAULT: '#38bdf8', // sky-400
          dark: '#0284c7',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        muted: '#94a3b8',
      },
    },
  },
  plugins: [],
};
