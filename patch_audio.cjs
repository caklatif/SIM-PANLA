const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

const audioLogic = `  const playBeep = (
    type: "success" | "warning" | "error",
    forcePlay = false,
  ) => {
    if (!soundEnabled && !forcePlay) return;
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (ctx.state === "suspended") {
        ctx.resume();
      }`;

const targetMatch = code.indexOf('const playBeep = (');
if (targetMatch !== -1) {
    console.log("Found playBeep");
} else {
    console.log("Not found playBeep");
}
