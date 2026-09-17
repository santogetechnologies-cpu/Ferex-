import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { StudentDocument } from '../types';
import { generateUUID } from '../../utils/uuid';
import { logActivity } from './activity';

const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
const DOCUMENTS_CATALOG_ID = 'ferex_documents_catalog';

async function fetchDocumentsCatalog(): Promise<StudentDocument[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('value')
      .eq('key', DOCUMENTS_CATALOG_ID)
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return data.value;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('ferex_documents_cloud_catalog');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function syncDocumentToCloudCatalog(doc: StudentDocument) {
  try {
    const current = await fetchDocumentsCatalog();
    const filtered = current.filter(d => d.id !== doc.id);
    const updated = [doc, ...filtered];
    try {
      localStorage.setItem('ferex_documents_cloud_catalog', JSON.stringify(updated));
    } catch {}
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      key: DOCUMENTS_CATALOG_ID,
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.warn('[syncDocumentToCloudCatalog notice]:', e);
  }
}

// ─── Get documents for a specific student (Student View) ───────────────────────
export async function getDocumentsForStudent(studentId: string): Promise<StudentDocument[]> {
  if (!studentId) return [];

  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as unknown as StudentDocument[];
    }
  } catch (err) {
    console.warn('[getDocumentsForStudent DB notice]:', err);
  }

  const cloudCatalog = await fetchDocumentsCatalog();
  return cloudCatalog.filter(d => d.student_id === studentId);
}

// ─── Get all documents across the system (Admin View) ──────────────────────────
export async function getDocumentsForAdmin(): Promise<StudentDocument[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('student_documents')
      .select('*, users:student_id(id, full_name, email, phone)')
      .order('uploaded_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as unknown as StudentDocument[];
    }
  } catch (err) {
    console.warn('[getDocumentsForAdmin DB notice]:', err);
  }

  return await fetchDocumentsCatalog();
}

