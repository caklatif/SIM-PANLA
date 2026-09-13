import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Ignore benign Chrome DevTools soft navigation error
    if (error?.message && (error.message.includes("reading 'startTime'") || error.message.includes('reportAllChanges'))) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error?.message && (error.message.includes("reading 'startTime'") || error.message.includes('reportAllChanges'))) {
      return;
    }
    console.error('SIM-PANLA ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F7FF] p-4 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-100 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-inner">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Terjadi Kendala Teknis</h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              {this.state.error?.message || 'Aplikasi mengalami kesalahan sementara saat memuat tampilan.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-purple-200"
              >
                <RefreshCw size={16} />
                Muat Ulang Halaman
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '#/';
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                <Home size={16} />
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
