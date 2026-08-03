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
      includeAssets: ['icon.png'],
      manifest: {
        name: 'SIM-PANLA UPT SMP Negeri 8 Pasuruan',
        short_name: 'SIM-PANLA',
        description: 'Sistem Informasi Manajemen Presensi dan Jurnal UPT SMP Negeri 8 Pasuruan',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png',
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
