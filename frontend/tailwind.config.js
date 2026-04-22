/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1e293b',
        },
        background: {
          DEFAULT: '#f8fafc',
          dark: '#0f172a',
        },
        text: {
          DEFAULT: '#0f172a',
          muted: '#64748b',
        },
        border: {
          DEFAULT: '#e2e8f0',
          dark: '#334155',
        },
        secondary: {
          DEFAULT: '#64748b',
        }
      },

      borderRadius: {
        'xl': '12px',
      }
    },
  },
  plugins: [],
}
