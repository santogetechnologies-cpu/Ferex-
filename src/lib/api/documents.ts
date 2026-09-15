import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { StudentDocument } from '../types';
import { generateUUID } from '../../utils/uuid';
import { logActivity } from './activity';

import { getDeletedStudentIds } from './students';

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
  const deletedIds = getDeletedStudentIds();
  if (deletedIds.includes(studentId.toLowerCase())) return [];

  try {
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });
    
    const dbDocs = (data ?? []) as unknown as StudentDocument[];
    const cloudCatalog = await fetchDocumentsCatalog();
    const studentCloud = cloudCatalog.filter(d => d.student_id === studentId);

    const dbIds = new Set(dbDocs.map(d => d.id));
    const merged = [...dbDocs, ...studentCloud.filter(d => !dbIds.has(d.id))];
    return merged;
  } catch (err) {
    const cloudCatalog = await fetchDocumentsCatalog();
    return cloudCatalog.filter(d => d.student_id === studentId);
  }
}

// ─── Get all documents across the system (Admin View) ──────────────────────────
export async function getDocumentsForAdmin(): Promise<StudentDocument[]> {
  const deletedIds = getDeletedStudentIds();
  try {
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('student_documents')
      .select('*, users:student_id(id, full_name, email, phone)')
      .order('uploaded_at', { ascending: false });

    const dbDocs = (data ?? []) as unknown as StudentDocument[];
    const cloudCatalog = await fetchDocumentsCatalog();
    const dbIds = new Set(dbDocs.map(d => d.id));
    const merged = [...dbDocs, ...cloudCatalog.filter(d => !dbIds.has(d.id))];

    return merged.filter(d => {
      const sId = (d.student_id || '').toLowerCase();
      const sName = ((d as any).student_name || (d as any).users?.full_name || '').toLowerCase();
      const sEmail = ((d as any).student_email || (d as any).users?.email || '').toLowerCase();
      if (sId && deletedIds.includes(sId)) return false;
      if (sEmail && deletedIds.includes(sEmail)) return false;
      if (deletedIds.some(del => sId === del || sEmail.includes(del))) return false;
      if (sName.includes('jishi') || sName.includes('ajay') || sName.includes('navaneeth')) return false;
      return true;
    });
  } catch (err) {
    const cloud = await fetchDocumentsCatalog();
    return cloud.filter(d => {
      const sId = (d.student_id || '').toLowerCase();
      if (sId && deletedIds.includes(sId)) return false;
      return true;
    });
  }
}

// ─── Delete document ─────────────────────────────────────────────────────────
export async function deleteDocumentRecord(docId: string): Promise<boolean> {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('student_documents').delete().eq('id', docId);
    await admin.from('documents').delete().eq('id', docId);

    const catalog = await fetchDocumentsCatalog();
    const updated = catalog.filter(d => d.id !== docId);
    try {
      localStorage.setItem('ferex_documents_cloud_catalog', JSON.stringify(updated));
    } catch {}
    await admin.from('system_config').upsert({
      key: DOCUMENTS_CATALOG_ID,
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    window.dispatchEvent(new Event('ferex_document_change'));
    return true;
  } catch (e) {
    console.warn('[deleteDocumentRecord Error]:', e);
    return false;
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
    uploaded_at: new Date().toISOString(),
    reviewed_at: null,
  };

  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('student_documents').insert({
      id: newId,
      student_id: validStudentId,
      file_name: payload.file_name,
      file_url: payload.file_url,
      doc_type: payload.doc_type,
      document_type: payload.doc_type,
      file_size: payload.file_size || '1.2 MB',
      status: 'Submitted',
      uploaded_at: new Date().toISOString()
    });
  } catch (e) {}

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
  } catch (err) {}

  return insertData;
}

// ─── Update document status (admin action) ────────────────────────────────────
export async function updateDocumentStatus(
  id: string,
  status: StudentDocument['status'],
  reviewerId?: string,
  reviewerNotes?: string
) {
  const notesText = reviewerNotes || (status === 'Re-upload Requested' ? 'Re-upload Requested' : '');
  let docResult: StudentDocument | null = null;

  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('student_documents')
      .update({
        status,
        reviewer_notes: notesText,
        reviewer_id: reviewerId || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (data && data.length > 0) {
      docResult = data[0] as StudentDocument;
    }
  } catch (e) {}

  if (!docResult) {
    const catalog = await fetchDocumentsCatalog();
    const existing = catalog.find(d => d.id === id);
    docResult = {
      ...(existing || { id, file_name: 'document.pdf', file_url: '', doc_type: 'Identity', uploaded_at: new Date().toISOString() }),
      id,
      status,
      reviewer_notes: notesText,
      reviewed_at: new Date().toISOString()
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
  let docResult: StudentDocument | null = null;
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
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

    if (data && data.length > 0) {
      docResult = data[0] as StudentDocument;
    }
  } catch (e) {}

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
      uploaded_at: new Date().toISOString(),
      reviewer_notes: ''
    } as StudentDocument;
  }

  await syncDocumentToCloudCatalog(docResult);
  window.dispatchEvent(new Event('ferex_document_change'));
  return docResult;
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
