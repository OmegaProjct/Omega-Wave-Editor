/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        omega: {
          dark: '#1a1d21',
          panel: '#282b30',
          border: '#3b3e45',
          accent: '#0078d7',
          text: '#d1d5db',
          textHover: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}