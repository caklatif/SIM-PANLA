const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const targetButtonsOld = `{/* Test Bell Button */}
                        <button
                          type="button"
                          onClick={() => playBeep("success", true)}
                          title="Test Suara Lonceng Sukses"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900"
                        >
                          <Volume2 size={14} />
                          <span className="hidden sm:inline">Test Lonceng</span>
                        </button>`;

const targetButtonsNew = `{/* Panel Test Audio */}
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 px-1 hidden sm:inline">Tes Suara:</span>
                          <button
                            type="button"
                            onClick={() => { playBeep("success", true); }}
                            className="px-2 py-1 text-[10px] font-bold transition-all border bg-emerald-950/50 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900 rounded-lg"
                          >
                            Sukses
                          </button>
                          <button
                            type="button"
                            onClick={() => { playBeep("warning", true); }}
                            className="px-2 py-1 text-[10px] font-bold transition-all border bg-amber-950/50 text-amber-400 border-amber-800/50 hover:bg-amber-900 rounded-lg"
                          >
                            Dobel
                          </button>
                          <button
                            type="button"
                            onClick={() => { playBeep("error", true); }}
                            className="px-2 py-1 text-[10px] font-bold transition-all border bg-rose-950/50 text-rose-400 border-rose-800/50 hover:bg-rose-900 rounded-lg"
                          >
                            Gagal
                          </button>
                        </div>`;

code = code.replace(targetButtonsOld, targetButtonsNew);

// ALSO update the sound synthesizer to make warning and error sound very different!
const oldOscCode = `        } else if (type === "warning") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(392.0, now + 0.1);
          gain.gain.setValueAtTime(0.8, now); // Dikeraskan
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
        } else {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.setValueAtTime(180, now + 0.12);
          gain.gain.setValueAtTime(0.9, now); // Dikeraskan
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        }`;

const newOscCode = `        } else if (type === "warning") {
          // Bunyi "Tit-Tut" peringatan dobel
          osc.type = "square";
          osc.frequency.setValueAtTime(440, now); // Nada A4
          osc.frequency.setValueAtTime(349.23, now + 0.15); // Turun ke F4
          gain.gain.setValueAtTime(0.3, now); 
          gain.gain.setValueAtTime(0, now + 0.1); // Jeda
          gain.gain.setValueAtTime(0.3, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else {
          // Bunyi "Teettt" (Buzzer Error)
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(150, now);
          gain.gain.setValueAtTime(0.5, now); 
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          
          // Tambah modulasi kasar
          const lfo = ctx.createOscillator();
          lfo.type = "square";
          lfo.frequency.value = 50; // 50Hz getaran
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 500;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(now);
          lfo.stop(now + 0.5);

          osc.start(now);
          osc.stop(now + 0.5);
        }`;

code = code.replace(oldOscCode, newOscCode);

fs.writeFileSync('pages/PresensiQR.tsx', code);
console.log("Audio buttons updated");
