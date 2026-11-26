/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cinzel"', '"Rajdhani"', 'Georgia', 'serif'],
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
        mono: ['"Rajdhani"', '"Outfit"', 'sans-serif'],
      },
      colors: {
        starlight: {
          950: '#070913',
          900: '#0c1024',
          800: '#151c3b',
          700: '#212c59',
          gold: '#f5c84c',
          cyan: '#38e8ff',
          violet: '#a855f7',
          crimson: '#ef4444',
          emerald: '#10b981',
        },
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1) translateY(0px)' },
          '50%': { transform: 'scale(1.018) translateY(-4px)' },
        },
        cutinSlide: {
          '0%': { transform: 'translateX(-110%) skewX(-12deg)', opacity: '0' },
          '15%': { transform: 'translateX(0%) skewX(-12deg)', opacity: '1' },
          '85%': { transform: 'translateX(2%) skewX(-12deg)', opacity: '1' },
          '100%': { transform: 'translateX(115%) skewX(-12deg)', opacity: '0' },
        },
        prismPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 18px rgba(56,232,255,0.65))' },
          '50%': { filter: 'drop-shadow(0 0 38px rgba(245,200,76,0.95))' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'float-slow': 'floatSlow 4.5s ease-in-out infinite',
        breathe: 'breathe 4.2s ease-in-out infinite',
        'cutin-slide': 'cutinSlide 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'prism-pulse': 'prismPulse 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.8s linear infinite',
      },
    },
  },
  plugins: [],
};
