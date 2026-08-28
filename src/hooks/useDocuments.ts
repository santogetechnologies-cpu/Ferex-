import { useState, useEffect, useCallback } from 'react';
import { getDocumentsForStudent, getDocumentsForAdmin, updateDocumentStatus, uploadDocument, reuploadDocumentRecord } from '../lib/api/documents';
import { supabase } from '../lib/supabase';
import type { StudentDocument } from '../lib/types';

export function useDocuments(studentId?: string) {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: StudentDocument[] = [];
      if (studentId) {
        data = await getDocumentsForStudent(studentId);
      } else {
        data = await getDocumentsForAdmin();
      }

      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchDocs();

    // Setup Supabase Realtime Subscription on student_documents
    const channelName = studentId ? `realtime_docs_student_${studentId}` : 'realtime_docs_admin';
    const filterStr = studentId ? `student_id=eq.${studentId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_documents',
          filter: filterStr,
        },
        () => {
          fetchDocs();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchDocs();
    window.addEventListener('ferex_document_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_document_change', handleLocalEvent);
    };
  }, [fetchDocs, studentId]);

  const changeStatus = async (
    id: string,
    status: StudentDocument['status'],
    notes?: string,
    reviewerId?: string
  ) => {
    const updated = await updateDocumentStatus(id, status, reviewerId, notes);
    setDocuments(prev =>
      prev.map(d => (d.id === id ? { ...d, ...updated, status, reviewer_notes: notes || d.reviewer_notes } as StudentDocument : d))
    );
    window.dispatchEvent(new Event('ferex_document_change'));
    return updated;
  };

  const addDoc = async (payload: {
    student_id: string;
    file_name: string;
    file_url: string;
    file_size: string;
    doc_type: StudentDocument['doc_type'];
  }) => {
    const created = await uploadDocument(payload);
    setDocuments(prev => [created, ...prev.filter(d => d.id !== created.id)]);
    window.dispatchEvent(new Event('ferex_document_change'));
    return created;
  };

  const replaceDoc = async (
    docId: string,
    payload: {
      file_name: string;
      file_url: string;
      file_size: string;
      doc_type: StudentDocument['doc_type'];
    }
  ) => {
    const updated = await reuploadDocumentRecord(docId, payload);
    setDocuments(prev =>
      prev.map(d => (d.id === docId ? { ...d, ...updated, status: 'Pending Verification' } as StudentDocument : d))
    );
    window.dispatchEvent(new Event('ferex_document_change'));
    return updated;
  };

  return { documents, loading, error, refresh: fetchDocs, changeStatus, addDoc, replaceDoc };
}
