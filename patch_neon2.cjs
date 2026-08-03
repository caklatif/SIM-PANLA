const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<style>{\`
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
              <div className="absolute inset-0 rounded-[2rem] neon-slide-bg"></div>`;

const repl = `<div className="relative rounded-[2rem] p-[2.5px] group">
              {/* Neon glow effect behind the border (Static Left to Right) */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-600 blur-[8px] opacity-70"></div>
              {/* Solid border with left to right gradient */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-purple-500 via-purple-300 to-purple-500"></div>`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched neon static');
} else {
    console.log('Target neon not found');
}
