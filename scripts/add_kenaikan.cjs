const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for modal
if (!content.includes('showKenaikanModal')) {
    content = content.replace(
        /const \[modalType, setModalType\] = useState.*?;/g,
        `$&
  const [showKenaikanModal, setShowKenaikanModal] = useState(false);
  const [targetYear, setTargetYear] = useState('');
  const [kenaikanLoading, setKenaikanLoading] = useState(false);`
    );
}

// 2. Add function to handle Kenaikan
if (!content.includes('handleKenaikanKelas')) {
    const kenaikanFunc = `
  const handleKenaikanKelas = async () => {
      if (!targetYear) {
          alert('Pilih Tahun Ajaran tujuan!');
          return;
      }
      if (targetYear === academicYear) {
          alert('Tahun Ajaran tujuan tidak boleh sama dengan yang sekarang!');
          return;
      }
      
      const confirmMsg = \`Apakah Anda yakin memproses kenaikan kelas dari \${academicYear} ke \${targetYear}?\\n\\nSiswa Kelas 7 akan naik ke Kelas 8.\\nSiswa Kelas 8 akan naik ke Kelas 9.\\nSiswa Kelas 9 akan diluluskan (Data tidak disalin ke tahun ajaran baru).\`;
      if (!window.confirm(confirmMsg)) return;
      
      setKenaikanLoading(true);
      try {
          // 1. Get all students in current academicYear
          const { data: currentStudents, error: fetchErr } = await supabase
              .from('students')
              .select('*')
              .eq('academic_year', academicYear);
              
          if (fetchErr) throw fetchErr;
          if (!currentStudents || currentStudents.length === 0) {
              alert('Tidak ada data murid di tahun ajaran saat ini.');
              setKenaikanLoading(false);
              return;
          }
          
          // 2. Prepare new student records
          const newRecords = [];
          for (const student of currentStudents) {
              const currentGrade = parseInt(student.jenjang);
              if (isNaN(currentGrade) || currentGrade === 9) {
                  // Lulus atau format salah, lewati
                  continue;
              }
              
              const newGrade = currentGrade + 1;
              let newKelasName = student.kelas;
              if (student.kelas.startsWith(currentGrade.toString())) {
                  newKelasName = student.kelas.replace(currentGrade.toString(), newGrade.toString());
              }
              
              newRecords.push({
                  academic_year: targetYear,
                  nisn: student.nisn,
                  nis: student.nis,
                  name: student.name,
                  kelas: newKelasName,
                  gender: student.gender,
                  jenjang: newGrade.toString()
              });
          }
          
          if (newRecords.length === 0) {
              alert('Tidak ada murid yang dapat dinaikkan (semua kelas 9 atau data tidak valid).');
              setKenaikanLoading(false);
              return;
          }
          
          // 3. Insert new records
          const { error: insertErr } = await supabase
              .from('students')
              .insert(newRecords);
              
          if (insertErr) {
              if (insertErr.code === '23505') {
                  throw new Error('Beberapa siswa sudah ada di tahun ajaran tujuan. Kenaikan kelas mungkin sudah diproses.');
              }
              throw insertErr;
          }
          
          alert(\`Berhasil memproses kenaikan kelas untuk \${newRecords.length} murid!\`);
          setShowKenaikanModal(false);
          // Don't auto-fetch yet because we are still on the old academicYear context.
          // They need to switch academicYear in Penyimpanan to see it.
      } catch (err: any) {
          alert('Gagal memproses kenaikan kelas: ' + err.message);
      } finally {
          setKenaikanLoading(false);
      }
  };
`;
    content = content.replace(
        /const handleDelete = async \(id: string\) => \{/g,
        `${kenaikanFunc}\n  const handleDelete = async (id: string) => {`
    );
}

// 3. Add UI Button
if (!content.includes('Proses Kenaikan Kelas')) {
    content = content.replace(
        /<button\s+onClick=\{openMutasiModal\}\s+className="px-4 py-2 bg-blue-600 text-white rounded-lg.*?>/g,
        `<button onClick={() => setShowKenaikanModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm text-sm">
                        <TrendingUp size={18} />
                        Proses Kenaikan Kelas
                    </button>\n                    $&`
    );
    
    // Add import TrendingUp if not exist
    if (!content.includes('TrendingUp')) {
        content = content.replace(
            /import \{\s*([^}]+)\s*\}\s*from\s*'lucide-react';/g,
            `import { $1, TrendingUp } from 'lucide-react';`
        );
    }
}

// 4. Add Modal UI
if (!content.includes('Modal Kenaikan Kelas')) {
    const modalUI = `
            {/* Modal Kenaikan Kelas */}
            {showKenaikanModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden ring-1 ring-black/5 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-purple-50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Proses Kenaikan Kelas</h3>
                                <p className="text-xs text-purple-700">Migrasi data murid ke Tahun Ajaran Baru</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-xs text-orange-800 space-y-2">
                                <p><strong>Perhatian:</strong> Fitur ini akan menyalin data murid aktif saat ini ({academicYear}) ke Tahun Ajaran yang baru.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Siswa Kelas 7 akan otomatis menjadi Kelas 8 (Misal: 7A &rarr; 8A).</li>
                                    <li>Siswa Kelas 8 akan otomatis menjadi Kelas 9 (Misal: 8A &rarr; 9A).</li>
                                    <li>Siswa Kelas 9 akan otomatis diluluskan (tidak disalin).</li>
                                </ul>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Tahun Ajaran Tujuan</label>
                                <select 
                                    className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    value={targetYear}
                                    onChange={(e) => setTargetYear(e.target.value)}
                                >
                                    <option value="" disabled>Pilih Tahun Ajaran...</option>
                                    <option value="2025/2026">2025/2026</option>
                                    <option value="2026/2027">2026/2027</option>
                                    <option value="2027/2028">2027/2028</option>
                                    <option value="2028/2029">2028/2029</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowKenaikanModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
                            <button 
                                onClick={handleKenaikanKelas} 
                                disabled={kenaikanLoading}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {kenaikanLoading ? 'Memproses...' : 'Proses Kenaikan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
`;
    content = content.replace(
        /\{isModalOpen && \(\s*<div className="fixed inset-0/g,
        `${modalUI}\n            {isModalOpen && (\n                <div className="fixed inset-0`
    );
}

fs.writeFileSync(file, content);
console.log('StudentsData.tsx patched with Kenaikan Kelas');
