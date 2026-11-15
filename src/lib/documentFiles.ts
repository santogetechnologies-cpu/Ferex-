import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import { generateUUID } from '../utils/uuid';
import { getSignedFileUrl } from './storage';

// One place for everything about document files: checking, uploading with a live percentage, and opening later.

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'];
export const MAX_FILE_MB = 15;
export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
const BUCKET = 'student-documents';

export const extensionOf = (name: string) => (name.split('.').pop() || '').toLowerCase();

export function formatSize(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns a plain-language problem, or '' when the file is fine. */
export function checkFile(file: File): string {
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `.${ext || 'this'} files are not accepted. Use PDF, JPG, PNG, WebP or Word.`;
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `This file is ${formatSize(file.size)}. The limit is ${MAX_FILE_MB} MB.`;
  return '';
}

export interface UploadedFile { path: string; size: string; name: string }

/**
 * Uploads into the student's own folder (so the student, and staff, can open it later) and reports 0-100 as it goes.
 * Pass an AbortSignal to cancel.
 */
export async function uploadStudentFile(opts: {
  studentId: string;
  file: File;
  label: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<UploadedFile> {
  const { studentId, file, label, onProgress, signal } = opts;
  const problem = checkFile(file);
  if (problem) throw new Error(problem);
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Your session has ended. Sign in again to upload.');

  const ext = extensionOf(file.name);
  const safe = (label || file.name.replace(/\.[^/.]+$/, '')).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'document';
  const path = `${studentId}/${safe}_${generateUUID().slice(0, 8)}.${ext}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(100); resolve(); return; }
      let msg = 'The upload was refused.';
      try { msg = JSON.parse(xhr.responseText)?.message || msg; } catch { /* keep default */ }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error('The upload could not reach the server. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
  return { path, size: formatSize(file.size), name: file.name };
}

/** A fresh, working link for a stored document, whether the row holds a path or an older (possibly expired) signed link. */
export async function resolveDocumentUrl(stored: string, expiresInSeconds = 3600): Promise<string> {
  if (!stored) return '';
  if (stored.startsWith('data:') || stored.startsWith('blob:')) return stored;
  if (/^https?:/i.test(stored) && !stored.includes('/storage/v1/object/')) return stored;
  const signed = await getSignedFileUrl(BUCKET, stored, expiresInSeconds);
  if (!signed || signed === stored) throw new Error('This file could not be opened. It may have been removed.');
  return signed;
}

export type DocPreviewKind = 'pdf' | 'image' | 'other';
export const previewKind = (name: string): DocPreviewKind => {
  const ext = extensionOf(name.split('?')[0]);
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  return 'other';
};
