const fs = require('fs');
const path = 'pages/PublicDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const t1 = `<style>{\`
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

const r1 = `<style>{\`
                @keyframes neon-sweep-slow {
                  0% { background-position: -200% 50%; }
                  100% { background-position: 200% 50%; }
                }
                .neon-sweep-anim {
                  background: linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.1) 20%, rgba(168,85,247,0.8) 50%, rgba(168,85,247,0.1) 80%, transparent 100%);
                  background-size: 200% 100%;
                  animation: neon-sweep-slow 8s ease-in-out infinite;
                }
              \`}</style>
          <div className="relative rounded-[2rem] group">
              {/* Neon glow effect sweeping from left to right */}
              <div className="absolute -inset-[3px] rounded-[2rem] neon-sweep-anim blur-[8px] opacity-100 z-0"></div>
              
              <div className="bg-white rounded-[2rem] p-2 sm:p-2.5 relative flex flex-col justify-center shadow-md h-full w-full z-10">`;

const t2 = `<div className="flex flex-col items-end gap-1.5 shrink-0 justify-center bg-slate-50 border border-slate-200/70 rounded-[1.25rem] px-3 py-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative">
                          {/* Inner divider */}
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-gradient-to-b from-purple-200 via-purple-400 to-purple-200 rounded-full hidden min-[450px]:block" />`;

const r2 = `<div className="flex flex-col items-end gap-1.5 shrink-0 justify-center rounded-[1.25rem] px-2 py-1 relative">
                          {/* Inner divider */}
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-[2px] h-[60%] bg-gradient-to-b from-purple-200 via-purple-400 to-purple-200 rounded-full hidden min-[450px]:block" />`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
}
if (content.includes(t2)) {
    content = content.replace(t2, r2);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Patched neon and removed borders');
