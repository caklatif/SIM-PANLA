import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';

export const TeacherLoginSplash: React.FC<{ onFinish: () => void, hasUnfilled: boolean, notifCount: number }> = ({ onFinish, hasUnfilled, notifCount }) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 5000); 
    return () => clearTimeout(timer);
  }, [onFinish]);

  const targetX = (windowSize.width / 2) - 40;
  const targetY = -(windowSize.height / 2) + 40;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 5, times: [0, 0.05, 0.9, 1] }}
      className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, x: 0, y: 0 }}
        animate={{ 
          scale: [0.5, 1.2, 1, 1, 0.1], 
          opacity: [0, 1, 1, 1, 0], 
          x: [0, 0, 0, 0, targetX], 
          y: [0, 0, 0, 0, targetY] 
        }}
        transition={{ duration: 4.5, times: [0, 0.1, 0.15, 0.7, 1], ease: "easeInOut" }}
        className="flex flex-col items-center"
      >
         <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4.5, times: [0, 0.1, 0.6, 0.7] }}
            className="text-3xl font-extrabold text-white text-center tracking-wide leading-tight mb-8 drop-shadow-lg max-w-lg"
         >
             Anda Memiliki {notifCount} Pemberitahuan. Klik Icon berikut!
         </motion.h1>
         <div className="relative">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)]">
                 <Bell size={48} className="text-purple-600" />
             </div>
             {hasUnfilled && (
                 <span className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center text-sm font-bold text-white border-4 border-slate-900 rounded-full bg-red-500 shadow-lg">
                     {notifCount}
                 </span>
             )}
         </div>
      </motion.div>
    </motion.div>
  );
};
