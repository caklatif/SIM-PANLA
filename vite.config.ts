import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.ico', 'icon.png', 'apple-touch-icon-180x180.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'SIM-PANLA UPT SMP Negeri 8 Pasuruan',
        short_name: 'SIM-PANLA',
        description: 'Sistem Informasi Manajemen Presensi dan Jurnal UPT SMP Negeri 8 Pasuruan',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '.',
        icons: [
          {
            src: '/pwa-192x192.png?v=2',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png?v=2',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png?v=2',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
