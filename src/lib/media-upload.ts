import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';

export const EMAIL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const EMAIL_IMAGE_MAX_INPUT = 5 * 1024 * 1024;

const sanitizeKey = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');

/** Compresses an image for emailing and stores it in the user's media library (bucket + `media` row). */
export async function uploadEmailImage(userId: string, file: File): Promise<{ id: string; url: string; title: string }> {
  if (!EMAIL_IMAGE_TYPES.includes(file.type)) throw new Error('unsupported_type');
  if (file.size > EMAIL_IMAGE_MAX_INPUT) throw new Error('too_large');
  const compressed = await imageCompression(file, { maxWidthOrHeight: 1200, maxSizeMB: 0.3, useWebWorker: true, fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg' });
  const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
  const base = sanitizeKey(file.name.replace(/\.[^.]+$/, '')) || 'image';
  const path = `${userId}/image/${Date.now()}_${base}.${ext}`;
  const { error: upErr } = await supabase.storage.from('media').upload(path, compressed, { contentType: compressed.type, upsert: false, cacheControl: '3600' });
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
  const { data, error } = await supabase.from('media').insert({ user_id: userId, title: file.name, type: 'image', file_url: publicUrl }).select('id').single();
  if (error) throw error;
  return { id: data.id, url: publicUrl, title: file.name };
}

/** Campaigns of this user whose saved email uses the given media URL. */
export async function campaignsUsingMedia(userId: string, url: string): Promise<{ id: string; status: string; name: string }[]> {
  const { data } = await supabase.from('campaigns').select('id,status,name,message_html').eq('user_id', userId).not('message_html', 'is', null);
  return (data ?? []).filter((c: any) => String(c.message_html ?? '').includes(url)).map((c: any) => ({ id: c.id, status: c.status, name: c.name }));
}

/** Extracts a readable error message from supabase.functions.invoke failures. */
export async function functionErrorMessage(error: any, data: any): Promise<string> {
  if (data?.error) return String(data.error);
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* ignore */ }
  return String(error?.message ?? 'error');
}
