
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Upload, FileText, CheckCircle, AlertCircle, Download, BookOpen, X, Loader2, Database, HelpCircle } from 'lucide-react';

const InputManual: React.FC = () => {
  const { academicYear, semester , semesterStart, semesterEnd } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [failedRows, setFailedRows] = useState<any[]>([]);

  // Cache Data
  const [teachersMap, setTeachersMap] = useState<Record<string, string>>({}); // NIP -> ID
  const [teachersNameMap, setTeachersNameMap] = useState<Record<string, string>>({}); // NIP -> Nama
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const fetchMappings = async () => {
          const { data: t } = await supabase.from('profiles').select('id, nip, full_name');
          const tMap: Record<string, string> = {};
          const tNameMap: Record<string, string> = {};
          t?.forEach(item => { 
              if(item.nip) {
                  tMap[item.nip] = item.id; 
                  tNameMap[item.nip] = item.full_name;
              }
          });
          setTeachersMap(tMap);
          setTeachersNameMap(tNameMap);
      };
      fetchMappings();
  }, []);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  const downloadTemplate = () => {
    // SINGLE UNIVERSAL TEMPLATE
    const csvContent = "Tanggal;Jam Ke;Kelas;Mapel;Materi;NIP Guru;Nama Murid;Status Absensi;Kategori Pelanggaran;Tindak Lanjut;Catatan\n2024-01-20;1-2;7A;Matematika;Aljabar Dasar;19800101xxx;;;Tidur di Kelas;Teguran Lisan;Siswa mengantuk\n2024-01-20;1-2;7A;Matematika;Aljabar Dasar;19800101xxx;Budi Santoso;S;;;\n2024-01-20;3-4;8B;IPA;Hukum Newton;19900202xxx;;;;;";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_universal_kbm.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFailedLog = () => {
      if (failedRows.length === 0) return;
      const headers = Object.keys(failedRows[0]);
      const csvContent = [
          headers.join(';'),
          ...failedRows.map(row => headers.map(fieldName => `"${row[fieldName] || ''}"`).join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `error_log_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        setStatus(null);
        setFailedRows([]);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = parseCSV(evt.target?.result as string);
                if (data.length === 0) setStatus({ type: 'error', msg: 'File CSV kosong/format salah.' });
                else setPreviewData(data);
            } catch (err) { setStatus({ type: 'error', msg: 'Gagal membaca file CSV.' }); }
        };
        reader.readAsText(selectedFile);
    }
  };

  const handleProcess = async () => {
      if (previewData.length === 0) return;
      setLoading(true);
      setStatus(null);
      setFailedRows([]);

      const failedData: any[] = [];
      let journalCreatedCount = 0;
      let logsInsertedCount = 0;

      try {
          // 1. Pre-fetch ALL Students to minimize DB calls inside loop
          let { data: allStudents, error: errSt } = await supabase.from('students').select('id, name, kelas').eq('academic_year', academicYear || '2025/2026');
          if (errSt && (errSt.code === '42703' || errSt.message?.includes('academic_year'))) {
              const res = await supabase.from('students').select('id, name, kelas').eq('academic_year', academicYear || '2025/2026');
              if (academicYear === '2025/2026') allStudents = res.data;
              else allStudents = [];
          }
          const studentLookup: Record<string, string> = {}; // "nama|kelas" -> id
          allStudents?.forEach(s => {
              const key = `${s.name.trim().toLowerCase()}|${s.kelas.trim().toLowerCase()}`;
              studentLookup[key] = s.id;
          });

          // 2. Group Rows by "Journal Identity" (Date + Teacher + Class + Subject + Hours)
          // This ensures we create only ONE Journal for multiple student rows.
          const groups: Record<string, {
              meta: { date: string, teacherId: string, teacherName: string, kelas: string, subject: string, hours: string, material: string },
              rows: any[]
          }> = {};

          for (const row of previewData) {
              const date = row['Tanggal'];
              const teacherNip = String(row['NIP Guru'] || '').trim();
              const teacherId = teachersMap[teacherNip];
              const kelas = String(row['Kelas'] || '').trim();
              const subject = String(row['Mapel'] || '').trim();
              
              // Validate minimal Journal Data
              if (!date || !teacherId || !kelas || !subject) {
                  failedData.push({ ...row, error_reason: 'Data Jurnal (Tanggal/NIP/Kelas/Mapel) tidak lengkap' });
                  continue;
              }

              const hours = String(row['Jam Ke'] || '-');
              const material = String(row['Materi'] || 'Import Manual');
              
              // Key for grouping
              const groupKey = `${date}_${teacherId}_${kelas}_${subject}_${hours}`;

              if (!groups[groupKey]) {
                  groups[groupKey] = {
                      meta: { 
                          date, teacherId, teacherName: teachersNameMap[teacherNip], 
                          kelas, subject, hours, material 
                      },
                      rows: []
                  };
              }
              groups[groupKey].rows.push(row);
          }

          // 3. Process Each Group
          for (const key in groups) {
              const group = groups[key];
              const { meta, rows } = group;
              let journalId = '';

              // A. Find Existing Journal OR Create New
              // Check existing to avoid duplication if re-running
              const { data: existingJournal } = await supabase.from('journals')
                  .select('id')
                  .eq('teacher_id', meta.teacherId)
                  .eq('kelas', meta.kelas)
                  .eq('subject', meta.subject)
                  .eq('created_at', `${meta.date}T07:00:00+07:00`) // Simplified check
                  .maybeSingle();

              if (existingJournal) {
                  journalId = existingJournal.id;
              } else {
                  const { data: newJournal, error: jError } = await supabase.from('journals').insert({
                      teacher_id: meta.teacherId,
                      kelas: meta.kelas,
                      subject: meta.subject,
                      hours: meta.hours,
                      material: meta.material,
                      cleanliness: 'sudah_bersih',
                      validation: 'hadir_kbm',
                      created_at: `${meta.date}T07:00:00+07:00`,
                      academic_year: academicYear || '2025/2026',
                      semester: semester || 'Ganjil',
                      
                      
                  }).select('id').single();

                  if (jError) {
                      rows.forEach(r => failedData.push({ ...r, error_reason: 'Gagal membuat Jurnal: ' + jError.message }));
                      continue;
                  }
                  journalId = newJournal.id;
                  journalCreatedCount++;
              }

              // B. Process Student Rows (Attendance & Violations) linked to this Journal
              const attInserts: any[] = [];
              const noteInserts: any[] = [];

              for (const row of rows) {
                  const rawName = String(row['Nama Murid'] || '').trim();
                  
                  // Skip if no student name (Just a journal entry)
                  if (!rawName) continue;

                  // Lookup Student ID
                  const sKey = `${rawName.toLowerCase()}|${meta.kelas.toLowerCase()}`;
                  const studentId = studentLookup[sKey];

                  if (!studentId) {
                      failedData.push({ ...row, error_reason: `Murid "${rawName}" di kelas ${meta.kelas} tidak ditemukan` });
                      continue;
                  }

                  // 1. Attendance (Absensi)
                  const status = (row['Status Absensi'] || '').toUpperCase().trim();
                  if (['S', 'I', 'A', 'D'].includes(status)) {
                      attInserts.push({
                          journal_id: journalId,
                          student_id: studentId,
                          student_name: rawName,
                          status: status,
                          teacher_name: meta.teacherName,
                          subject: meta.subject,
                          created_at: `${meta.date}T07:00:00+07:00`,
                      academic_year: academicYear || '2025/2026',
                      semester: semester || 'Ganjil',
                          
                          
                      });
                  }

                  // 2. Violation (Pelanggaran)
                  const violation = (row['Kategori Pelanggaran'] || '').trim();
                  if (violation) {
                      noteInserts.push({
                          journal_id: journalId,
                          student_id: studentId,
                          student_name: rawName,
                          type: 'kedisiplinan',
                          category: violation,
                          follow_up: row['Tindak Lanjut'] || '',
                          note: row['Catatan'] || 'Import Manual',
                          created_at: `${meta.date}T07:00:00+07:00`,
                      academic_year: academicYear || '2025/2026',
                      semester: semester || 'Ganjil',
                          
                          
                      });
                  }
              }

              // Bulk Insert Logs
              if (attInserts.length > 0) {
                  const { error: attError } = await supabase.from('attendance_logs').insert(attInserts);
                  if (!attError) logsInsertedCount += attInserts.length;
              }
              if (noteInserts.length > 0) {
                  const { error: noteError } = await supabase.from('journal_notes').insert(noteInserts);
                  if (!noteError) logsInsertedCount += noteInserts.length;
              }
          }

          setFailedRows(failedData);
          setStatus({ 
              type: failedData.length > 0 ? 'error' : 'success', 
              msg: `Proses Selesai. Jurnal: ${journalCreatedCount}, Log Siswa: ${logsInsertedCount}. Gagal: ${failedData.length}.` 
          });
          
          if(failedData.length === 0) {
              setFile(null); setPreviewData([]);
              if (fileInputRef.current) fileInputRef.current.value = "";
          }

      } catch (err: any) {
          setStatus({ type: 'error', msg: "Kesalahan Sistem: " + err.message });
      } finally {
          setLoading(false);
      }
  };

  const handleClear = () => {
      setFile(null); setPreviewData([]); setStatus(null); setFailedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Database className="text-purple-600" /> Import Universal Data KBM
                </h2>
                <p className="text-gray-500 text-sm">Upload satu file CSV untuk Jurnal, Absensi, dan Pelanggaran sekaligus.</p>
            </div>
            <button onClick={downloadTemplate} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all">
                <Download size={18} /> Download Template Universal
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8">
            
            {/* GUIDE */}
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-5 rounded-2xl flex gap-4 text-sm text-purple-900">
                <div className="bg-white p-2 rounded-full h-fit shadow-sm"><HelpCircle className="text-purple-600" size={20} /></div>
                <div>
                    <p className="font-bold text-lg mb-2">Panduan Format Universal:</p>
                    <ul className="list-disc ml-4 space-y-1 text-purple-800">
                        <li><strong>Satu baris = Satu kejadian.</strong> Jika 1 jurnal memiliki 3 siswa yang absen, buat 3 baris dengan data Jurnal (Tanggal, Guru, Mapel) yang sama.</li>
                        <li>Sistem otomatis menggabungkan baris dengan Jurnal yang sama menjadi <strong>1 ID Jurnal</strong>.</li>
                        <li>Kolom <strong>Nama Murid</strong> boleh dikosongkan jika baris tersebut hanya untuk mencatat Jurnal Mengajar (tanpa absen/pelanggaran).</li>
                        <li>Format Tanggal: <strong>YYYY-MM-DD</strong>. Pemisah CSV: <strong>Titik Koma (;)</strong>.</li>
                    </ul>
                </div>
            </div>

            {/* UPLOAD AREA */}
            {!file ? (
                <div 
                    className="border-3 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:bg-gray-50 hover:border-purple-400 transition-all cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="bg-purple-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <Upload className="text-purple-600" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700">Klik untuk Upload CSV</h3>
                    <p className="text-gray-400 text-sm mt-2">Mendukung format .csv universal</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .txt" className="hidden" />
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <div className="flex items-center gap-3">
                            <FileText className="text-purple-600" size={32} />
                            <div>
                                <p className="font-bold text-gray-800">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {previewData.length} Baris Data</p>
                            </div>
                        </div>
                        <button onClick={handleClear} className="p-2 hover:bg-purple-200 rounded-full text-gray-500"><X size={20} /></button>
                    </div>

                    {previewData.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto text-xs border border-gray-200 custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-300">
                                        {Object.keys(previewData[0]).slice(0, 7).map(key => (
                                            <th key={key} className="py-2 px-2 text-gray-600 font-bold bg-gray-50 sticky top-0">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(0, 10).map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-100">
                                            {Object.values(row).slice(0, 7).map((val: any, i) => (
                                                <td key={i} className="py-2 px-2 truncate max-w-[150px]">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {previewData.length > 10 && <p className="text-center text-gray-400 mt-2 italic">...dan {previewData.length - 10} baris lainnya.</p>}
                        </div>
                    )}

                    <button 
                        onClick={handleProcess}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-50 transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Proses & Simpan ke Database'}
                    </button>
                </div>
            )}

            {/* STATUS & LOGS */}
            {status && (
                <div className={`mt-6 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm font-medium animate-fade-in ${status.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    <div className="flex items-start gap-3">
                        {status.type === 'success' ? <CheckCircle size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                        <span className="leading-relaxed">{status.msg}</span>
                    </div>
                    {failedRows.length > 0 && (
                        <button onClick={downloadFailedLog} className="bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-red-50 flex items-center gap-2">
                            <Download size={14} /> Download Error Log
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default InputManual;
