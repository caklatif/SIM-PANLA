const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

// Extract the 3 sections:
// 1. Tambah Tahun Ajaran Baru
// 2. Versi Jadwal Aktif
// 3. Tahun Ajaran Aktif

const part1 = content.split('<!-- Section: Tahun Ajaran Aktif -->')[0];
// Well, it didn't match `<!-- Section: Tahun Ajaran Aktif -->` earlier.

// Let's do it with specific search

const newSections = `                        {/* Section: Tahun Ajaran Aktif */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Database size={18} className="text-gray-500"/> Tahun Ajaran Aktif
                            </h3>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Tahun Ajaran Aktif</label>
                                <select 
                                    className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    value={activeYear}
                                    onChange={(e) => handleSetActiveYear(e.target.value)}
                                >
                                    <option value="" disabled>Pilih Tahun Ajaran...</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Berlaku dari tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={academicYearStart}
                                        onChange={(e) => setAcademicYearStart(e.target.value)}
                                        onBlur={handleSaveAcademicYearDates}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sampai tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={academicYearEnd}
                                        onChange={(e) => setAcademicYearEnd(e.target.value)}
                                        onBlur={handleSaveAcademicYearDates}
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Semester Aktif</label>
                                <select 
                                    className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    value={activeSemester}
                                    onChange={(e) => handleSetActiveSemester(e.target.value)}
                                >
                                    <option value="" disabled>Pilih Semester...</option>
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Berlaku mulai tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={semesterStart}
                                        onChange={(e) => setSemesterStart(e.target.value)}
                                        onBlur={handleSaveSemesterDates}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Sampai Tanggal</label>
                                    <input 
                                        type="date"
                                        className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={semesterEnd}
                                        onChange={(e) => setSemesterEnd(e.target.value)}
                                        onBlur={handleSaveSemesterDates}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Versi Jadwal Aktif */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Calendar size={18} className="text-gray-500"/> Versi Jadwal Aktif
                            </h3>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Versi Jadwal (misal: Utama, Ramadhan)</label>
                                <div className="flex gap-2">
                                    
                                    <select 
                                        className="flex-1 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        value={activeScheduleVersion}
                                        onChange={(e) => setActiveScheduleVersion(e.target.value)}
                                    >
                                        {availableScheduleVersions.map(v => <option key={v} value={v}>{v}</option>)}
                                        {!availableScheduleVersions.includes(activeScheduleVersion) && activeScheduleVersion && <option value={activeScheduleVersion}>{activeScheduleVersion}</option>}
                                    </select>
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

// Remove the old Versi Jadwal Aktif section and Tahun Ajaran Aktif section
const startIdx = content.indexOf('<div className="space-y-4 pt-4 border-t border-gray-100">\n                            <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">\n                                <Calendar size={18} className="text-gray-500"/> Versi Jadwal Aktif');

const endIdx = content.indexOf('<div className="mt-8 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl">');

if (startIdx !== -1 && endIdx !== -1) {
    const p1 = content.substring(0, startIdx);
    const p2 = content.substring(endIdx);
    content = p1 + newSections + '\n                    ' + p2;
}

fs.writeFileSync(file, content);
console.log('UI updated');
