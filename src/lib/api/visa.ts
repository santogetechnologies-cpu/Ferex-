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

function cleanDate(d?: string): string {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  } catch {}
  return '';
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
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    let query = client
      .from('visa_applications')
      .select('*, users:student_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (studentIdentifier && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentIdentifier)) {
      query = query.eq('student_id', studentIdentifier);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const records: VisaTrackingRecord[] = data.map((r: any) => {
        const studentObj = r.users || {};
        const outcome = (r.decision_outcome || (r.status === 'Visa Approved' ? 'Approved' : r.status === 'Visa Refused' ? 'Rejected' : 'Pending')) as 'Pending' | 'Approved' | 'Rejected';
        return {
          id: r.id,
          student_id: r.student_id,
          student_name: studentObj.full_name || r.notes?.match(/Student:\s*([^,\.]+)/)?.[1] || 'Enrolled Student',
          student_email: studentObj.email || '',
          vfs_ref_no: r.vfs_ref_no || r.reference_no || 'VFS-POL-2026',
          embassy_name: r.country ? `Embassy of ${r.country}` : 'Embassy of Poland',
          vfs_center: r.vfs_center || 'VFS Global Center',
          appointment_date: r.appointment_date || '',
          passport_no: r.passport_no || '',
          courier_tracking_no: r.courier_tracking_no || r.tracking_id || '',
          current_stage: r.current_stage || (outcome === 'Approved' ? 8 : 1),
          status_label: r.status_label || r.status || 'VFS Processing',
          decision_outcome: outcome,
          notes: r.notes || '',
          updated_at: r.updated_at || r.created_at || new Date().toISOString()
        };
      });

      if (studentIdentifier) {
        return records.filter(r => matchesStudent(r, studentIdentifier));
      }
      return records;
    }
  } catch (dbErr) {
    console.warn('[getVisaRecords DB query notice]:', dbErr);
  }

  // Fallback to system_config or localStorage
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('value')
      .eq('key', VISA_CATALOG_KEY)
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      if (studentIdentifier) return (data.value as VisaTrackingRecord[]).filter(r => matchesStudent(r, studentIdentifier));
      return data.value as VisaTrackingRecord[];
    }
  } catch {}

  try {
    const raw = localStorage.getItem('ferex_visa_cloud_catalog');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (studentIdentifier) return parsed.filter((r: any) => matchesStudent(r, studentIdentifier));
      return parsed;
    }
  } catch {}

  return [];
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
  const nowIso = new Date().toISOString();

  const upsertPayload: VisaTrackingRecord = {
    id: validId,
    student_id: updates.student_id || validId,
    student_name: updates.student_name || 'Student',
    student_email: studentEmail,
    vfs_ref_no: updates.vfs_ref_no || 'VFS-POL-2026',
    embassy_name: updates.embassy_name || 'Embassy of Poland',
    vfs_center: updates.vfs_center || 'VFS Global Center',
    appointment_date: cleanDate(updates.appointment_date) || nowIso.split('T')[0],
    passport_no: updates.passport_no || '',
    courier_tracking_no: updates.courier_tracking_no || '',
    current_stage: Number(updates.current_stage) || (resolvedOutcome === 'Approved' || resolvedOutcome === 'Rejected' ? 8 : 1),
    status_label: finalStatusLabel || (Number(updates.current_stage) === 8 ? 'Visa Approved & Stamped' : 'VFS Processing'),
    decision_outcome: resolvedOutcome || 'Pending',
    notes: updates.notes || 'VFS tracking updated.',
    updated_at: nowIso,
  };

  // 1. Persist directly into public.visa_applications
  if (upsertPayload.student_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(upsertPayload.student_id)) {
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;

      await client.from('visa_applications').upsert({
        id: validId,
        student_id: upsertPayload.student_id,
        vfs_ref_no: upsertPayload.vfs_ref_no,
        vfs_center: upsertPayload.vfs_center,
        appointment_date: upsertPayload.appointment_date ? cleanDate(upsertPayload.appointment_date) : null,
        passport_no: upsertPayload.passport_no,
        courier_tracking_no: upsertPayload.courier_tracking_no,
        current_stage: upsertPayload.current_stage,
        status_label: upsertPayload.status_label,
        status: resolvedOutcome === 'Approved' ? 'Visa Approved' : resolvedOutcome === 'Rejected' ? 'Visa Refused' : 'Under Embassy Review',
        decision_outcome: resolvedOutcome,
        notes: upsertPayload.notes,
        updated_at: nowIso,
      }, { onConflict: 'id' });
    } catch (dbErr) {
      console.warn('[updateVisaStatus DB write notice]:', dbErr);
    }
  }

  // 2. Sync to system_config & localStorage for redundancy
  try {
    const admin = await getAdminSupabaseClient();
    const current = await getVisaRecords();
    const filtered = current.filter(r => r.id !== upsertPayload.id && r.student_id !== upsertPayload.student_id);
    const updated = [upsertPayload, ...filtered];
    try { localStorage.setItem('ferex_visa_cloud_catalog', JSON.stringify(updated)); } catch {}
    await admin.from('system_config').upsert({
      key: VISA_CATALOG_KEY,
      value: updated,
      updated_at: nowIso,
    }, { onConflict: 'key' });
  } catch {}

  // 3. Automated status cascades & notifications
  if (upsertPayload.student_id) {
    try {
      const { createNotification } = await import('./notifications');
      const { updateApplicationStatus, getApplications } = await import('./applications');
      const { setStudentStageStatus } = await import('./journey');

      const isApproved = updates.decision_outcome === 'Approved' || String(upsertPayload.status_label).toLowerCase().includes('approved');
      const isRejected = updates.decision_outcome === 'Rejected' || String(upsertPayload.status_label).toLowerCase().includes('refus');

      // Update student applications
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

      // Advance journey stages cleanly
      if (isApproved) {
        await setStudentStageStatus(upsertPayload.student_id, 9, 'Completed', 'VFS Visa Filing Complete');
        await setStudentStageStatus(upsertPayload.student_id, 10, 'Completed', 'National Student Visa Approved & Stamped');
        await setStudentStageStatus(upsertPayload.student_id, 11, 'In Progress', 'Pre-Departure Briefing & Flight Concierge Active');
      } else if (isRejected) {
        await setStudentStageStatus(upsertPayload.student_id, 10, 'In Progress', 'Visa Refused by Embassy. Contact Counselor for Appeal.');
      }

      await createNotification({
        user_id: upsertPayload.student_id,
        title: isApproved ? 'Visa Approved & Stamped' : isRejected ? 'Visa Decision Update' : 'VFS Visa Tracking Updated',
        body: isApproved
          ? 'Your National Student D-Visa has been officially approved & stamped by the Embassy!'
          : isRejected
          ? 'Your visa application verdict has been updated to Refused by Embassy.'
          : `Your VFS Visa status: ${upsertPayload.status_label || 'Processing'} (Stage ${upsertPayload.current_stage || 1}).`,
        category: 'Visa'
      });
    } catch (e) {}
  }

  window.dispatchEvent(new Event('ferex_visa_change'));
  window.dispatchEvent(new Event('ferex_application_change'));
  window.dispatchEvent(new Event('ferex_notification_change'));
  return upsertPayload;
}

export const updateVisaRecord = updateVisaStatus;
