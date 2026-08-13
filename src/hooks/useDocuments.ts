import { useState, useEffect, useCallback } from 'react';
import { getDocuments, updateDocumentStatus, uploadDocument, reuploadDocumentRecord } from '../lib/api/documents';
import type { StudentDocument } from '../lib/types';

export function useDocuments(studentId?: string) {
  const [documents, setDocuments] = useState<StudentDocument[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_student_documents');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('ferex_student_documents');
      return saved ? false : true;
    } catch (e) {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocuments(studentId);
      setDocuments(data || []);
      localStorage.setItem('ferex_student_documents', JSON.stringify(data || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchDocs();

    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ferex_student_documents');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setDocuments(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ferex_document_change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ferex_document_change', handleStorageChange);
    };
  }, [fetchDocs]);

  const changeStatus = async (
    id: string,
    status: StudentDocument['status'],
    notes?: string,
    reviewerId?: string
  ) => {
    const updated = await updateDocumentStatus(id, status, reviewerId, notes);
    setDocuments(prev => {
      const nextList = prev.map(d => d.id === id ? { ...d, ...updated, status, reviewer_notes: notes || d.reviewer_notes } as StudentDocument : d);
      localStorage.setItem('ferex_student_documents', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_document_change'));
      return nextList;
    });
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
    setDocuments(prev => {
      const nextList = [created, ...prev.filter(d => d.id !== created.id)];
      localStorage.setItem('ferex_student_documents', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_document_change'));
      return nextList;
    });
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
    setDocuments(prev => {
      const nextList = prev.map(d => d.id === docId ? { ...d, ...updated, status: 'Pending Verification' } as StudentDocument : d);
      localStorage.setItem('ferex_student_documents', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_document_change'));
      return nextList;
    });
    return updated;
  };

  return { documents, loading, error, refresh: fetchDocs, changeStatus, addDoc, replaceDoc };
}
