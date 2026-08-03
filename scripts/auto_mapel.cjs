const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/UsersData.tsx');
let content = fs.readFileSync(file, 'utf8');

// For Edit mode
const editSelectTarget = `onChange={e => setEditFormData({...editFormData, wali_kelas: e.target.value})}`;
const editSelectReplacement = `onChange={e => {
    const val = e.target.value;
    let newMapel = editFormData.mengajar_mapel;
    if (val) {
        const mapels = newMapel ? newMapel.split(',').map(m => m.trim()) : [];
        if (!mapels.includes('Sabtu bersama Wali Kelas')) {
            mapels.push('Sabtu bersama Wali Kelas');
            newMapel = mapels.join(', ');
        }
    }
    setEditFormData({...editFormData, wali_kelas: val, mengajar_mapel: newMapel});
}}`;
content = content.replace(editSelectTarget, editSelectReplacement);

// For Add mode
const addSelectTarget = `onChange={e => setNewUser({...newUser, waliKelas: e.target.value})}`;
const addSelectReplacement = `onChange={e => {
    const val = e.target.value;
    let newMapel = newUser.mapel;
    if (val) {
        const mapels = newMapel ? newMapel.split(',').map(m => m.trim()) : [];
        if (!mapels.includes('Sabtu bersama Wali Kelas')) {
            mapels.push('Sabtu bersama Wali Kelas');
            newMapel = mapels.join(', ');
        }
    }
    setNewUser({...newUser, waliKelas: val, mapel: newMapel});
}}`;
content = content.replace(addSelectTarget, addSelectReplacement);

fs.writeFileSync(file, content);
console.log('Patched select onChange for Wali Kelas');
