const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const targetStr = `{/* Sound Beep Toggle */}`;
const replaceStr = `{/* Test Bell Button */}
                        <button
                          type="button"
                          onClick={() => playBeep("success", true)}
                          title="Test Suara Lonceng Sukses"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900"
                        >
                          <Volume2 size={14} />
                          <span className="hidden sm:inline">Test Lonceng</span>
                        </button>

                        {/* Sound Beep Toggle */}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('pages/PresensiQR.tsx', code);
  console.log("Button added");
} else {
  console.log("Target string not found");
}
