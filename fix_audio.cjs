const fs = require('fs');
let code = fs.readFileSync('pages/PresensiQR.tsx', 'utf8');

// 1. Replace playBeep internals
const playBeepOld = `  const playBeep = (
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

const playBeepNew = `  const playBeep = (
    type: "success" | "warning" | "error",
    forcePlay = false,
  ) => {
    if (!soundEnabled && !forcePlay) return;
    try {
      const ctx = initAudio();
      if (!ctx) return;
      
      if (ctx.state === "suspended") {
        ctx.resume();
      }`;

code = code.replace(playBeepOld, playBeepNew);

// 2. Add global audio logic before the component
const componentStart = `export default function PresensiQR() {`;
const globalAudioLogic = `
let globalAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

const initAudio = () => {
  if (!globalAudioCtx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  return globalAudioCtx;
};

const unlockAudio = () => {
  if (isAudioUnlocked) return;
  const ctx = initAudio();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.1);
      isAudioUnlocked = true;
    } catch(e) {}
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

export default function PresensiQR() {`;

code = code.replace(componentStart, globalAudioLogic);

fs.writeFileSync('pages/PresensiQR.tsx', code);
console.log("Audio fixed");
