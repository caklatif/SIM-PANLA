const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../pages/JurnalForm.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add handleDhuhaSubmit
const submitBlock = `  const handleFinishAssessment = () => { setShowStudentChecklistModal(false); handleSubmitFinal(missingStudents, assessmentType); };`;
const dhuhaSubmit = `
  const handleDhuhaSubmit = () => {
      // Auto fill cleanliness and validation for Dhuha
      setFormData(prev => ({ ...prev, cleanliness: 'sudah_bersih', isConfirmed: true }));
      // Call handleSubmitFinal directly without assessment
      handleSubmitFinal([], 'none', { cleanliness: 'sudah_bersih', isConfirmed: true });
  };
`;
content = content.replace(submitBlock, submitBlock + dhuhaSubmit);

// Allow passing overrides to handleSubmitFinal
content = content.replace(
    `const handleSubmitFinal = async (missingIds: string[], type: string) => {`,
    `const handleSubmitFinal = async (missingIds: string[], type: string, overrides?: { cleanliness: string, isConfirmed: boolean }) => {`
);

content = content.replace(
    `const validationStatus = formData.isConfirmed ? 'hadir_kbm' : 'inval';`,
    `const validationStatus = (overrides ? overrides.isConfirmed : formData.isConfirmed) ? 'hadir_kbm' : 'inval';`
);

content = content.replace(
    `const payload = { hours: formData.hours.join(','), material: formData.material, cleanliness: formData.cleanliness, validation: validationStatus, notes: formData.notes, assessment_type: type, assessment_missing_students: JSON.stringify(missingNames) };`,
    `const payload = { hours: formData.hours.join(','), material: formData.material, cleanliness: (overrides ? overrides.cleanliness : formData.cleanliness), validation: validationStatus, notes: formData.notes, assessment_type: type, assessment_missing_students: JSON.stringify(missingNames) };`
);

// Replace onClick in Step 2 for Kirim Data
content = content.replace(
    `onClick={isDhuha ? handleSubmit : handleNext}`,
    `onClick={isDhuha ? handleDhuhaSubmit : handleNext}`
);

// We need to disable the button check for isDhuha in Step 2 if isSubmitting or loading
content = content.replace(
    `disabled={!formData.subject || !formData.material || isSubmitting}`,
    `disabled={!formData.subject || !formData.material || loading}`
);
content = content.replace(
    `isSubmitting ? 'Mengirim...'`,
    `loading ? 'Mengirim...'`
);


fs.writeFileSync(file, content);
console.log('Fixed Dhuha submit');
