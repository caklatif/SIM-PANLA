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
      includeAssets: [
        'favicon.ico', 
        'icon.png', 
        'apple-touch-icon-180x180.png', 
        'launchericon-48x48.png',
        'launchericon-72x72.png',
        'launchericon-96x96.png',
        'launchericon-144x144.png',
        'launchericon-192x192.png',
        'launchericon-512x512.png',
        'pwa-192x192.png', 
        'pwa-512x512.png', 
        'pwa-maskable-512x512.png', 
        'registerSW.js', 
        'sw.js'
      ],
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
            src: '/launchericon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/launchericon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/launchericon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/launchericon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
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
        ]
      }
    })
  ],
});
