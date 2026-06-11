/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep navy "midnight" surface scale — the app is dark-only
        midnight: {
          950: '#060a13',
          900: '#0a1120',
          850: '#0d1526',
          800: '#111b30',
          700: '#1a2742',
          600: '#253556',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(0 0 0 / 0.35), 0 0 0 1px rgb(255 255 255 / 0.02)',
        'card-hover': '0 8px 24px -8px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(255 255 255 / 0.04)',
        'glow': '0 0 24px -6px rgb(16 185 129 / 0.45)',
        'glow-blue': '0 0 24px -6px rgb(59 130 246 / 0.45)',
      },
    },
  },
  plugins: [],
}
