import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// One-time cache hygiene to purge obsolete test garbage and guarantee cross-browser sync
try {
  const SYNC_VERSION = 'ferex_v8_digital_db_source_of_truth';
  if (localStorage.getItem(SYNC_VERSION) !== 'true') {
    const keysToPurge = [
      'ferex_destinations_registry',
      'ferex_universities_cache',
      'ferex_custom_universities',
      'ferex_local_universities',
      'ferex_registered_countries',
      'ferex_deleted_university_ids',
      // The database is the only source of truth for people and leads. These per-browser copies kept
      // deleted people visible, hid re-created ones, and drifted between browsers.
      'ferex_deleted_student_ids',
      'ferex_deleted_student_emails',
      'ferex_deleted_staff_list',
      'ferex_custom_staff_members',
      'ferex_education_leads_cache',
      'ferex_education_lead_activities_cache',
      'ferex_global_payment_gateways',
      'ferex_openai_api_key',
      'ferex_openrouter_api_key',
      'ferex_system_customization_config',
      'ferex_legalization_cloud_catalog',
      'ferex_visa_cloud_catalog',
      'ferex_meetings_cloud_catalog',
      'ferex_all_admin_meetings',
      'ferex_documents_cloud_catalog',
      'ferex_predeparture_cloud_catalog'
    ];
    keysToPurge.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    Object.keys(localStorage).filter(k => k.startsWith('ferex_staff_registry_cache') || k.startsWith('ferex_conversations_') || k.startsWith('ferex_chat_msgs_') || k.startsWith('ferex_notifications_') || k.startsWith('ferex_journey_overrides_')).forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    // Digital used to keep copies of its tasks, projects, billing and meetings in the browser; the database is now the only source.
    Object.keys(localStorage).filter(k => k.startsWith('ferex_digital_') && k !== 'ferex_digital_avatar').forEach(k => {
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

// Any picture that fails to load (deleted file, bad link, offline) shows a neutral placeholder instead of a broken-image icon.
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice"><rect width="120" height="90" fill="#eef0f3"/><g fill="none" stroke="#a3acb9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="40" y="27" width="40" height="34" rx="5"/><circle cx="52" cy="39" r="3.5"/><path d="M42 58l12-11 9 8 7-6 8 9"/></g></svg>'
);
document.addEventListener('error', (e) => {
  const el = e.target;
  if (el instanceof HTMLImageElement && !el.dataset.fallbackApplied && !el.src.startsWith('data:')) {
    el.dataset.fallbackApplied = 'true';
    el.src = PLACEHOLDER;
    el.srcset = '';
  }
}, true);
