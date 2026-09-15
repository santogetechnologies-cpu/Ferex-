import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// One-time cache hygiene to purge obsolete test garbage and guarantee cross-browser sync
try {
  const SYNC_VERSION = 'ferex_v3_clean_sync_ok';
  if (localStorage.getItem(SYNC_VERSION) !== 'true') {
    const keysToPurge = [
      'ferex_destinations_registry',
      'ferex_universities_cache',
      'ferex_custom_universities',
      'ferex_local_universities',
      'ferex_registered_countries',
      'ferex_deleted_university_ids'
    ];
    keysToPurge.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    localStorage.setItem(SYNC_VERSION, 'true');
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
