const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const importIdx = code.indexOf("import React, { useEffect, useState, useRef } from 'react';", 100);

if (importIdx !== -1) {
    code = code.substring(0, importIdx);
    
    // But wait, the first part is missing TAB 2 because I sliced it out!
    // If I just chop off from importIdx, I'll be missing TAB 2!
    // I need to extract TAB 2 from the duplicated part!
    const duplicatedPart = code.substring(importIdx);
    const tab2Start = duplicatedPart.indexOf("        {/* TAB 2: KELOLA HASIL SCAN & DATABASE PRESENSI */}");
    
    if (tab2Start !== -1) {
        // We need to restore the end of TAB 1 and then append TAB 2.
        const endOfTab1 = `
                </div>
              </div>
            )}
          </div>
        )}

`;
        code = code.substring(0, importIdx) + endOfTab1 + duplicatedPart.substring(tab2Start);
        fs.writeFileSync('pages/PresensiQR.tsx', code);
        console.log("Fixed duplication and restored TAB 2");
    } else {
        console.log("Could not find TAB 2 in duplicated part");
    }
} else {
    console.log("No duplication found");
}
