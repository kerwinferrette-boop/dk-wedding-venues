/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mediterranean Deco palette
        rose:       '#E8A798',
        'rose-dark':'#C4836F',
        gold:       '#C9A84C',
        'gold-light':'#E8D5A3',
        teal:       '#2A6B7C',
        'teal-light':'#5A9BAA',
        parchment:  '#F7F0E3',
        'parchment-2':'#EFE6D3',
        'parchment-3':'#E4D8C4',
        ink:        '#1C1208',
        // Status indicators (unchanged)
        'wos-green': '#5DBB8A',
        'wos-red':   '#E07070',
        'wos-yellow':'#D4A843',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        heading: ['Playfair Display', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        wos:    '16px',
        'wos-sm':'10px',
      },
    },
  },
  plugins: [],
}
