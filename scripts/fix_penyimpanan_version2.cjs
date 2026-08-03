const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

const uiInput = `
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Calendar size={18} className="text-gray-500"/> Versi Jadwal Aktif
                            </h3>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Versi Jadwal (misal: Utama, Ramadhan)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        className="flex-1 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={activeScheduleVersion}
                                        onChange={(e) => setActiveScheduleVersion(e.target.value)}
                                        placeholder="Contoh: Utama"
                                    />
                                    <button 
                                        onClick={() => handleSetActiveScheduleVersion(activeScheduleVersion)}
                                        className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
`;

if (!content.includes('Versi Jadwal Aktif')) {
    content = content.replace(
        /\{\/\* Section: Tahun Ajaran Aktif \*\/\}/g,
        `${uiInput}\n                        {/* Section: Tahun Ajaran Aktif */}`
    );
    fs.writeFileSync(file, content);
    console.log('Fixed UI');
}
