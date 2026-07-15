/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
      },
      colors: {
        app: '#FBFBFA',
        surface: '#FFFFFF',
        canvas: '#F4F4F2',
        ink: '#17181B',
        muted: '#74757A',
        hairline: '#ECECE9',
        hairline2: '#F1F1EE',
        accent: {
          DEFAULT: '#2F6BFF',
          hover: '#1E4FCC',
          soft: '#EAF0FF',
        },
        delivered: { text: '#0E6B54', bg: '#E4F3EE', pin: '#12896A' },
        failed: { text: '#C13236', bg: '#FCEBEB', pin: '#E5484D' },
        current: { text: '#B5730A', bg: '#FDF1DC', pin: '#F5A623' },
        skipped: { text: '#8A8B90', bg: '#F1F1EE', pin: '#B8BAC0' },
        pending: { text: '#74757A', bg: '#F1F3F6', pin: '#2F6BFF' },
        map: { base: '#E9EDF1', street: '#D6DDE5', park: '#DDE6DC', water: '#CDD9E5' },
      },
      boxShadow: {
        cta: '0 6px 16px -6px rgba(47,107,255,.5)',
        sheet: '0 -8px 40px -12px rgba(10,11,13,.25)',
      },
    },
  },
  plugins: [],
}
