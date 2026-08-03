const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../pages/Penyimpanan.tsx');
let content = fs.readFileSync(file, 'utf8');

const fn = `
    const handleSetActiveScheduleVersion = async (val: string) => {
        try {
            const { error } = await supabase.from('app_settings').upsert({ key: 'active_schedule_version', value: val });
            if (error) throw error;
            setActiveScheduleVersion(val);
            setMessage({ type: 'success', text: 'Versi Jadwal Aktif diperbarui!' });
            setTimeout(() => window.location.reload(), 1000);
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Gagal update versi jadwal: ' + err.message });
        }
    };
`;

if (!content.includes('handleSetActiveScheduleVersion =')) {
    content = content.replace(
        /const handleSetActiveSemester = async \(val: string\) => \{/g,
        `${fn}\n    const handleSetActiveSemester = async (val: string) => {`
    );
    fs.writeFileSync(file, content);
}
