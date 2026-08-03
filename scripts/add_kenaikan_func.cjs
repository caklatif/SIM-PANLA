const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/StudentsData.tsx');
let content = fs.readFileSync(file, 'utf8');

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
          
          const newRecords = [];
          for (const student of currentStudents) {
              const currentGrade = parseInt(student.jenjang);
              if (isNaN(currentGrade) || currentGrade === 9) {
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
      } catch (err: any) {
          alert('Gagal memproses kenaikan kelas: ' + err.message);
      } finally {
          setKenaikanLoading(false);
      }
  };
`;

content = content.replace(
    /const handleSaveMasuk = async \(\) => \{/g,
    `${kenaikanFunc}\n  const handleSaveMasuk = async () => {`
);

fs.writeFileSync(file, content);
console.log('StudentsData handleKenaikanKelas injected');
