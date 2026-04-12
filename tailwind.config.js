/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        caixa: {
          bg: '#0a0a0a',
          card: '#141414',
          border: '#1f1f1f',
          green: '#2D6A4F',
          red: '#E76F51',
          blue: '#457B9D',
          accent: '#40916C',
          text: '#e5e5e5',
          muted: '#737373',
        },
      },
    },
  },
  plugins: [],
};
