/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#080A12',
        surface: '#10131F',
        'surface-secondary': '#161A29',
        border: '#252A3A',
        prism: {
          purple: '#8B5CF6',
          'purple-bright': '#A78BFA',
          'purple-dark': '#6D28D9',
          'purple-glow': 'rgba(139, 92, 246, 0.15)',
        },
        risk: {
          safe: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          critical: '#DC2626',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan': 'scanline 8s linear infinite',
      }
    },
  },
  plugins: [],
}
