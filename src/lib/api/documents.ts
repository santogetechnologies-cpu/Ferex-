import { supabase } from '../supabase';
import type { StudentDocument } from '../types';
import { generateUUID } from '../../utils/uuid';
import { logActivity } from './activity';

const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

// ─── Get documents for a specific student (Student View) ───────────────────────
export async function getDocumentsForStudent(studentId: string): Promise<StudentDocument[]> {
  try {
    if (!studentId || !isValidUuid(studentId)) {
      return [];
    }
    const { data } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });
    return (data ?? []) as unknown as StudentDocument[];
  } catch (err) {
    return [];
  }
}

// ─── Get all documents across the system (Admin View) ──────────────────────────
export async function getDocumentsForAdmin(): Promise<StudentDocument[]> {
  try {
    const { data } = await supabase
      .from('student_documents')
      .select('*, users:student_id(id, full_name, email, phone)')
      .order('uploaded_at', { ascending: false });
    return (data ?? []) as unknown as StudentDocument[];
  } catch (err) {
    return [];
  }
}

// Backward compatible alias
export async function getDocuments(studentId?: string) {
  if (studentId) {
    return getDocumentsForStudent(studentId);
  }
  return getDocumentsForAdmin();
}

// ─── Upload a document record ──────────────────────────────────────────────────
export async function uploadDocument(payload: {
  student_id: string;
  file_name: string;
  file_url: string;
  file_size?: string;
  doc_type: StudentDocument['doc_type'];
}) {
  const newId = generateUUID();
  const validStudentId = isValidUuid(payload.student_id) ? payload.student_id : null;

  // Attempt 1: Full payload
  const attempt1 = {
    id: newId,
    student_id: validStudentId,
    file_name: payload.file_name,
    file_url: payload.file_url,
    doc_type: payload.doc_type,
    document_type: payload.doc_type,
    file_size: payload.file_size || '1.2 MB',
    status: 'Submitted',
    uploaded_at: new Date().toISOString()
  };

  let res = await supabase.from('student_documents').insert(attempt1).select();

  // Attempt 2: Without optional fields if schema differs
  if (res.error) {
    console.warn('[uploadDocument Attempt 1 Error]:', res.error.message);
    const attempt2 = {
      id: newId,
      student_id: validStudentId,
      file_name: payload.file_name,
      file_url: payload.file_url,
      document_type: payload.doc_type,
      status: 'Submitted'
    };
    res = await supabase.from('student_documents').insert(attempt2).select();
  }

  // Attempt 3: Ultra-minimal insert
  if (res.error) {
    console.warn('[uploadDocument Attempt 2 Error]:', res.error.message);
    const attempt3 = {
      file_name: payload.file_name,
      file_url: payload.file_url,
      status: 'Submitted'
    };
    res = await supabase.from('student_documents').insert(attempt3).select();
  }

  if (res.error) {
    console.error('[uploadDocument Final Error]: Could not insert into Supabase:', res.error);
    alert(`Supabase Upload Notice: ${res.error.message || 'Table student_documents missing or RLS restricted.'}`);
  } else {
    // Notify Admin & Staff of new document submission
    try {
      const { createNotification } = await import('./notifications');
      await createNotification({
        user_id: payload.student_id || 'admin',
        title: '📄 New Document Submitted',
        body: `A new student document (${payload.doc_type || payload.file_name}) was submitted for review & verification.`,
        category: 'Document'
      });
    } catch (err) {}
  }

  const createdDoc: StudentDocument = (res.data && res.data[0])
    ? (res.data[0] as StudentDocument)
    : ({
        id: newId,
        student_id: payload.student_id,
        file_name: payload.file_name,
        file_url: payload.file_url,
        file_size: '0 KB',
        doc_type: payload.doc_type,
        status: 'Submitted',
        reviewer_id: null,
        reviewer_notes: '',
        uploaded_at: new Date().toISOString(),
        reviewed_at: null,
      } as StudentDocument);

  return createdDoc;
}

