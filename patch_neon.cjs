const fs = require('fs');
const path = '/app/applet/pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="relative rounded-[2rem] p-[2.5px] shadow-[0_0_25px_rgba(168,85,247,0.5)] overflow-hidden group">
              {/* Static background for border */}
              <div className="absolute inset-0 bg-slate-100"></div>
              {/* Rotating neon gradient */}
              <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_90deg,#9333ea_180deg,#c084fc_270deg,transparent_360deg)] animate-[spin_3s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="bg-white rounded-[calc(2rem-2.5px)] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-inner h-full w-full">`;

const repl = `<style>{\`
                @keyframes neon-slide {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
                .neon-slide-bg {
                  background: linear-gradient(90deg, #9333ea, #e9d5ff, #c084fc, #9333ea);
                  background-size: 300% 100%;
                  animation: neon-slide 4s linear infinite;
                }
              \`}</style>
          <div className="relative rounded-[2rem] p-[2.5px] group">
              {/* Neon glow effect behind the border */}
              <div className="absolute inset-0 rounded-[2rem] neon-slide-bg blur-[8px] opacity-60"></div>
              {/* Solid border with sliding gradient */}
              <div className="absolute inset-0 rounded-[2rem] neon-slide-bg"></div>
              
              <div className="bg-white rounded-[calc(2rem-2.5px)] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-inner h-full w-full z-10">`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched top header neon');
} else {
    console.log('Target top header not found');
}
