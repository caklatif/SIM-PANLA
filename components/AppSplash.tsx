import React, { useEffect, useState } from 'react';

const AppSplash: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [animatingOut, setAnimatingOut] = useState(false);

  useEffect(() => {
    // Show for 2 seconds, then fade out
    const timer = setTimeout(() => {
      setAnimatingOut(true);
      setTimeout(() => setVisible(false), 500); // 500ms fade duration
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] bg-gradient-to-br from-purple-50 to-white flex flex-col items-center justify-center transition-opacity duration-500 ${animatingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex flex-col items-center animate-bounce-slight">
        <img 
          src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" 
          alt="Logo" 
          className="w-24 h-32 object-contain drop-shadow-xl mb-4" 
        />
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Selamat Datang</h1>
        <h2 className="text-xs font-extrabold text-purple-700 tracking-wider text-center px-4 mt-1">
          UPT SMP NEGERI 8 PASURUAN
        </h2>
      </div>
      
      <style>{`
        .animate-bounce-slight {
          animation: bounce-slight 2s infinite ease-in-out;
        }
        @keyframes bounce-slight {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default AppSplash;
