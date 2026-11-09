import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function guessDocType(filename) {
  const f = filename.toLowerCase();
  if (f.includes('passport')) return 'Passport';
  if (f.includes('transcript') || f.includes('mark_sheet') || f.includes('marksheet')) return 'Transcripts';
  if (f.includes('ielts') || f.includes('toefl') || f.includes('language')) return 'Language Proficiency';
  if (f.includes('lor') || f.includes('recommendation')) return 'Letter of Recommendation';
  if (f.includes('sop') || f.includes('statement')) return 'Statement of Purpose';
  if (f.includes('resume') || f.includes('cv')) return 'Resume / CV';
  if (f.includes('insurance')) return 'Health Insurance';
  if (f.includes('offer') || f.includes('admission') || f.includes('uni-assist')) return 'Admission Letter';
  return 'Identity & Academic Record';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '1.2 MB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function reconcileDocuments() {
  console.log('Reconciling orphaned storage files into student_documents table...');
  const { data: rootItems, error: rootErr } = await supabase.storage.from('student-documents').list('', { limit: 100 });
  if (rootErr) {
    console.error('Failed to list root storage:', rootErr);
    return;
  }

  // Get existing document IDs/URLs from database
  const { data: existingRows } = await supabase.from('student_documents').select('id, file_url, file_name');
  const existingSet = new Set((existingRows || []).map(r => r.file_url || r.file_name));

  let insertedCount = 0;

  for (const item of rootItems) {
    if (item.id === null) {
      const studentId = item.name;
      // Is it a valid UUID?
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
      if (!isUuid) continue;

      const { data: subFiles } = await supabase.storage.from('student-documents').list(studentId, { limit: 100 });
      if (!subFiles || subFiles.length === 0) continue;

      for (const file of subFiles) {
        if (!file.name || file.name.startsWith('.')) continue;
        const filePath = `${studentId}/${file.name}`;
        const { data: pubUrl } = supabase.storage.from('student-documents').getPublicUrl(filePath);
        const fileUrl = pubUrl?.publicUrl || filePath;

        if (existingSet.has(fileUrl) || existingSet.has(file.name)) {
          continue;
        }

        const docType = guessDocType(file.name);
        const fileSize = formatBytes(file.metadata?.size);
        const docId = crypto.randomUUID();

        const { error: insertErr } = await supabase.from('student_documents').insert({
          id: docId,
          student_id: studentId,
          file_name: file.name,
          file_url: fileUrl,
          file_size: fileSize,
          doc_type: docType,
          document_type: docType,
          status: 'Submitted',
          uploaded_at: file.created_at || new Date().toISOString()
        });

        if (insertErr) {
          console.error(`Failed to insert document ${file.name} for ${studentId}:`, insertErr);
        } else {
          insertedCount++;
          existingSet.add(fileUrl);
          existingSet.add(file.name);
          console.log(`+ Restored document: ${file.name} for student ${studentId} (${docType})`);
        }
      }
    }
  }

  console.log(`Reconciliation complete! Total documents restored into student_documents table: ${insertedCount}`);
}

reconcileDocuments();

