const fs = require('fs');
let code = fs.readFileSync('./pages/UsersData.tsx', 'utf8');

code = code.replace(
    /let errors = 0;/g, 
    'let errors = 0;\n      let lastErrorMsg = "";'
);

code = code.replace(
    /setSyncStats\(\{ total: missingGuru.length, created, errors \}\);/g,
    'setSyncStats({ total: missingGuru.length, created, errors, lastError: lastErrorMsg });'
);

code = code.replace(
    /const \[syncStats, setSyncStats\] = useState<\{ total: number, created: number, errors: number \} \| null>\(null\);/g,
    'const [syncStats, setSyncStats] = useState<{ total: number, created: number, errors: number, lastError?: string } | null>(null);'
);

code = code.replace(
    /if \(authError \|\| !userId\) \{\s+errors\+\+;\s+continue;\s+\}/g,
    `if (authError || !userId) {
                      errors++;
                      lastErrorMsg = authError?.message || "User ID tidak ditemukan";
                      continue;
                  }`
);

code = code.replace(
    /catch \(e\) \{\s+errors\+\+;\s+\}/g,
    `catch (e: any) {
                  errors++;
                  lastErrorMsg = e.message || "Error saat insert profile";
              }`
);

code = code.replace(
    /<li className="text-red-500">Gagal dibuat: <strong>\{syncStats.errors\}<\/strong><\/li>/g,
    '<li className="text-red-500">Gagal dibuat: <strong>{syncStats.errors}</strong></li>\n                                        {syncStats.lastError && <li className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded"><strong>Error Terakhir:</strong> {syncStats.lastError}</li>}'
);

fs.writeFileSync('./pages/UsersData.tsx', code);
