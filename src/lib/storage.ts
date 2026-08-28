import { supabase } from './supabase';
import { generateUUID } from '../utils/uuid';

export type StorageBucketName = 
  | 'student-documents' 
  | 'offer-letters' 
  | 'receipts' 
  | 'trade-documents' 
  | 'digital-assets';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

/**
 * Uploads a File or Blob directly to a Supabase Storage Bucket.
 * Returns the object path and pre-signed / downloadable URL.
 */
export async function uploadFileToBucket(
  bucket: StorageBucketName,
  fileOrBlob: File | Blob,
  fileNamePrefix: string = 'doc'
): Promise<UploadResult> {
  try {
    const ext = fileOrBlob instanceof File && fileOrBlob.name.includes('.') 
      ? fileOrBlob.name.split('.').pop() 
      : 'pdf';
    
    const cleanId = generateUUID();
    const cleanPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Automatically prepend authenticated user's UUID as first folder segment for sensitive vaults
    let filePath = `${cleanPrefix}_${cleanId}.${ext}`;
    if (bucket === 'student-documents' || bucket === 'receipts' || bucket === 'offer-letters' || bucket === 'trade-documents') {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (userId && !fileNamePrefix.includes('/')) {
          filePath = `${userId}/${cleanPrefix}_${cleanId}.${ext}`;
        }
      } catch (e) {
        // Fallback to root if unauthenticated/offline
      }
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn(`[Storage Upload Notice - ${bucket}]:`, uploadError.message);
      if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
        return {
          url: URL.createObjectURL(fileOrBlob),
          path: filePath,
        };
      }
      return { url: '', path: filePath, error: uploadError.message };
    }

    // For private buckets, generate a secure signed URL (valid 24 hours)
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 86400);

    if (!signError && signedData?.signedUrl) {
      return {
        url: signedData.signedUrl,
        path: filePath,
      };
    }

    // Fallback to getPublicUrl
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (err: any) {
    console.error(`[uploadFileToBucket Error - ${bucket}]:`, err);
    return {
      url: fileOrBlob instanceof File || fileOrBlob instanceof Blob ? URL.createObjectURL(fileOrBlob) : '',
      path: '',
      error: err?.message || 'Upload failed',
    };
  }
}

/**
 * Resolves a secure, temporary Signed URL for a private storage object.
 * Accepts a raw storage path (e.g. 'doc_123.pdf') or a full Supabase URL.
 */
export async function getSignedFileUrl(
  bucket: StorageBucketName,
  filePathOrUrl: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!filePathOrUrl) return '';
  if (filePathOrUrl.startsWith('blob:') || filePathOrUrl.startsWith('data:')) {
    return filePathOrUrl;
  }

  // Extract path if a full Supabase storage URL was provided
  let cleanPath = filePathOrUrl;
  if (filePathOrUrl.includes(`/storage/v1/object/`)) {
    const parts = filePathOrUrl.split(`/storage/v1/object/`)[1];
    if (parts) {
      const subParts = parts.split('/');
      // Remove 'public/' or 'sign/' and bucket name if present
      if (subParts[0] === 'public' || subParts[0] === 'sign' || subParts[0] === 'authenticated') {
        subParts.shift();
      }
      if (subParts[0] === bucket) {
        subParts.shift();
      }
      cleanPath = subParts.join('/').split('?')[0];
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      // If signed URL generation fails, return the original URL
      return filePathOrUrl;
    }

    return data.signedUrl;
  } catch {
    return filePathOrUrl;
  }
}

/**
 * Deletes a file from Supabase Storage by path
 */
export async function deleteFileFromBucket(
  bucket: StorageBucketName,
  filePath: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.warn(`[Storage Remove Notice - ${bucket}]:`, error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
