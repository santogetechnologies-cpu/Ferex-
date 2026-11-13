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

  let overrides: Record<number, { status: JourneyStage['status']; notes?: string; completed_at?: string | null }> = {};
  try {
    const stored = localStorage.getItem(`ferex_journey_overrides_${studentId}`);
    if (stored) overrides = JSON.parse(stored);
  } catch {}

  // Verify Stage 3 (Advanced Registration Fee) strictly against backend payment records
  let isStage3Paid = false;
  try {
    const { data: payRows } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId);
    const config = getSystemFeeConfig();
    isStage3Paid = registrationSettled(config, (payRows || []) as any);
  } catch {}

  // Clean up any stale/unverified Completed override for Stage 3
  if (!isStage3Paid && overrides[3]?.status === 'Completed') {
    delete overrides[3];
    try {
      localStorage.setItem(`ferex_journey_overrides_${studentId}`, JSON.stringify(overrides));
    } catch {}
  }

  const mapped = (dbStages ?? []).map(s => {
    const override = overrides[s.stage_number];
    let status = override?.status || s.status;
    let completed_at = override?.completed_at !== undefined ? override.completed_at : s.completed_at;

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
      notes: override?.notes !== undefined ? override.notes : s.notes,
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
        const config = getSystemFeeConfig();
        if (!registrationSettled(config, (payRows || []) as any)) {
          status = 'Pending';
        }
      } catch {
        status = 'Pending';
      }
    }
    // 1. Instantly record local stage status to guarantee responsive UI and persist across reloads
    try {
      const key = `ferex_journey_overrides_${studentId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      existing[stageNumber] = {
        status,
        notes: notes || '',
        completed_at: status === 'Completed' ? new Date().toISOString() : null,
      };
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {}

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
  } catch {
    // Graceful fallback
  } finally {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ferex_journey_change'));
    }
  }
}
