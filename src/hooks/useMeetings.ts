import { useState, useEffect, useCallback } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, deleteMeeting, computeEndTime } from '../lib/api/meetings';
import { supabase } from '../lib/supabase';
import type { Meeting } from '../lib/types';

export function useMeetings(studentId?: string) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMeetings(studentId);
      const cleaned = (data || []).map(m => ({
        ...m,
        end_time: m.end_time || computeEndTime(m.start_time)
      }));
      setMeetings(cleaned);
    } catch (err: any) {
      setError(err.message || 'Failed to load scheduled meetings');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchMeetings();

    // Supabase Realtime Subscription on meetings
    const channelName = studentId ? `realtime_meetings_student_${studentId}` : 'realtime_meetings_admin';
    const filterStr = studentId ? `student_id=eq.${studentId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: filterStr,
        },
        () => {
          fetchMeetings();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchMeetings();
    window.addEventListener('ferex_meeting_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_meeting_change', handleLocalEvent);
    };
  }, [fetchMeetings, studentId]);

  const addMeeting = async (payload: {
    student_id?: string;
    advisor_id?: string;
    subject: string;
    advisor_name: string;
    scheduled_date: string;
    start_time: string;
    end_time?: string;
    meeting_link?: string;
    notes?: string;
  }) => {
    const endTime = payload.end_time || computeEndTime(payload.start_time);
    const created = await createMeeting({ ...payload, end_time: endTime });
    setMeetings(prev => [created, ...prev.filter(m => m.id !== created.id)]);
    window.dispatchEvent(new Event('ferex_meeting_change'));
    return created;
  };

  const changeStatus = async (
    id: string,
    status: Meeting['status'],
    additionalFields?: { scheduled_date?: string; start_time?: string; end_time?: string }
  ) => {
    const updated = await updateMeetingStatus(id, status, additionalFields);
    setMeetings(prev =>
      prev.map(m => (m.id === id ? ({ ...m, ...updated, status } as Meeting) : m))
    );
    window.dispatchEvent(new Event('ferex_meeting_change'));
    return updated;
  };

  const deleteCall = async (id: string) => {
    await deleteMeeting(id);
    setMeetings(prev => prev.filter(m => m.id !== id));
    window.dispatchEvent(new Event('ferex_meeting_change'));
  };

  return { meetings, loading, error, refresh: fetchMeetings, addMeeting, changeStatus, deleteCall };
}
