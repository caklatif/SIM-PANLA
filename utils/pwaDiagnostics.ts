export interface PWADiagnosticResult {
  timestamp: string;
  isSecureContext: boolean;
  protocol: string;
  host: string;
  userAgent: string;
  standalone: boolean;
  hasServiceWorkerSupport: boolean;
  serviceWorkerRegistrations: {
    scope: string;
    activeState: string | null;
  }[];
  manifest: {
    accessible: boolean;
    status: number | null;
    contentType: string | null;
    content: any | null;
    errors: string[];
  };
  iconChecks: {
    url: string;
    accessible: boolean;
    status: number | null;
  }[];
  overallStatus: 'ok' | 'warning' | 'error';
  recommendations: string[];
}

export async function runPWADiagnostics(): Promise<PWADiagnosticResult> {
  const result: PWADiagnosticResult = {
    timestamp: new Date().toISOString(),
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol,
    host: window.location.host,
    userAgent: navigator.userAgent,
    standalone: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
    hasServiceWorkerSupport: 'serviceWorker' in navigator,
    serviceWorkerRegistrations: [],
    manifest: {
      accessible: false,
      status: null,
      contentType: null,
      content: null,
      errors: [],
    },
    iconChecks: [],
    overallStatus: 'ok',
    recommendations: [],
  };

  // 1. Check Service Worker
  if (result.hasServiceWorkerSupport) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      result.serviceWorkerRegistrations = registrations.map(reg => ({
        scope: reg.scope,
        activeState: reg.active ? reg.active.state : (reg.installing ? 'installing' : (reg.waiting ? 'waiting' : null)),
      }));
      if (registrations.length === 0) {
        result.recommendations.push('No active ServiceWorker registration found. If using vite-plugin-pwa, verify build or register sw.js if offline caching is required.');
      }
    } catch (e: any) {
      result.recommendations.push(`Failed to check serviceWorker registrations: ${e?.message || e}`);
    }
  } else {
    result.overallStatus = 'error';
    result.recommendations.push('Browser does not support Service Workers or is running in non-secure context.');
  }

  // 2. Check Secure Context / HTTPS
  if (!result.isSecureContext && result.protocol !== 'http:' && !result.host.includes('localhost')) {
    result.overallStatus = 'error';
    result.recommendations.push('PWA requires a secure context (HTTPS or localhost).');
  }

  // 3. Fetch Manifest File
  try {
    const res = await fetch('/manifest.json', { cache: 'no-cache' });
    result.manifest.status = res.status;
    result.manifest.contentType = res.headers.get('content-type');

    if (res.ok) {
      result.manifest.accessible = true;
      try {
        const json = await res.json();
        result.manifest.content = json;

        // Validate manifest fields
        if (!json.name) result.manifest.errors.push('Missing "name" field');
        if (!json.short_name) result.manifest.errors.push('Missing "short_name" field');
        if (!json.start_url) result.manifest.errors.push('Missing "start_url" field');
        if (!json.display) result.manifest.errors.push('Missing "display" field');
        if (!Array.isArray(json.icons) || json.icons.length === 0) {
          result.manifest.errors.push('Missing or empty "icons" array');
        } else {
          // Check icon paths listed in manifest
          const iconUrls = json.icons.map((i: any) => i.src).filter(Boolean);
          for (const iconUrl of iconUrls) {
            try {
              const iconRes = await fetch(iconUrl, { method: 'HEAD', cache: 'no-cache' });
              result.iconChecks.push({
                url: iconUrl,
                accessible: iconRes.ok,
                status: iconRes.status,
              });
              if (!iconRes.ok) {
                result.manifest.errors.push(`Icon at ${iconUrl} returned status ${iconRes.status}`);
              }
            } catch (err: any) {
              result.iconChecks.push({
                url: iconUrl,
                accessible: false,
                status: null,
              });
              result.manifest.errors.push(`Failed to fetch icon at ${iconUrl}`);
            }
          }
        }
      } catch (err) {
        result.manifest.errors.push('Manifest response is not valid JSON');
        result.overallStatus = 'error';
      }
    } else {
      result.manifest.errors.push(`HTTP status ${res.status} when fetching /manifest.json`);
      result.overallStatus = 'error';
    }
  } catch (err: any) {
    result.manifest.errors.push(`Network error fetching /manifest.json: ${err?.message || err}`);
    result.overallStatus = 'error';
  }

  if (result.manifest.errors.length > 0) {
    if (result.overallStatus !== 'error') result.overallStatus = 'warning';
    result.recommendations.push(...result.manifest.errors.map(err => `Manifest issue: ${err}`));
  }

  return result;
}

// Expose on window object for easy debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).checkPWADiagnostics = async () => {
    console.log('🔍 Running PWA Diagnostic Check...');
    const report = await runPWADiagnostics();
    console.group('📱 SIM-PANLA PWA Diagnostic Report');
    console.log('Overall Status:', report.overallStatus === 'ok' ? '✅ OK' : report.overallStatus === 'warning' ? '⚠️ WARNING' : '❌ ERROR');
    console.log('Secure Context (HTTPS):', report.isSecureContext ? '✅ Yes' : '❌ No');
    console.log('Standalone Mode:', report.standalone ? 'Yes (Installed)' : 'No (Browser Mode)');
    console.log('ServiceWorker Support:', report.hasServiceWorkerSupport ? '✅ Supported' : '❌ Not Supported');
    console.log('ServiceWorker Registrations:', report.serviceWorkerRegistrations);
    console.log('Manifest Status:', report.manifest.accessible ? '✅ Accessible' : '❌ Inaccessible', report.manifest);
    console.log('Icon Checks:', report.iconChecks);
    if (report.recommendations.length > 0) {
      console.warn('Recommendations / Issues:', report.recommendations);
    }
    console.groupEnd();
    return report;
  };
}
