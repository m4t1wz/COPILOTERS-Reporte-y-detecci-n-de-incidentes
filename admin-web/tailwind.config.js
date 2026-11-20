/** @type {import('tailwindcss').Config} */
// Tokens de docs/tecnica/08. visual-design-system.md §10.1
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0475EF',
          dark: '#091B3B',
          soft: '#E2F9FE', // tinte al 15 % de #3CD6FC
          accent: '#3CD6FC',
        },
        surface: '#FFFFFF',
        base: '#F7F7F7',
        border: '#E8E5E5',
        typography: {
          main: '#252525',
          muted: '#777777',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        field: '6px',
        btn: '8px',
        card: '8px',
      },
      // Micro-interacciones permitidas (08 §6.2): modales <= 200 ms ease-out.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'modal-in': 'modal-in 200ms ease-out',
      },
      boxShadow: {
        // Solo modales y desplegables (08 §4.2).
        overlay: '0 8px 24px rgba(0, 0, 0, 0.12)',
        float: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
