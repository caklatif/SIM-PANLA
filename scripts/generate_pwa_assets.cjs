const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAssets() {
  console.log('Generating PWA icons and screenshots...');

  // 1. Base Icon SVG (512x512)
  const iconSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#7e22ce" />
      </linearGradient>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f3e8ff" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#3b0764" flood-opacity="0.35" />
      </filter>
    </defs>

    <!-- Background Card -->
    <rect width="512" height="512" rx="110" fill="url(#bgGrad)" />

    <!-- Outer Decorative Ring -->
    <circle cx="256" cy="256" r="210" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="8" />

    <!-- Central Emblem / Shield -->
    <g filter="url(#shadow)">
      <!-- Book / Journal Icon -->
      <path d="M 160 170 Q 256 140 352 170 L 352 350 Q 256 320 160 350 Z" fill="url(#shieldGrad)" />
      <path d="M 256 152 L 256 332" stroke="#7e22ce" stroke-width="8" stroke-linecap="round" />

      <!-- Graduation Cap / Crest -->
      <path d="M 256 110 L 330 145 L 256 180 L 182 145 Z" fill="#facc15" />
      <path d="M 315 152 L 315 185 Q 315 200 256 200 Q 197 200 197 185 L 197 152" fill="none" stroke="#eab308" stroke-width="6" />

      <!-- Badge Text -->
      <text x="256" y="270" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="900" font-size="34" fill="#6b21a8" letter-spacing="2">SMPN 8</text>
      <text x="256" y="305" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="800" font-size="22" fill="#9333ea" letter-spacing="3">PASURUAN</text>
    </g>

    <!-- Bottom App Title Pill -->
    <rect x="116" y="380" width="280" height="64" rx="32" fill="#ffffff" />
    <text x="256" y="423" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="900" font-size="30" fill="#7e22ce" letter-spacing="1">SIM-PANLA</text>
  </svg>
  `;

  // 2. Maskable Icon SVG (512x512 with safe area margin)
  const maskableSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#7e22ce" />
      </linearGradient>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f3e8ff" />
      </linearGradient>
    </defs>

    <!-- Full Bleed Background for Maskable -->
    <rect width="512" height="512" fill="url(#bgGrad)" />

    <!-- Safe Zone Content (scaled to 80% around center 256,256) -->
    <g transform="translate(51.2, 51.2) scale(0.8)">
      <!-- Book / Journal Icon -->
      <path d="M 160 170 Q 256 140 352 170 L 352 350 Q 256 320 160 350 Z" fill="url(#shieldGrad)" />
      <path d="M 256 152 L 256 332" stroke="#7e22ce" stroke-width="8" stroke-linecap="round" />

      <!-- Graduation Cap / Crest -->
      <path d="M 256 110 L 330 145 L 256 180 L 182 145 Z" fill="#facc15" />

      <!-- Badge Text -->
      <text x="256" y="270" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="900" font-size="34" fill="#6b21a8" letter-spacing="2">SMPN 8</text>
      <text x="256" y="305" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="800" font-size="22" fill="#9333ea" letter-spacing="3">PASURUAN</text>

      <!-- Bottom App Title Pill -->
      <rect x="116" y="375" width="280" height="64" rx="32" fill="#ffffff" />
      <text x="256" y="418" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-weight="900" font-size="30" fill="#7e22ce" letter-spacing="1">SIM-PANLA</text>
    </g>
  </svg>
  `;

  // 3. Desktop Screenshot SVG (1280x720)
  const desktopScreenshotSvg = `
  <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <rect width="1280" height="720" fill="#f8fafc" />
    
    <!-- Top Header Bar -->
    <rect width="1280" height="64" fill="#7e22ce" />
    <circle cx="40" cy="32" r="18" fill="#ffffff" />
    <text x="40" y="38" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="14" fill="#7e22ce">8</text>
    <text x="72" y="39" font-family="sans-serif" font-weight="bold" font-size="20" fill="#ffffff">SIM-PANLA | UPT SMP Negeri 8 Pasuruan</text>
    <rect x="1100" y="18" width="140" height="28" rx="14" fill="#9333ea" />
    <text x="1170" y="37" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="12" fill="#ffffff">Guru Portal</text>

    <!-- Sidebar -->
    <rect x="0" y="64" width="240" height="656" fill="#ffffff" />
    <rect x="16" y="88" width="208" height="40" rx="8" fill="#f3e8ff" />
    <text x="32" y="113" font-family="sans-serif" font-weight="bold" font-size="14" fill="#7e22ce">📊 Dashboard Utama</text>
    <text x="32" y="160" font-family="sans-serif" font-weight="500" font-size="14" fill="#64748b">📝 Jurnal Mengajar</text>
    <text x="32" y="200" font-family="sans-serif" font-weight="500" font-size="14" fill="#64748b">✅ Presensi Siswa</text>
    <text x="32" y="240" font-family="sans-serif" font-weight="500" font-size="14" fill="#64748b">📈 Laporan Rekapitulasi</text>

    <!-- Main Body Area -->
    <!-- Welcome Card -->
    <rect x="272" y="88" width="976" height="120" rx="16" fill="url(#bgGrad)" />
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#9333ea" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>
    </defs>
    <text x="304" y="132" font-family="sans-serif" font-weight="bold" font-size="24" fill="#ffffff">Selamat Datang di SIM-PANLA</text>
    <text x="304" y="164" font-family="sans-serif" font-size="15" fill="#e9d5ff">Sistem Presensi &amp; Jurnal Pembelajaran Terpadu UPT SMP Negeri 8 Pasuruan</text>
    
    <!-- Stat Cards Row -->
    <!-- Card 1 -->
    <rect x="272" y="232" width="300" height="110" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="296" y="264" font-family="sans-serif" font-size="13" fill="#64748b">Total Jurnal Bulan Ini</text>
    <text x="296" y="304" font-family="sans-serif" font-weight="bold" font-size="32" fill="#0f172a">24 Entri</text>

    <!-- Card 2 -->
    <rect x="596" y="232" width="300" height="110" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="620" y="264" font-family="sans-serif" font-size="13" fill="#64748b">Kehadiran Kelas</text>
    <text x="620" y="304" font-family="sans-serif" font-weight="bold" font-size="32" fill="#16a34a">98.5%</text>

    <!-- Card 3 -->
    <rect x="920" y="232" width="328" height="110" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="944" y="264" font-family="sans-serif" font-size="13" fill="#64748b">Status PWA Mobile</text>
    <text x="944" y="304" font-family="sans-serif" font-weight="bold" font-size="24" fill="#9333ea">Standalone Ready</text>

    <!-- Content Table / Logs Mockup -->
    <rect x="272" y="366" width="976" height="320" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="304" y="404" font-family="sans-serif" font-weight="bold" font-size="18" fill="#1e293b">Aktivitas &amp; Jurnal Mengajar Terakhir</text>
    
    <rect x="304" y="428" width="912" height="40" rx="6" fill="#f8fafc" />
    <text x="320" y="453" font-family="sans-serif" font-weight="600" font-size="13" fill="#475569">Kelas VII-A • IPA • Pokok Bahasan: Ekosistem &amp; Lingkungan</text>
    
    <rect x="304" y="480" width="912" height="40" rx="6" fill="#f8fafc" />
    <text x="320" y="505" font-family="sans-serif" font-weight="600" font-size="13" fill="#475569">Kelas VIII-B • Matematika • Pokok Bahasan: Teorema Pythagoras</text>
    
    <rect x="304" y="532" width="912" height="40" rx="6" fill="#f8fafc" />
    <text x="320" y="557" font-family="sans-serif" font-weight="600" font-size="13" fill="#475569">Kelas IX-C • Bahasa Indonesia • Pokok Bahasan: Teks Laporan Percobaan</text>
  </svg>
  `;

  // 4. Mobile Screenshot SVG (750x1334)
  const mobileScreenshotSvg = `
  <svg width="750" height="1334" viewBox="0 0 750 1334" xmlns="http://www.w3.org/2000/svg">
    <rect width="750" height="1334" fill="#f8fafc" />
    
    <!-- Top Mobile Header -->
    <rect width="750" height="140" fill="#7e22ce" />
    <circle cx="60" cy="70" r="28" fill="#ffffff" />
    <text x="60" y="78" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20" fill="#7e22ce">8</text>
    <text x="108" y="65" font-family="sans-serif" font-weight="bold" font-size="28" fill="#ffffff">SIM-PANLA</text>
    <text x="108" y="95" font-family="sans-serif" font-size="18" fill="#e9d5ff">UPT SMP Negeri 8 Pasuruan</text>

    <!-- Welcome Card -->
    <rect x="32" y="168" width="686" height="200" rx="24" fill="#9333ea" />
    <text x="64" y="230" font-family="sans-serif" font-weight="bold" font-size="32" fill="#ffffff">Portal Guru &amp; Presensi</text>
    <text x="64" y="275" font-family="sans-serif" font-size="22" fill="#f3e8ff">Kelola jurnal pembelajaran &amp; presensi kelas secara praktis langsung dari HP.</text>
    
    <!-- Action Grid -->
    <rect x="32" y="400" width="326" height="220" rx="20" fill="#ffffff" stroke="#e2e8f0" />
    <circle cx="96" cy="464" r="32" fill="#f3e8ff" />
    <text x="96" y="474" text-anchor="middle" font-size="28">📝</text>
    <text x="64" y="540" font-family="sans-serif" font-weight="bold" font-size="24" fill="#1e293b">Isi Jurnal</text>
    <text x="64" y="575" font-family="sans-serif" font-size="18" fill="#64748b">Input KBM Hari Ini</text>

    <rect x="392" y="400" width="326" height="220" rx="20" fill="#ffffff" stroke="#e2e8f0" />
    <circle cx="456" cy="464" r="32" fill="#dcfce7" />
    <text x="456" y="474" text-anchor="middle" font-size="28">✅</text>
    <text x="424" y="540" font-family="sans-serif" font-weight="bold" font-size="24" fill="#1e293b">Presensi</text>
    <text x="424" y="575" font-family="sans-serif" font-size="18" fill="#64748b">Cek Kehadiran Siswa</text>

    <!-- Recent History List -->
    <rect x="32" y="650" width="686" height="620" rx="24" fill="#ffffff" stroke="#e2e8f0" />
    <text x="64" y="710" font-family="sans-serif" font-weight="bold" font-size="28" fill="#0f172a">Jurnal Terbaru</text>

    <rect x="64" y="740" width="622" height="130" rx="16" fill="#f8fafc" />
    <text x="96" y="790" font-family="sans-serif" font-weight="bold" font-size="22" fill="#7e22ce">Kelas VII-A • IPA</text>
    <text x="96" y="830" font-family="sans-serif" font-size="18" fill="#475569">Materi: Ekosistem &amp; Lingkungan</text>

    <rect x="64" y="890" width="622" height="130" rx="16" fill="#f8fafc" />
    <text x="96" y="940" font-family="sans-serif" font-weight="bold" font-size="22" fill="#7e22ce">Kelas VIII-B • Matematika</text>
    <text x="96" y="980" font-family="sans-serif" font-size="18" fill="#475569">Materi: Teorema Pythagoras</text>

    <rect x="64" y="1040" width="622" height="130" rx="16" fill="#f8fafc" />
    <text x="96" y="1090" font-family="sans-serif" font-weight="bold" font-size="22" fill="#7e22ce">Kelas IX-C • Bahasa Indonesia</text>
    <text x="96" y="1130" font-family="sans-serif" font-size="18" fill="#475569">Materi: Teks Laporan Percobaan</text>
  </svg>
  `;

  const publicDir = path.join(__dirname, '..', 'public');

  // Save SVGs
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), iconSvg);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), iconSvg);

  // Render PNGs via Sharp
  await sharp(Buffer.from(iconSvg)).resize(192, 192).toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png (192x192 PNG)');

  await sharp(Buffer.from(iconSvg)).resize(512, 512).toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png (512x512 PNG)');

  await sharp(Buffer.from(iconSvg)).resize(512, 512).toFile(path.join(publicDir, 'icon.png'));
  console.log('✓ Created icon.png (512x512 PNG)');

  await sharp(Buffer.from(iconSvg)).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon-180x180.png'));
  console.log('✓ Created apple-touch-icon-180x180.png (180x180 PNG)');

  await sharp(Buffer.from(maskableSvg)).resize(512, 512).toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png (512x512 Maskable PNG)');

  await sharp(Buffer.from(desktopScreenshotSvg)).resize(1280, 720).toFile(path.join(publicDir, 'screenshot-desktop.png'));
  console.log('✓ Created screenshot-desktop.png (1280x720 PNG)');

  await sharp(Buffer.from(mobileScreenshotSvg)).resize(750, 1334).toFile(path.join(publicDir, 'screenshot-mobile.png'));
  console.log('✓ Created screenshot-mobile.png (750x1334 PNG)');

  console.log('All PWA assets generated successfully!');
}

generateAssets().catch(err => {
  console.error('Failed generating PWA assets:', err);
  process.exit(1);
});