// ─── Update document status (admin action) ────────────────────────────────────
export async function updateDocumentStatus(
  id: string,
  status: StudentDocument['status'],
  reviewerId?: string,
  reviewerNotes?: string
) {
  const notesText = reviewerNotes || (status === 'Re-upload Requested' ? 'Re-upload Requested' : '');

  let res = await supabase
    .from('student_documents')
    .update({
      status,
      reviewer_notes: notesText,
      reviewer_id: reviewerId || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select();

  if (res.error || !res.data || res.data.length === 0) {
    console.warn('[updateDocumentStatus Attempt 1 Notice]:', res.error?.message);
    res = await supabase
      .from('student_documents')
      .update({ status })
      .eq('id', id)
      .select();
  }

  let docResult = res.data && res.data[0] ? (res.data[0] as StudentDocument) : ({ id, status, reviewer_notes: notesText } as Partial<StudentDocument>);

  if (docResult && (docResult as StudentDocument).student_id) {
    try {
      const { createNotification } = await import('./notifications');
      const isApproved = (status as string) === 'Verified' || status === 'Approved';
      const isReupload = status === 'Re-upload Requested' || status === 'Rejected';

      await createNotification({
        user_id: (docResult as StudentDocument).student_id,
        title: isApproved ? '✅ Document Verified & Approved' : isReupload ? '⚠️ Document Action Required' : '📄 Document Status Updated',
        body: isApproved
          ? `Your document "${(docResult as StudentDocument).doc_type || 'Submitted Document'}" has been verified and approved.`
          : `Status for "${(docResult as StudentDocument).doc_type || 'Document'}": ${status}. ${notesText ? 'Notes: ' + notesText : ''}`,
        category: 'Document'
      });
    } catch (e) {}
  }

  await logActivity('DOCUMENT_STATUS_UPDATED', 'student_document', id, { status, reviewer_notes: notesText });

  return docResult;
}

// ─── Re-upload an existing document record ────────────────────────────────────
export async function reuploadDocumentRecord(
  id: string,
  payload: {
    file_name: string;
    file_url: string;
    file_size?: string;
    doc_type: StudentDocument['doc_type'];
  }
) {
  let res = await supabase
    .from('student_documents')
    .update({
      file_name: payload.file_name,
      file_url: payload.file_url,
      file_size: payload.file_size || '1.2 MB',
      doc_type: payload.doc_type,
      document_type: payload.doc_type,
      status: 'Submitted',
      uploaded_at: new Date().toISOString(),
      reviewer_notes: '',
    })
    .eq('id', id)
    .select();

  if (res.error || !res.data || res.data.length === 0) {
    console.warn('[reuploadDocumentRecord Attempt 1 Notice]:', res.error?.message);
    res = await supabase
      .from('student_documents')
      .update({
        file_name: payload.file_name,
        file_url: payload.file_url,
        status: 'Submitted',
        uploaded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();
  }

  if (res.error || !res.data || res.data.length === 0) {
    return {
      id,
      file_name: payload.file_name,
      file_url: payload.file_url,
      doc_type: payload.doc_type,
      status: 'Submitted',
      uploaded_at: new Date().toISOString(),
    } as Partial<StudentDocument>;
  }

  return res.data[0] as StudentDocument;
}

// ─── Get document counts for admin dashboard ──────────────────────────────────
export async function getDocumentCounts() {
  const { data, error } = await supabase
    .from('student_documents')
    .select('status');
  if (error) return { total: 0, pending: 0, verified: 0, rejected: 0 };

  const counts = { total: 0, pending: 0, verified: 0, rejected: 0 };
  for (const row of data ?? []) {
    counts.total++;
    if (row.status === 'Pending Verification' || row.status === 'Pending') counts.pending++;
    if (row.status === 'Verified' || row.status === 'Approved') counts.verified++;
    if (row.status === 'Rejected') counts.rejected++;
  }
  return counts;
}
