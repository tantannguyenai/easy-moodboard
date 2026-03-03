/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Geist Variable'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ["'Geist Mono Variable'", 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}