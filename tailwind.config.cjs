// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    { pattern: /(bg|text|border)-(green|yellow|red|blue|gray|brand)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /(w|h)-\d{1,3}/ },
    { pattern: /(px|py|p|m|mx|my)-\d{1,2}/ },
    { pattern: /bg-(slate|zinc|neutral|stone|brand)-(400|500|600)/ },
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:"#f7f7fb",100:"#f0f1f8",200:"#dfe1f0",300:"#c2c6e0",400:"#9aa1c9",
          500:"#6f77ad",600:"#515a90",700:"#3f4775",800:"#343a5f",900:"#2c3150",950:"#1b1e31",
        },
      },
      borderRadius: { xl2: "1rem", xl3: "1.25rem" },
      boxShadow: { soft: "0 12px 32px -12px rgba(0,0,0,0.25)" },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/line-clamp"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
