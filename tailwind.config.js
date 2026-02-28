/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00D4AA',
        dark: {
          primary: '#050508',
          secondary: '#0f0f14',
          card: '#141e1e',
        }
      }
    },
  },
  plugins: [],
}
