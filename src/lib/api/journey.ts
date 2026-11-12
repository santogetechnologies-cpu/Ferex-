import { supabase } from '../supabase';
import type { JourneyStage } from '../types';
import { educationStages } from '../educationBilling';

export async function getJourneyStages(studentId: string) {
  const { data, error } = await supabase
    .from('education_workflow_progress')
    .select('*')
    .eq('student_id', studentId)
    .order('stage_number', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(s => ({ ...s, stage_name: s.stage_name || s.name || educationStages[s.stage_number - 1] })) as JourneyStage[];
}

export async function ensureJourneyStages(studentId: string) {
  const stages = await getJourneyStages(studentId);
  const missing = educationStages.map((name, i) => ({ student_id: studentId, stage_number: i + 1, stage_name: name, status: i === 0 ? 'In Progress' : 'Pending' })).filter(s => !stages.some(existing => existing.stage_number === s.stage_number));
  if (missing.length) {
    const { error } = await supabase.from('education_workflow_progress').insert(missing);
    if (error) throw error;
  }
  return getJourneyStages(studentId);
}

export async function updateJourneyStageStatus(
  id: string,
  status: JourneyStage['status'],
  notes?: string
) {
  const { data, error } = await supabase
    .from('education_workflow_progress')
    .update({
      status,
      notes: notes ?? undefined,
      completed_at: status === 'Completed' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as JourneyStage;
}

export async function setStudentStageStatus(
  studentId: string,
  stageNumber: number,
  status: JourneyStage['status'],
  notes?: string
) {
  if (!studentId) return;
  try {
    await ensureJourneyStages(studentId);
    const stages = await getJourneyStages(studentId);
    const target = stages.find(s => s.stage_number === stageNumber);
    if (target) {
      await updateJourneyStageStatus(target.id, status, notes);
    } else {
      const { error: stageError } = await supabase.from('education_workflow_progress').upsert({
        student_id: studentId,
        stage_number: stageNumber,
        stage_name: educationStages[stageNumber - 1] || `Stage ${stageNumber}`,
        status,
        notes: notes || '',
        completed_at: status === 'Completed' ? new Date().toISOString() : null,
      }, { onConflict: 'student_id,stage_number' });
      if (stageError) throw stageError;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ferex_journey_change'));
    }
  } catch (err) {
    console.warn('[setStudentStageStatus error]:', err);
  }
}
