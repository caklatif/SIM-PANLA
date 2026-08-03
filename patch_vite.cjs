const fs = require('fs');
const path = 'vite.config.ts';

const config = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'SIM-PANLA UPT SMP Negeri 8 Pasuruan',
        short_name: 'SIM-PANLA',
        description: 'Sistem Informasi Manajemen Presensi dan Jurnal UPT SMP Negeri 8 Pasuruan',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
`;

fs.writeFileSync(path, config, 'utf8');
console.log('Patched vite.config.ts');
