import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifestFilename: 'manifest.json',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'icon.png', 'apple-touch-icon-180x180.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'screenshot-desktop.png', 'screenshot-mobile.png', 'registerSW.js', 'sw.js'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB limit for precaching bundle
      },
      manifest: {
        name: 'SIM-PANLA | UPT SMP Negeri 8 Pasuruan',
        short_name: 'SIM-PANLA',
        description: 'Sistem Informasi Manajemen Presensi dan Jurnal UPT SMP Negeri 8 Pasuruan',
        theme_color: '#9333ea',
        background_color: '#F9F7FF',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: '/',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png'
          },
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: '/screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Tampilan Desktop Dashboard SIM-PANLA'
          },
          {
            src: '/screenshot-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Tampilan Mobile Presensi & Jurnal Guru'
          }
        ]
      }
    })
  ],
});
