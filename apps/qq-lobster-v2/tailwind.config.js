/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        qq: {
          50: '#eef7ff',
          100: '#d9ecff',
          500: '#178bff',
          600: '#0572dd',
          700: '#0759ab',
        },
        lobster: {
          50: '#fff3ed',
          100: '#ffe0d1',
          400: '#ff8a61',
          500: '#f45c35',
          600: '#d93f25',
        },
        ink: {
          500: '#687385',
          700: '#273244',
          900: '#111827',
        },
      },
      boxShadow: {
        panel: '0 14px 34px rgba(20, 42, 70, 0.12)',
        lift: '0 12px 24px rgba(244, 92, 53, 0.22)',
      },
    },
  },
  plugins: [],
}
