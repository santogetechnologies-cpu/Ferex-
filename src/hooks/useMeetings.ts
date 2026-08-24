import { useState, useEffect, useCallback } from 'react';
import { getMeetings, createMeeting, updateMeetingStatus, deleteMeeting, computeEndTime } from '../lib/api/meetings';
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
      localStorage.setItem('ferex_student_meetings', JSON.stringify(cleaned));
    } catch (err: any) {
      setError(err.message || 'Failed to load scheduled meetings');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchMeetings();

    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ferex_student_meetings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMeetings(parsed.map((m: Meeting) => ({
              ...m,
              end_time: computeEndTime(m.start_time)
            })));
          }
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ferex_meeting_change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ferex_meeting_change', handleStorageChange);
    };
  }, [fetchMeetings]);

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
    setMeetings(prev => {
      const nextList = [created, ...prev.filter(m => m.id !== created.id)];
      localStorage.setItem('ferex_student_meetings', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_meeting_change'));
      return nextList;
    });
    return created;
  };

  const changeStatus = async (
    id: string,
    status: Meeting['status'],
    additionalFields?: { scheduled_date?: string; start_time?: string; end_time?: string }
  ) => {
    const updated = await updateMeetingStatus(id, status, additionalFields);
    setMeetings(prev => {
      const nextList = prev.map(m => m.id === id ? { ...m, ...updated, status } as Meeting : m);
      localStorage.setItem('ferex_student_meetings', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_meeting_change'));
      return nextList;
    });
    return updated;
  };

  const deleteCall = async (id: string) => {
    await deleteMeeting(id);
    setMeetings(prev => {
      const nextList = prev.filter(m => m.id !== id);
      localStorage.setItem('ferex_student_meetings', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_meeting_change'));
      return nextList;
    });
  };

  return { meetings, loading, error, refresh: fetchMeetings, addMeeting, changeStatus, deleteCall };
}
