/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0c0f14',
        panel: '#11151c',
        'panel-2': '#161b24',
        border: '#212835',
        text: '#cfd6e0',
        muted: '#8590a0',
        accent: {
          blue: '#3a8eff',
          green: '#34c98a',
          orange: '#f0a030',
          red: '#ef4d4d',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
