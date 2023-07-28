import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  daisyui: {
    themes: ['cmyk'],
  },
  plugins: [require('daisyui')],
} satisfies Config;
