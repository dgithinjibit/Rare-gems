/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maasai: {
          red: '#FF0000',  // Vibe Jam Red
          blue: '#0000FF', // Vibe Jam Blue
          ochre: '#CC7722',
          white: '#F5F5DC',
        },
        earth: {
          brown: '#8B4513',
          dark: '#3D2914',
          light: '#6B4423',
        },
        savanna: {
          grass: '#228B22',
          sky: '#87CEEB',
          dusk: '#FF6B35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
