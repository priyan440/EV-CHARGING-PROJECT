/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB", // Royal Blue
        secondary: "#0EA5E9", // Sky Blue
        cyberBg: "#F8FAFC", // Clean Light Blue Slate
        accent: "#3B82F6", // Vibrant Blue
      },
      fontFamily: {
        sans: ['Sora', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(37, 99, 235, 0.1)',
        blue: '0 0 20px rgba(37, 99, 235, 0.3)',
      }
    },
  },
  plugins: [],
}
