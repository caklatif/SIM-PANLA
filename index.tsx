import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './utils/pwaDiagnostics';


const originalConsoleError = console.error;
console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (args[0].includes('Refresh Token') || args[0].includes('refresh token'))) {
        return;
    }
    if (args[0] && args[0].message && (args[0].message.includes('Refresh Token') || args[0].message.includes('refresh token'))) {
        return;
    }
    originalConsoleError.apply(console, args);
};

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && (event.reason.message.includes('Refresh Token') || event.reason.message.includes('refresh token'))) {
        console.log('Silenced benign Supabase refresh token error');
        event.preventDefault(); // Prevent it from appearing as an unhandled error
    }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);