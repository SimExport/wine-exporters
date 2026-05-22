import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://dmgafmigqfycyaopdviw.supabase.co';

export interface ResumableUploadOptions {
  bucket: string;
  objectPath: string;
  file: File;
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  onProgress?: (percent: number) => void;
}

/**
 * Upload a file to Supabase Storage using the TUS resumable protocol.
 * Required for files larger than ~50MB (and recommended above 6MB).
 */
export async function resumableUpload(opts: ResumableUploadOptions): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(opts.file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': opts.upsert ? 'true' : 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: opts.bucket,
        objectName: opts.objectPath,
        contentType: opts.contentType || opts.file.type || 'application/octet-stream',
        cacheControl: opts.cacheControl || '3600',
      },
      onError: (err) => reject(err),
      onProgress: (sent, total) => {
        if (opts.onProgress && total > 0) {
          opts.onProgress(Math.round((sent / total) * 100));
        }
      },
      onSuccess: () => resolve(),
    });

    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(() => upload.start());
  });
}