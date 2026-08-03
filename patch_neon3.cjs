const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="relative rounded-[2rem] p-[2.5px] group">
              {/* Neon glow effect behind the border (Static Left to Right) */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-600 blur-[8px] opacity-70"></div>
              {/* Solid border with left to right gradient */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-purple-500 via-purple-300 to-purple-500"></div>
              
              <div className="bg-white rounded-[calc(2rem-2.5px)] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-inner h-full w-full z-10">`;

const repl = `<style>{\`
                @keyframes neon-sweep {
                  0% { background-position: 200% 50%; }
                  100% { background-position: -200% 50%; }
                }
                .neon-sweep-anim {
                  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(147,51,234,0) 30%, rgba(168,85,247,0.9) 50%, rgba(147,51,234,0) 70%, rgba(255,255,255,0) 100%);
                  background-size: 200% auto;
                  animation: neon-sweep 4s linear infinite;
                }
              \`}</style>
          <div className="relative rounded-[2rem] group">
              {/* Neon glow effect sweeping from left to right */}
              <div className="absolute inset-0 rounded-[2rem] neon-sweep-anim blur-[10px] opacity-100 z-0 translate-y-0.5"></div>
              
              <div className="bg-white rounded-[2rem] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-sm h-full w-full z-10">`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched top header neon sweeping');
} else {
    console.log('Target top header not found');
}
