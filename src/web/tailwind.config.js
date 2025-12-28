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
          DEFAULT: '#7B2CBF',
          light: 'rgba(123, 44, 191, 0.1)',
          dark: '#5A189A',
        },
        secondary: {
          orange: '#F59E0B',
          orangeDark: '#D97706',
        },
        background: '#f8f9fa',
        surface: '#ffffff',
        text: {
          DEFAULT: '#1a1a1a',
          secondary: '#666666',
        },
        border: '#e9ecef',
        error: '#dc3545',
        success: '#1e7e34',
        warning: '#ffc107',
        info: '#17a2b8',
      },
    },
  },
  plugins: [],
}
