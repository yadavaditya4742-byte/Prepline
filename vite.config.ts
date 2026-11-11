import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Relative base so the same build works on GitHub Pages (sub-path), Cloudflare Pages (root)
// and inside the app-store wrappers (Capacitor).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // App-store builds (Capacitor) ship their files inside the app, so no service worker there.
      disable: process.env.VITE_STORE_BUILD === '1',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'privacy.html'],
      manifest: {
        id: './',
        name: 'Prepline: budget meal planner',
        short_name: 'Prepline',
        description: 'High-protein dinners for the week, priced at your store, with one grocery list that adds up.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#13322c',
        background_color: '#f6f3ec',
        categories: ['food', 'lifestyle', 'health'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Daily price files: try the network first, fall back to the last copy offline.
            urlPattern: ({ url }) => url.pathname.includes('/prices/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'prepline-prices', networkTimeoutSeconds: 4, expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})
