/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          0: 'hsl(var(--surface-0))',
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
          4: 'hsl(var(--surface-4))',
          5: 'hsl(var(--surface-5))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          light: 'hsl(var(--accent-light))',
          dark: 'hsl(var(--accent-dark))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          light: 'hsl(var(--secondary-light))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          light: 'hsl(var(--destructive-light))',
        },
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
          muted: 'hsl(var(--text-muted))',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        glow: '0 0 20px hsl(var(--accent) / 0.15)',
        'glow-lg': '0 0 40px hsl(var(--accent) / 0.2)',
      },
    },
  },
  plugins: [],
};
