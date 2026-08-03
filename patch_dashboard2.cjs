const fs = require('fs');
let code = fs.readFileSync('./pages/Dashboard.tsx', 'utf8');

const replacement = `                        <p className="text-purple-100/90 text-sm font-mono">{isAdmin ? 'Administrator' : (profile?.nip ? \`NIP \${profile.nip}\` : 'NIP -')}</p>
                    </div>
                </div>`;

code = code.replace(/<p className="text-purple-100\/90 text-sm mb-3 font-mono">\{isAdmin \? 'Administrator' : \(profile\?\.nip \|\| 'NIP -'\)\}<\/p>\s*<div className="flex flex-wrap gap-2">\s*\{\!isAdmin && profile\?\.mengajar_mapel && [^\n]*\s*\{\!isAdmin && profile\?\.wali_kelas && [^\n]*\s*<\/div>\s*<\/div>\s*<\/div>/, replacement);
fs.writeFileSync('./pages/Dashboard.tsx', code);
