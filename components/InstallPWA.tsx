import React, { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone, Info, Stethoscope } from 'lucide-react';
import { runPWADiagnostics, PWADiagnosticResult } from '../utils/pwaDiagnostics';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [diagResult, setDiagResult] = useState<PWADiagnosticResult | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);

  const handleRunDiag = async () => {
    setRunningDiag(true);
    try {
      const res = await runPWADiagnostics();
      setDiagResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningDiag(false);
    }
  };

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Check standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    // Check if dismissed recently (within 2 days)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed');
    const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 2 * 24 * 60 * 60 * 1000;

    // Check early captured prompt on window
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      if (!isDismissedRecently) setShowPrompt(true);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
      if (!isDismissedRecently) setShowPrompt(true);
    };

    const handleCustomPrompt = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
        if (!isDismissedRecently) setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-available', handleCustomPrompt);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
      localStorage.removeItem('pwa_prompt_dismissed');
    });

    // On iOS, if not standalone and not dismissed, show banner
    if (ios && !isStandalone && !isDismissedRecently) {
      setShowPrompt(true);
    }

    // Always show if beforeinstallprompt is triggered
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-available', handleCustomPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptObj = deferredPrompt || (window as any).deferredPWAInstallPrompt;
    if (promptObj) {
      promptObj.prompt();
      try {
        const { outcome } = await promptObj.userChoice;
        if (outcome === 'accepted') {
          setShowPrompt(false);
        }
      } catch (err) {
        console.error('Error triggering install prompt:', err);
      }
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowHelpModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-900/50 p-4 z-[100] animate-fade-in flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">
              Install SIM-PANLA 🚀
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Akses cepat tanpa perlu browser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Tutup"
          >
            <X size={18} />
          </button>
          <button
            onClick={handleInstallClick}
            className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
          >
            <Download size={15} />
            Install
          </button>
        </div>
      </div>

      {/* iOS Modal Guide */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <Share size={24} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Cara Install di iOS / iPhone
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Petunjuk menambahkan SIM-PANLA ke Layar Utama:
            </p>

            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200 mb-6">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Ketuk tombol <strong className="text-purple-600 dark:text-purple-400">Bagikan (Share)</strong> di bagian bawah Safari <Share size={14} className="inline ml-1" /></span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Pilih opsi <strong className="text-slate-900 dark:text-white">"Tambahkan ke Layar Utama"</strong> (Add to Home Screen)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Ketuk <strong className="text-purple-600 dark:text-purple-400">Tambah</strong> di kanan atas.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-purple-500/25"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* General Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <Info size={24} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Install Aplikasi SIM-PANLA
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Jika perintah otomatis tidak muncul, Anda dapat menginstalnya secara manual melalui browser:
            </p>

            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200 mb-4">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Klik menu browser (titik 3 di kanan atas Chrome / Edge)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Pilih <strong className="text-purple-600 dark:text-purple-400">"Install SIM-PANLA..."</strong> atau <strong>"Tambahkan ke layar utama"</strong></span>
              </li>
            </ol>

            {/* PWA Diagnostic Panel */}
            <div className="mb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleRunDiag}
                disabled={runningDiag}
                className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800 transition-colors flex items-center justify-center gap-2"
              >
                <Stethoscope size={14} />
                {runningDiag ? 'Memeriksa Konfigurasi PWA...' : 'Cek Status Diagnostik PWA'}
              </button>

              {diagResult && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] space-y-1.5 border border-slate-200 dark:border-slate-700 text-left">
                  <div className="flex justify-between items-center font-bold">
                    <span>HTTPS / Context:</span>
                    <span className={diagResult.isSecureContext ? 'text-emerald-600' : 'text-rose-600'}>
                      {diagResult.isSecureContext ? '✅ Aman' : '❌ Tidak Aman'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span>Manifest Path (/manifest.json):</span>
                    <span className={diagResult.manifest.accessible ? 'text-emerald-600' : 'text-rose-600'}>
                      {diagResult.manifest.accessible ? `✅ 200 OK` : `❌ Error (${diagResult.manifest.status || 'Gagal'})`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span>Dukungan ServiceWorker:</span>
                    <span className={diagResult.hasServiceWorkerSupport ? 'text-emerald-600' : 'text-amber-600'}>
                      {diagResult.hasServiceWorkerSupport ? '✅ Didukung' : '⚠️ Tidak Didukung'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Tips: Buka Console Browser dan jalankan <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-purple-600">checkPWADiagnostics()</code> untuk laporan detail.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-purple-500/25"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
