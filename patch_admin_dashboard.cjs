const fs = require('fs');
let code = fs.readFileSync('./pages/Dashboard.tsx', 'utf8');

const replacement = `            </div>
        </div>

        {/* MAIN WIDGETS */}
        {isAdmin && (
            <div className="flex flex-col gap-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden text-center">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Selamat Datang di Panel Administrator</h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">Anda login sebagai Admin. Gunakan menu navigasi di bawah untuk mengelola data guru, jadwal pelajaran, merekap jurnal mengajar, atau membersihkan data.</p>
                </div>
            </div>
        )}
        
        {!isAdmin && (`;

code = code.replace(/<\/div>\s*<\/div>\s*\{\/\* MAIN WIDGETS \*\/\}\s*\{\!isAdmin && \(/, replacement);
fs.writeFileSync('./pages/Dashboard.tsx', code);
