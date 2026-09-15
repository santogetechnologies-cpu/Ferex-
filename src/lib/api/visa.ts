import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { generateUUID } from '../../utils/uuid';

export interface VisaTrackingRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  vfs_ref_no: string;
  embassy_name: string;
  vfs_center: string;
  appointment_date: string;
  passport_no: string;
  courier_tracking_no: string;
  current_stage: number;
  status_label: string;
  decision_outcome: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  updated_at: string;
}

const VISA_CATALOG_KEY = 'ferex_visa_records_catalog';

async function fetchVisaCatalog(): Promise<VisaTrackingRecord[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('value')
      .eq('key', VISA_CATALOG_KEY)
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return data.value;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('ferex_visa_cloud_catalog');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function syncVisaToCloudCatalog(record: VisaTrackingRecord) {
  try {
    const current = await fetchVisaCatalog();
    const filtered = current.filter(r =>
      r.id !== record.id &&
      r.student_id !== record.student_id &&
      (!record.student_email || r.student_email?.toLowerCase() !== record.student_email.toLowerCase())
    );
    const updated = [record, ...filtered];
    try {
      localStorage.setItem('ferex_visa_cloud_catalog', JSON.stringify(updated));
    } catch {}
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      key: VISA_CATALOG_KEY,
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.warn('[syncVisaToCloudCatalog notice]:', e);
  }
}

function matchesStudent(r: VisaTrackingRecord, targetId?: string): boolean {
  if (!targetId) return true;
  const t = targetId.toLowerCase().trim();
  return Boolean(
    (r.student_id && r.student_id.toLowerCase().trim() === t) ||
    (r.id && r.id.toLowerCase().trim() === t) ||
    (r.student_email && r.student_email.toLowerCase().trim() === t) ||
    (r.student_name && r.student_name.toLowerCase().trim() === t)
  );
}

export async function getVisaRecords(studentIdentifier?: string): Promise<VisaTrackingRecord[]> {
  const cloudCatalog = await fetchVisaCatalog();
  const normalized = cloudCatalog.map((r: any) => {
    const statusLower = String(r.status_label || r.status || '').toLowerCase();
    const stageNum = Number(r.current_stage) || 1;
    let outcome = r.decision_outcome;
    if (!outcome || (outcome === 'Pending' && stageNum === 8)) {
      if (statusLower.includes('reject') || statusLower.includes('refus')) {
        outcome = 'Rejected';
      } else if (stageNum === 8 || statusLower.includes('approv') || statusLower.includes('result confirmed')) {
        outcome = 'Approved';
      } else {
        outcome = 'Pending';
      }
    }

    return {
      id: r.id,
      student_id: r.student_id || r.id,
      student_name: r.student_name || 'Student',
      student_email: r.student_email || (r.student_id?.includes('@') ? r.student_id : ''),
      vfs_ref_no: r.vfs_ref_no || 'VFS-POL-2026',
      embassy_name: r.embassy_name || 'Embassy of Poland',
      vfs_center: r.vfs_center || 'VFS Global Center',
      appointment_date: r.appointment_date || 'Scheduled',
      passport_no: r.passport_no || 'Verified',
      courier_tracking_no: r.courier_tracking_no || 'Assigned',
      current_stage: stageNum,
      status_label: outcome === 'Approved' && (r.status_label === 'Visa Result Confirmed' || !r.status_label)
        ? 'Visa Approved & Stamped'
        : (r.status_label || 'VFS Processing'),
      decision_outcome: outcome as 'Pending' | 'Approved' | 'Rejected',
      notes: r.notes || 'VFS tracking updated.',
      updated_at: r.updated_at || new Date().toISOString()
    };
  });

  if (studentIdentifier) {
    return normalized.filter(r => matchesStudent(r, studentIdentifier));
  }
  return normalized;
}

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function cleanDate(d?: string): string {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  } catch {}
  return '';
}

