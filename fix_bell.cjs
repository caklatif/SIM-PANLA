const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const playOscOld = `        if (type === "success") {
          // Suara nyaring seperti lonceng (Clear Bell/Chime)
          osc.type = "sine";
          // Frekuensi tinggi dan jernih (Nada G6)
          osc.frequency.setValueAtTime(1567.98, now); 
          
          // Envelope lonceng: Pukulan keras di awal, bergema perlahan di akhir
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(1.0, now + 0.02); // Attack (pukulan lonceng)
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8); // Decay (gema lonceng)
          
          osc.start(now);
          osc.stop(now + 0.8);
        } else if (type === "warning") {`;

const playOscNew = `        if (type === "success") {
          // Suara kompleks seperti lonceng asli (FM Synthesis sederhana)
          // Oscillator utama (Fundamental)
          osc.type = "sine";
          osc.frequency.setValueAtTime(1046.50, now); // C6
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(1.0, now + 0.02); 
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2); 
          osc.start(now);
          osc.stop(now + 1.2);

          // Oscillator kedua (Harmonic 1 - agar terdengar seperti logam/bel)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(2093.00, now); // C7 (oktaf di atasnya)
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.linearRampToValueAtTime(0.6, now + 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          osc2.start(now);
          osc2.stop(now + 0.8);
          
          // Oscillator ketiga (Harmonic 2 - untuk dentingan tajam)
          const osc3 = ctx.createOscillator();
          const gain3 = ctx.createGain();
          osc3.connect(gain3);
          gain3.connect(ctx.destination);
          osc3.type = "sine";
          osc3.frequency.setValueAtTime(3139.5, now); // G7
          gain3.gain.setValueAtTime(0, now);
          gain3.gain.linearRampToValueAtTime(0.3, now + 0.01);
          gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc3.start(now);
          osc3.stop(now + 0.5);

        } else if (type === "warning") {`;

code = code.replace(playOscOld, playOscNew);
fs.writeFileSync('pages/PresensiQR.tsx', code);
console.log("Bell logic updated");
