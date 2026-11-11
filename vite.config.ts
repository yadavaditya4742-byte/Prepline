import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base so the build works on GitHub Pages (sub-path) and Cloudflare Pages (root).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})