export async function updateVisaStatus(
  id: string,
  updates: Partial<VisaTrackingRecord>
): Promise<VisaTrackingRecord | null> {
  const targetStage = updates.current_stage !== undefined ? Number(updates.current_stage) : undefined;
  let resolvedOutcome = updates.decision_outcome;
  if (!resolvedOutcome || (resolvedOutcome === 'Pending' && targetStage === 8)) {
    if (updates.status_label?.toLowerCase().includes('reject') || updates.status_label?.toLowerCase().includes('refus')) {
      resolvedOutcome = 'Rejected';
    } else if (targetStage === 8 || updates.status_label?.toLowerCase().includes('approv') || updates.status_label?.toLowerCase().includes('result confirmed')) {
      resolvedOutcome = 'Approved';
    } else {
      resolvedOutcome = 'Pending';
    }
  }

  let finalStatusLabel = updates.status_label;
  if (resolvedOutcome === 'Approved') {
    finalStatusLabel = 'Visa Approved & Stamped';
  } else if (resolvedOutcome === 'Rejected') {
    finalStatusLabel = 'Visa Application Refused by Embassy';
  }

  const validId = id || generateUUID();
  const studentEmail = updates.student_email || (updates.student_id?.includes('@') ? updates.student_id : '');

  const upsertPayload: VisaTrackingRecord = {
    id: validId,
    student_id: updates.student_id || validId,
    student_name: updates.student_name || 'Student',
    student_email: studentEmail,
    vfs_ref_no: updates.vfs_ref_no || 'VFS-POL-2026',
    embassy_name: updates.embassy_name || 'Embassy of Poland',
    vfs_center: updates.vfs_center || 'VFS Global Center',
    appointment_date: cleanDate(updates.appointment_date) || new Date().toISOString().split('T')[0],
    passport_no: updates.passport_no || 'Z-9041284',
    courier_tracking_no: updates.courier_tracking_no || 'BLUEDART-89041256',
    current_stage: Number(updates.current_stage) || (resolvedOutcome === 'Approved' || resolvedOutcome === 'Rejected' ? 8 : 1),
    status_label: finalStatusLabel || (Number(updates.current_stage) === 8 ? 'Visa Approved & Stamped' : 'VFS Processing'),
    decision_outcome: resolvedOutcome || 'Pending',
    notes: updates.notes || 'VFS tracking updated.',
    updated_at: new Date().toISOString(),
  };

  await syncVisaToCloudCatalog(upsertPayload);

  if (upsertPayload.student_id) {
    try {
      const { createNotification } = await import('./notifications');
      const { updateApplicationStatus, getApplications } = await import('./applications');
      const { getJourneyStages, updateJourneyStageStatus } = await import('./journey');

      const isApproved = updates.decision_outcome === 'Approved' || String(upsertPayload.status_label).toLowerCase().includes('approved');
      const isRejected = updates.decision_outcome === 'Rejected' || String(upsertPayload.status_label).toLowerCase().includes('refus');

      // Auto update student application
      try {
        const studentApps = await getApplications(upsertPayload.student_id);
        const activeApp = studentApps[0];
        if (activeApp) {
          if (isApproved && (activeApp.status as string) !== 'Visa Approved') {
            await updateApplicationStatus(activeApp.id, 'Visa Approved', 'Visa Approved & Stamped by Embassy!');
          } else if (isRejected && (activeApp.status as string) !== 'Visa Rejected') {
            await updateApplicationStatus(activeApp.id, 'Visa Rejected', 'Visa Decision: Refused by Embassy');
          }
        }
      } catch (appErr) {}

      // Auto advance journey stage 12 (Visa Outcome)
      try {
        const stages = await getJourneyStages(upsertPayload.student_id);
        const visaStage = stages.find(s => s.stage_number === 4 || s.stage_number === 8 || s.stage_name?.toLowerCase().includes('visa'));
        if (visaStage && isApproved && visaStage.status !== 'Completed') {
          await updateJourneyStageStatus(visaStage.id, 'Completed');
        }
      } catch (stageErr) {}

      await createNotification({
        user_id: upsertPayload.student_id,
        title: isApproved ? 'Visa Approved & Stamped' : isRejected ? 'Visa Decision Update' : 'VFS Visa Tracking Updated',
        body: isApproved
          ? 'Your Poland National Student D-Visa has been officially approved & stamped by the Embassy!'
          : isRejected
          ? 'Your visa application verdict has been updated to Refused by Embassy.'
          : `Your VFS Visa status: ${upsertPayload.status_label || 'Processing'} (Stage ${upsertPayload.current_stage || 1}).`,
        category: 'VFS Visa'
      });
    } catch (e) {}
  }

  window.dispatchEvent(new Event('ferex_visa_change'));
  window.dispatchEvent(new Event('ferex_application_change'));
  window.dispatchEvent(new Event('ferex_notification_change'));
  return upsertPayload;
}

export const updateVisaRecord = updateVisaStatus;
