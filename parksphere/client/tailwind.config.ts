import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'park-green': '#10b981',
        'park-blue': '#3b82f6',
        'park-amber': '#f59e0b',
      },
      fontSize: {
        'kid': '18px',
      },
    },
  },
  plugins: [],
}
export default config