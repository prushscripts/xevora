/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: '#03060D',
        surface: '#060B14',
        card: '#0A1628',
        primary: '#2563EB',
        bright: '#3B82F6',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: '#F1F5FF',
        muted: '#4E6D92',
      },
      fontFamily: {
        mono: ['JetBrainsMono_400Regular'],
        heading: ['PlusJakartaSans_800ExtraBold'],
        body: ['PlusJakartaSans_400Regular'],
        'body-medium': ['PlusJakartaSans_500Medium'],
      },
    },
  },
  plugins: [],
}