// ─── Delete document ─────────────────────────────────────────────────────────
export async function deleteDocumentRecord(docId: string): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('student_documents').delete().eq('id', docId);
  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }

  const catalog = await fetchDocumentsCatalog();
  const updated = catalog.filter(d => d.id !== docId);
  try {
    localStorage.setItem('ferex_documents_cloud_catalog', JSON.stringify(updated));
  } catch {}
  await client.from('system_config').upsert({
    key: DOCUMENTS_CATALOG_ID,
    value: updated,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' }).catch?.(() => {});

  window.dispatchEvent(new Event('ferex_document_change'));
  return true;
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
}): Promise<StudentDocument> {
  const newId = generateUUID();
  const validStudentId = isValidUuid(payload.student_id) ? payload.student_id : null;
  const now = new Date().toISOString();

  const insertData: StudentDocument = {
    id: newId,
    student_id: payload.student_id,
    file_name: payload.file_name,
    file_url: payload.file_url,
    file_size: payload.file_size || '1.2 MB',
    doc_type: payload.doc_type,
    status: 'Submitted',
    reviewer_id: null,
    reviewer_notes: '',
    uploaded_at: now,
    reviewed_at: null,
  };

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('student_documents').insert({
    id: newId,
    student_id: validStudentId,
    file_name: payload.file_name,
    name: payload.file_name,
    file_url: payload.file_url,
    type: payload.doc_type || 'Document',
    doc_type: payload.doc_type,
    document_type: payload.doc_type,
    file_size: payload.file_size || '1.2 MB',
    status: 'Submitted',
    uploaded_at: now,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    console.warn('[uploadDocument DB insert notice]:', error.message);
  }

  await syncDocumentToCloudCatalog(insertData);
  window.dispatchEvent(new Event('ferex_document_change'));

  try {
    const { createNotification } = await import('./notifications');
    await createNotification({
      user_id: payload.student_id || 'admin',
      title: 'New Document Submitted',
      body: `A new student document (${payload.doc_type || payload.file_name}) was submitted for review & verification.`,
      category: 'Document'
    });
  } catch {}

  return insertData;
}

// ─── Update document status (admin action) ────────────────────────────────────
export async function updateDocumentStatus(
  id: string,
  status: StudentDocument['status'],
  reviewerId?: string,
  reviewerNotes?: string
): Promise<StudentDocument> {
  const notesText = reviewerNotes || (status === 'Re-upload Requested' ? 'Re-upload Requested' : '');
  const now = new Date().toISOString();
  let docResult: StudentDocument | null = null;

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('student_documents')
    .update({
      status,
      reviewer_notes: notesText,
      rejection_reason: status === 'Rejected' ? notesText : null,
      reviewer_id: reviewerId || null,
      reviewed_at: now,
      verified_at: (status === 'Verified' || status === 'Approved') ? now : null,
      updated_at: now,
    })
    .eq('id', id)
    .select();

  if (!error && data && data.length > 0) {
    docResult = data[0] as StudentDocument;
  }

  if (!docResult) {
    const catalog = await fetchDocumentsCatalog();
    const existing = catalog.find(d => d.id === id);
    docResult = {
      ...(existing || { id, file_name: 'document.pdf', file_url: '', doc_type: 'Identity', uploaded_at: now }),
      id,
      status,
      reviewer_notes: notesText,
      reviewed_at: now
    } as StudentDocument;
  }

  await syncDocumentToCloudCatalog(docResult);
  window.dispatchEvent(new Event('ferex_document_change'));

  if (docResult && docResult.student_id) {
    try {
      const { createNotification } = await import('./notifications');
      const isApproved = (status as string) === 'Verified' || status === 'Approved';
      const isReupload = status === 'Re-upload Requested' || status === 'Rejected';

      await createNotification({
        user_id: docResult.student_id,
        title: isApproved ? 'Document Verified & Approved' : isReupload ? 'Document Action Required' : 'Document Status Updated',
        body: isApproved
          ? `Your document "${docResult.doc_type || 'Submitted Document'}" has been verified and approved.`
          : `Status for "${docResult.doc_type || 'Document'}": ${status}. ${notesText ? 'Notes: ' + notesText : ''}`,
        category: 'Document'
      });
    } catch {}
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
): Promise<StudentDocument> {
  const now = new Date().toISOString();
  let docResult: StudentDocument | null = null;
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data } = await client
    .from('student_documents')
    .update({
      file_name: payload.file_name,
      name: payload.file_name,
      file_url: payload.file_url,
      file_size: payload.file_size || '1.2 MB',
      doc_type: payload.doc_type,
      document_type: payload.doc_type,
      status: 'Submitted',
      uploaded_at: now,
      updated_at: now,
      reviewer_notes: '',
    })
    .eq('id', id)
    .select();

  if (data && data.length > 0) {
    docResult = data[0] as StudentDocument;
  }

  if (!docResult) {
    const catalog = await fetchDocumentsCatalog();
    const existing = catalog.find(d => d.id === id);
    docResult = {
      ...(existing || { id }),
      id,
      file_name: payload.file_name,
      file_url: payload.file_url,
      file_size: payload.file_size || '1.2 MB',
      doc_type: payload.doc_type,
      status: 'Submitted',
      uploaded_at: now,
      reviewer_notes: ''
    } as StudentDocument;
  }

  await syncDocumentToCloudCatalog(docResult);
  window.dispatchEvent(new Event('ferex_document_change'));
  return docResult;
}

// ─── Get document counts for admin dashboard ──────────────────────────────────
export async function getDocumentCounts(): Promise<{ total: number; pending: number; verified: number; rejected: number }> {
  const { data, error } = await supabase
    .from('student_documents')
    .select('status');
  if (error) return { total: 0, pending: 0, verified: 0, rejected: 0 };

  const counts = { total: 0, pending: 0, verified: 0, rejected: 0 };
  for (const row of data ?? []) {
    counts.total++;
    if (row.status === 'Pending Verification' || row.status === 'Pending' || row.status === 'Submitted') counts.pending++;
    if (row.status === 'Verified' || row.status === 'Approved') counts.verified++;
    if (row.status === 'Rejected') counts.rejected++;
  }
  return counts;
}
