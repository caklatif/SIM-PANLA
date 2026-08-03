import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-purple-100 dark:border-slate-700 p-4 z-[100] animate-fade-in flex items-center justify-between gap-4">
      <div className="flex-1">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Install SIM-PANLA 🚀</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tambahkan ke layar utama agar lebih cepat dan mudah diakses.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPrompt(false)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={18} />
        </button>
        <button
          onClick={handleInstallClick}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
        >
          <Download size={16} />
          Install
        </button>
      </div>
    </div>
  );
}
