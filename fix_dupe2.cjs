const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const importIdx = code.indexOf("import React, { useEffect, useState, useRef } from 'react';", 100);

if (importIdx !== -1) {
    const duplicatedPart = code.substring(importIdx);
    const tab2Start = duplicatedPart.indexOf("{/* TAB 2: KELOLA HASIL SCAN & DATABASE PRESENSI */}");
    
    if (tab2Start !== -1) {
        // We need to restore the end of TAB 1 and then append TAB 2.
        const endOfTab1 = `
                </div>
              </div>
            )}
          </div>
        )}

        `;
        const codeFixed = code.substring(0, importIdx) + endOfTab1 + duplicatedPart.substring(tab2Start);
        fs.writeFileSync('pages/PresensiQR.tsx', codeFixed);
        console.log("Fixed duplication and restored TAB 2");
    } else {
        console.log("Could not find TAB 2 in duplicated part");
    }
} else {
    console.log("No duplication found");
}
