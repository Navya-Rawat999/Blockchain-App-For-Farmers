/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        futuristic: {
          primary: '#6366f1',
          secondary: '#22d3ee',
          accent: '#a78bfa',
          neutral: '#0b1020',
          'base-100': '#0a0d1a',
          info: '#60a5fa',
          success: '#34d399',
          warning: '#f59e0b',
          error: '#f43f5e',
        },
      },
      'dark',
    ],
    darkTheme: 'futuristic',
  },
}

