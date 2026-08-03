const fs = require('fs');
let code = fs.readFileSync('./pages/ImportData.tsx', 'utf8');

const helpText = `<label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                        <KeyRound size={16} className="text-blue-500" />
                                        Service Role Key (Secret)
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">Bukan API Key biasa (anon). Dapatkan di <strong>Supabase &gt; Project Settings &gt; API &gt; service_role (secret)</strong>.</p>
                                    <div className="relative">`;
code = code.replace(/<label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">\s*<KeyRound size=\{16\} className="text-blue-500" \/>\s*Service Role Key \(Secret\)\s*<\/label>\s*<div className="relative">/, helpText);

fs.writeFileSync('./pages/ImportData.tsx', code);
