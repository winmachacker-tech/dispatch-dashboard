/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        uskoBlue: '#0f172a',
        uskoAccent: '#1e3a8a',
        uskoGradient: 'linear-gradient(to-br, #0f172a, #1e3a8a)',
      },
    },
  },
  plugins: [],
};
