const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const anchor = "                          <h3 className=\"font-black text-2xl text-slate-500 dark:text-slate-400\">Menunggu Scan...</h3>";

const idx = code.indexOf(anchor);
if (idx !== -1) {
    const endTab1 = code.indexOf("{/* TAB 2: KELOLA HASIL SCAN & DATABASE PRESENSI */}", idx);
    
    const correctEnding = `                          <h3 className="font-black text-2xl text-slate-500 dark:text-slate-400">Menunggu Scan...</h3>
                          <p className="text-base font-medium mt-2">Arahkan kartu QR siswa ke kamera.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        `;
    
    code = code.substring(0, idx) + correctEnding + code.substring(endTab1);
    fs.writeFileSync('pages/PresensiQR.tsx', code);
    console.log("Fixed end of TAB 1");
} else {
    console.log("Anchor not found");
}
