import { supabase } from '../supabase';
import type { JourneyStage } from '../types';

export async function getJourneyStages(studentId: string) {
  const { data, error } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('student_id', studentId)
    .order('stage_number', { ascending: true });

  if (error) throw error;
  return (data ?? []) as JourneyStage[];
}

export async function updateJourneyStageStatus(
  id: string,
  status: JourneyStage['status'],
  notes?: string
) {
  const { data, error } = await supabase
    .from('journey_stages')
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
