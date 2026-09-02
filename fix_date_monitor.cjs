const fs = require('fs');
let code = fs.readFileSync('pages/OperatorDashboard.tsx', 'utf8');

// 1. Add isManualDateRef
const stateDecl = `  const [filterDate, setFilterDate] = useState(getWIBISOString());
  const [searchTerm, setSearchTerm] = useState('');`;
const stateDeclNew = `  const [filterDate, setFilterDate] = useState(getWIBISOString());
  const isManualDateRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');`;

if (code.includes(stateDecl)) {
    code = code.replace(stateDecl, stateDeclNew);
} else {
    console.log("Failed to inject isManualDateRef");
}

// 2. Add midnight auto-refresh effect
const effectDecl = `  useEffect(() => { const rotationTimer = setInterval(() => { setRotationIndex(prev => prev + 1); }, 3000); return () => clearInterval(rotationTimer); }, []);`;
const effectDeclNew = `  useEffect(() => { const rotationTimer = setInterval(() => { setRotationIndex(prev => prev + 1); }, 3000); return () => clearInterval(rotationTimer); }, []);
  
  // Auto-update date at midnight if not manually changed
  useEffect(() => {
    const dayCheckInterval = setInterval(() => {
      if (!isManualDateRef.current) {
        const today = getWIBISOString();
        if (filterDate !== today) {
          setFilterDate(today);
        }
      }
    }, 60000); // Check every minute
    return () => clearInterval(dayCheckInterval);
  }, [filterDate]);`;

if (code.includes(effectDecl)) {
    code = code.replace(effectDecl, effectDeclNew);
} else {
    console.log("Failed to inject midnight interval");
}

// 3. Add Hari Ini button and update onChange
const dateInputOld = `<input type="date" className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}/>`;
const dateInputNew = `<input type="date" className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer" value={filterDate} onChange={(e) => { isManualDateRef.current = true; setFilterDate(e.target.value); }}/>
                                {filterDate !== getWIBISOString() && (
                                    <button 
                                        onClick={() => { isManualDateRef.current = false; setFilterDate(getWIBISOString()); }}
                                        className="ml-2 px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-[10px] font-bold transition-colors"
                                    >
                                        Hari Ini
                                    </button>
                                )}`;

if (code.includes(dateInputOld)) {
    code = code.replace(dateInputOld, dateInputNew);
} else {
    console.log("Failed to inject date input changes");
}

fs.writeFileSync('pages/OperatorDashboard.tsx', code);
console.log("Patched OperatorDashboard.tsx");
