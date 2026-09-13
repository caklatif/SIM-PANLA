import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/pwaDiagnostics';

// Suppress benign Chrome DevTools soft-navigation 'startTime' and Supabase refresh errors
const isIgnorableError = (msg: string) => {
    return (
        msg.includes("reading 'startTime'") ||
        msg.includes('reading "startTime"') ||
        msg.includes('reportAllChanges') ||
        msg.includes('Refresh Token') ||
        msg.includes('refresh token')
    );
};

const originalConsoleError = console.error;
console.error = (...args) => {
    const first = args[0];
    const msg = typeof first === 'string' ? first : (first?.message || '');
    if (isIgnorableError(msg)) {
        return;
    }
    originalConsoleError.apply(console, args);
};

window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (isIgnorableError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
    }
}, true);

window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || (typeof event?.reason === 'string' ? event.reason : '');
    if (isIgnorableError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
