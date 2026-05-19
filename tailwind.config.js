/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flux: {
          accent: 'var(--flux-accent)',
          'accent-dim': 'var(--flux-accent-dim)',
          bg: 'var(--flux-bg)',
          card: 'var(--flux-card)',
          soft: 'var(--flux-soft)',
          border: 'var(--flux-border)',
          'border-strong': 'var(--flux-border-strong)',
          'text-primary': 'var(--flux-text-primary)',
          'text-secondary': 'var(--flux-text-secondary)',
          'text-tertiary': 'var(--flux-text-tertiary)',
          danger: 'var(--flux-danger)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'flux-card': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'flux-soft': '0 4px 20px rgba(0, 0, 0, 0.03)',
        'flux-nav': '0 -4px 30px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
