const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacement = `import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../services/supabase';
import { Database, Save, Loader2, Calendar } from 'lucide-react';

const Penyimpanan: React.FC = () => {
    const [academicYear, setAcademicYear] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeYear, setActiveYear] = useState('');
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: yearsData } = await supabase.from('app_settings').select('value').eq('key', 'available_years').single();
                if (yearsData?.value) {
                    try {
                        const parsed = JSON.parse(yearsData.value);
                        setAvailableYears(parsed);
                    } catch(e) {
                        setAvailableYears([yearsData.value]);
                    }
                } else {
                    setAvailableYears(['2024/2025']);
                }

                const { data: currentData } = await supabase.from('app_settings').select('value').eq('key', 'academic_year').single();
                if (currentData?.value) {
                    setActiveYear(currentData.value);
                }
            } catch(e) {
                console.error("Error fetching settings:", e);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!academicYear.trim()) {
            setMessage({ type: 'error', text: 'Tahun Ajaran tidak boleh kosong.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            let currentYears = [...availableYears];
            if (!currentYears.includes(academicYear)) {
                currentYears.push(academicYear);
                
                const { error: upsertError } = await supabase
                    .from('app_settings')
                    .upsert({ 
                        key: 'available_years', 
                        value: JSON.stringify(currentYears),
                        description: 'Daftar Tahun Ajaran Tersedia'
                    }, { onConflict: 'key' });
                
                if (upsertError) throw upsertError;
                setAvailableYears(currentYears);
                setMessage({ type: 'success', text: \`Tahun Ajaran \${academicYear} berhasil ditambahkan ke dalam sistem.\` });
                setAcademicYear(''); // Reset input
            } else {
                setMessage({ type: 'info', text: \`Tahun Ajaran \${academicYear} sudah ada di dalam sistem.\` });
            }
        } catch (error: any) {
            console.error("Error saving storage data:", error);
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSetActiveYear = async (year: string) => {
        setActiveYear(year);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ 
                    key: 'academic_year', 
                    value: year,
                    description: 'Tahun Ajaran saat ini'
                }, { onConflict: 'key' });
            
            if (error) throw error;
            setMessage({ type: 'success', text: \`Tahun Ajaran Aktif berhasil diubah menjadi \${year}.\` });
        } catch (e: any) {
            console.error("Error setting active year:", e);
            setMessage({ type: 'error', text: 'Gagal mengubah Tahun Ajaran aktif.' });
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Database className="text-blue-500" /> Buat Tahun Ajaran
                    </h2>
                    
                    {message.text && (
                        <div className={\`p-4 rounded-xl mb-6 text-sm font-medium \${message.type === 'error' ? 'bg-red-50 text-red-600' : message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}\`}>
                            {message.text}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Section: Buat Tahun Ajaran */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Calendar size={18} className="text-gray-500"/> Tambah Tahun Ajaran Baru
                            </h3>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tahun Ajaran</label>
                                <input 
                                    type="text"
                                    className="w-full border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    placeholder="Contoh: 2025/2026"
                                />
                            </div>
                            
                            <div>
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Buat
                                </button>
                            </div>
                        </div>

                        {/* Section: Tahun Ajaran Aktif */}
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
                        </div>
                    </div>
                    
                    <div className="mt-8 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl">
                        <strong>Catatan:</strong> "Tambah Tahun Ajaran Baru" digunakan untuk mendaftarkan tahun ajaran ke sistem. Sedangkan "Tahun Ajaran Aktif" digunakan untuk mengatur tahun ajaran default yang digunakan saat ini.
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Penyimpanan;
`;

fs.writeFileSync(file, replacement);
console.log('Penyimpanan.tsx updated');
