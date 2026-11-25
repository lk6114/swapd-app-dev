/** swap'd Corporate Design (README Abschnitt 5).
 *  Farben ersetzen bewusst die Tailwind-Standardpalette: nur CD-Farben verfügbar. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      pink: { DEFAULT: '#D13A6B', dark: '#F06A95', tint: '#FCE4EC' },
      green: { DEFAULT: '#2FB37A', dark: '#45CF92', tint: '#DDF5EA' },
      gold: { DEFAULT: '#FFC83D' },
      ink: { DEFAULT: '#1C1A2B', muted: '#5E5B70' },
      surface: { DEFAULT: '#FAFAF7' },
      line: { DEFAULT: '#E7E5DF' }, // dezente Trennlinien (neutral, aus Surface/Ink abgeleitet)
    },
    borderRadius: {
      none: '0',
      sm: '8px',
      DEFAULT: '8px',
      md: '16px',
      lg: '24px',
      full: '9999px',
    },
    fontFamily: {
      display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
    },
    extend: {
      boxShadow: {
        pop: '0 4px 0 #1C1A2B',
        'pop-sm': '0 2px 0 #1C1A2B',
      },
    },
  },
  plugins: [],
}
