/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bc: {
          primary: '#157382',
          'primary-dark': '#0e4f5a',
          'primary-light': '#1a8fa0',
          secondary: '#3BB1B9',
          'secondary-light': '#8FD3D9',
          bg: '#ffffff',
          'bg-subtle': '#f5f9fb',
          'bg-muted': '#ecf2f5',
          'bg-dark': '#e0eaed',
          border: '#d4e3e7',
          'border-hover': '#b5ccd3',
          text: '#1a2b3c',
          'text-secondary': '#3d5a6e',
          'text-muted': '#6b8a9a',
          'text-light': '#8fa8b5',
          'text-dark': '#0f1f2c',
          'text-accent': '#157382',
          destructive: '#dc2626',
        },
        surface: {
          0: '#ffffff',
          1: '#f5f9fb',
          2: '#ecf2f5',
          3: '#e0eaed',
          4: '#d4e3e7',
          5: '#b5ccd3',
        },
        accent: {
          DEFAULT: '#157382',
          light: '#1a8fa0',
          dark: '#0e4f5a',
        },
        secondary: {
          DEFAULT: '#3BB1B9',
          light: '#8FD3D9',
        },
        destructive: {
          DEFAULT: '#dc2626',
          light: '#fca5a5',
        },
        text: {
          primary: '#1a2b3c',
          secondary: '#3d5a6e',
          tertiary: '#6b8a9a',
          muted: '#8fa8b5',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
