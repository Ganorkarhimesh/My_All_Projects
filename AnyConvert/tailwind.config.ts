import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563EB', // Google-blue CTA
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        ink: {
          900: '#1F1F1F',
          700: '#3C4043',
          500: '#5F6368',
          300: '#DADCE0',
          100: '#F1F3F4',
        },
      },
      fontFamily: {
        sans: [
          'Google Sans',
          'Roboto',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(60,64,67,0.08), 0 1px 3px 1px rgba(60,64,67,0.08)',
        cardHover: '0 1px 3px 0 rgba(60,64,67,0.12), 0 4px 8px 3px rgba(60,64,67,0.1)',
      },
      borderRadius: {
        xl2: '1rem',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        progressStripe: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 150ms ease-out',
        progressStripe: 'progressStripe 1s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
