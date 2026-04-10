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
          'bg': '#ffffff',
          'bg-subtle': '#f7fafb',
          'bg-muted': '#edf3f5',
          'border': '#d4e3e7',
          'border-hover': '#b5ccd3',
          'text': '#157382',
          'text-secondary': '#4a8d98',
          'text-muted': '#7fb3bb',
          'text-dark': '#0a3d45',
          'destructive': '#dc2626',
        },
        surface: {
          0: '#ffffff',
          1: '#f7fafb',
          2: '#edf3f5',
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
          primary: '#0a3d45',
          secondary: '#4a8d98',
          tertiary: '#7fb3bb',
          muted: '#a3cdd4',
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
