/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        crimson: '#A51C30',
        'crimson-light': '#C9384F',
        forest: '#2D6A4F',
        'forest-light': '#52B788',
        cream: '#F5F0E8',
        'cream-2': '#EDE8DF',
        'cream-3': '#E0D9CE',
        card: '#F9F6F1',
        'wos-green': '#5DBB8A',
        'wos-red': '#E07070',
        'wos-yellow': '#D4A843',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        wos: '16px',
        'wos-sm': '10px',
      },
    },
  },
  plugins: [],
}
