import { supabase } from '../supabase';
import type { JourneyStage } from '../types';
import { educationStages, registrationSettled } from '../educationBilling';
import { getSystemFeeConfig } from './feeConfig';

export async function getJourneyStages(studentId: string) {
  let dbStages: any[] = [];
  try {
    const { data, error } = await supabase
      .from('education_workflow_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('stage_number', { ascending: true });

    if (!error && data) {
      dbStages = data;
    }
  } catch {}

  // Stage 3 (registration) reflects real payments against THIS student's fees (plan, discount, destination).
  let isStage3Paid = false;
  try {
    const { data: payRows } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId);
    const { loadStudentFeeProfile } = await import('../../hooks/useStudentFeeProfile');
    const profile = await loadStudentFeeProfile(studentId);
    isStage3Paid = registrationSettled(getSystemFeeConfig(), (payRows || []) as any, profile.country, profile);
  } catch {}

  const mapped = (dbStages ?? []).map(s => {
    let status = s.status;
    let completed_at = s.completed_at;

    // Strict Rule: Stage 3 (Advanced Registration Fee) MUST reflect actual verified payment records
    if (s.stage_number === 3) {
      if (!isStage3Paid) {
        status = 'Pending';
        completed_at = null;
        if (s.status === 'Completed') {
          // Asynchronously heal corrupted database record
          supabase
            .from('education_workflow_progress')
            .update({ status: 'Pending', completed_at: null, notes: 'Awaiting registration fee payment.' })
            .eq('student_id', studentId)
            .eq('stage_number', 3)
            .then(() => {});
        }
      } else {
        status = 'Completed';
        if (s.status !== 'Completed') {
          supabase
            .from('education_workflow_progress')
            .update({ status: 'Completed', completed_at: new Date().toISOString(), notes: 'Advanced registration fee verified.' })
            .eq('student_id', studentId)
            .eq('stage_number', 3)
            .then(() => {});
        }
      }
    }

    return {
      ...s,
      stage_name: s.stage_name || s.name || educationStages[s.stage_number - 1],
      status,
      notes: s.notes,
      completed_at,
    };
  }) as JourneyStage[];

  return mapped;
}

export async function ensureJourneyStages(studentId: string) {
  const stages = await getJourneyStages(studentId);
  const missing = educationStages.map((name, i) => ({ student_id: studentId, stage_number: i + 1, stage_name: name, status: i === 0 ? 'In Progress' : 'Pending' })).filter(s => !stages.some(existing => existing.stage_number === s.stage_number));
  if (missing.length) {
    try {
      await supabase.from('education_workflow_progress').insert(missing);
    } catch {}
  }
  return getJourneyStages(studentId);
}

export async function updateJourneyStageStatus(
  id: string,
  status: JourneyStage['status'],
  notes?: string
) {
  try {
    const { data, error } = await supabase
      .from('education_workflow_progress')
      .update({
        status,
        notes: notes ?? undefined,
        completed_at: status === 'Completed' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // ignore
    }
    return data as JourneyStage;
  } catch {
    return null as any;
  }
}

export async function setStudentStageStatus(
  studentId: string,
  stageNumber: number,
  status: JourneyStage['status'],
  notes?: string
) {
  if (!studentId) return;
  try {
    // Stage 3 (Advanced Registration Fee) can NEVER be marked Completed without verified payment record
    if (stageNumber === 3 && status === 'Completed') {
      try {
        const { data: payRows } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', studentId);
        const { loadStudentFeeProfile } = await import('../../hooks/useStudentFeeProfile');
        const profile = await loadStudentFeeProfile(studentId);
        if (!registrationSettled(getSystemFeeConfig(), (payRows || []) as any, profile.country, profile)) {
          status = 'Pending';
        }
      } catch {
        status = 'Pending';
      }
    }
    // 2. Sync to Supabase database (uses maybeSingle to prevent 406 / PGRST116 errors under student RLS)
    await ensureJourneyStages(studentId).catch(() => {});
    const stages = await getJourneyStages(studentId).catch(() => []);
    const target = stages.find(s => s.stage_number === stageNumber);
    if (target && target.id) {
      await updateJourneyStageStatus(target.id, status, notes);
    } else {
      const { error: stageError } = await supabase.from('education_workflow_progress').upsert({
        student_id: studentId,
        stage_number: stageNumber,
        stage_name: educationStages[stageNumber - 1] || `Stage ${stageNumber}`,
        status,
        notes: notes || '',
        completed_at: status === 'Completed' ? new Date().toISOString() : null,
      }, { onConflict: 'student_id,stage_number' }).select().maybeSingle();
      if (stageError) throw stageError;
    }
  } catch (err) {
    // Journey stages are also advanced by the database when the application status changes, so a refused
    // write here (e.g. a student session) is not fatal; it is logged instead of faked in browser storage.
    console.warn('[setStudentStageStatus]', err);
  } finally {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ferex_journey_change'));
    }
  }
}
