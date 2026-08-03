const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has isStartDateInitialized
    if (!content.includes('isStartDateInitialized')) {
        const stateTarget = `const [startDate, setStartDate] = useState(() => {`;
        const stateReplacement = `const [isStartDateInitialized, setIsStartDateInitialized] = useState(false);\n  const [startDate, setStartDate] = useState(() => {`;
        content = content.replace(stateTarget, stateReplacement);
        
        const effectBlock = `useEffect(() => {
    if (semesterStart && !isStartDateInitialized) {
        setStartDate(semesterStart);
        setIsStartDateInitialized(true);
    }
  }, [semesterStart, isStartDateInitialized]);\n\n`;
        
        // Find the first useEffect and place it before it
        const firstEffectIndex = content.indexOf('useEffect(() => {');
        if (firstEffectIndex !== -1) {
            content = content.slice(0, firstEffectIndex) + effectBlock + content.slice(firstEffectIndex);
        }
    }
    
    fs.writeFileSync(filePath, content);
}

const files = [
    path.join(__dirname, '../pages/AbsensiRapor.tsx'),
    path.join(__dirname, '../pages/Kedisiplinan.tsx'),
    path.join(__dirname, '../pages/RekapDhuha.tsx')
];

files.forEach(updateFile);
console.log('Fixed date defaults');
