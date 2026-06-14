/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#fbfaf8',
          100: '#f7f4f0',
          200: '#ede8e1',
          300: '#ded5ca',
          400: '#9c938a',
          500: '#7e756c',
          600: '#625b54',
          700: '#48423e',
          800: '#2c2a27',
          900: '#141312',
          950: '#0d0c0b',
        },
        indigo: {
          50: '#fdfbf7',
          100: '#faf3e8',
          200: '#f3e2ca',
          300: '#ebd1ac',
          400: '#dfcbb2',
          500: '#d2b792',
          600: '#c5a880', // Primary Accent (Champagne Gold)
          700: '#a68c67',
          800: '#866f50',
          900: '#584834',
          950: '#2b2419',
        },
        rose: {
          50: '#fbf7f6',
          100: '#f7edeb',
          200: '#edd1cc',
          300: '#e3b6ad',
          400: '#c97769', // Terracotta Red
          500: '#af5a4c',
          600: '#954235',
          700: '#753026',
          800: '#522019',
          950: '#2b100c',
        },
        emerald: {
          50: '#f7fbf8',
          100: '#edf7ef',
          200: '#d1ebd6',
          300: '#b5debce',
          400: '#7ca388', // Sage Green
          500: '#5d8268',
          600: '#43634e',
          700: '#2d4435',
          800: '#1d2c22',
          950: '#0e1510',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
