import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { setAlertMethods } from '../utils/alert';

interface AlertState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
}

export const CustomAlertProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  useEffect(() => {
    setAlertMethods(
      (message: string, title?: string) => {
        return new Promise((resolve) => {
          setAlertState({ isOpen: true, type: 'alert', message, title, resolve });
        });
      },
      (message: string, title?: string) => {
        return new Promise((resolve) => {
          setAlertState({ isOpen: true, type: 'confirm', message, title, resolve });
        });
      }
    );
  }, []);

  const handleClose = (result: boolean) => {
    if (alertState) {
      alertState.resolve(result);
      setAlertState(null);
    }
  };

  return (
    <>
      {children}
      {alertState && alertState.isOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" style={{ animationDuration: '0.2s' }}>
           <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700 transform scale-100 transition-all">
              <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alertState.type === 'confirm' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                      {alertState.type === 'confirm' ? <AlertCircle size={24} /> : <Info size={24} />}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                      {alertState.title || (alertState.type === 'confirm' ? 'Konfirmasi' : 'Informasi')}
                  </h3>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-8 whitespace-pre-line leading-relaxed">
                  {alertState.message}
              </p>
              <div className="flex justify-end gap-3">
                  {alertState.type === 'confirm' && (
                      <button 
                          onClick={() => handleClose(false)} 
                          className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                          Batal
                      </button>
                  )}
                  <button 
                      onClick={() => handleClose(true)} 
                      className={`px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md active:scale-95 bg-purple-600 hover:bg-purple-700 shadow-purple-200`}
                  >
                      {alertState.type === 'confirm' ? 'Ya, Lanjutkan' : 'Mengerti'}
                  </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};
