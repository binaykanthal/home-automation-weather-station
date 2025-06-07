/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',        // ← enable manual dark mode
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#1f2937',  // gray‑800
          card: '#111827',     // gray‑900
        },
        accent: '#8b5cf6',     // violet‑500
      },
      chartbg: '#16213e',
    }
  },
  plugins: [],
}
