import { createClient } from '@/lib/supabase/client';

/** Upload constraints shared by every image upload in the staff portal. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export interface ImageUploadResult {
  url?: string;
  error?: string;
}

/**
 * Uploads an image to the public `dish-photos` bucket and returns its public
 * URL. The bucket's storage policies already allow authenticated staff uploads
 * and public reads, so no extra SQL is needed.
 *
 * `folder` keeps different kinds of assets apart (e.g. `settings/` for the UPI
 * QR code, root for dish photos).
 */
export async function uploadPublicImage(file: File, folder = 'settings'): Promise<ImageUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Please choose a JPG, PNG, WebP, AVIF or GIF image.' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'Image is too large. Please use a file under 5 MB.' };
  }

  try {
    const supabase = createClient();

    const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).substring(2, 10);

    const path = `${folder}/${Date.now()}-${uniqueId}.${extension}`;

    const { error } = await supabase.storage.from('dish-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      return { error: error.message };
    }

    const { data } = supabase.storage.from('dish-photos').getPublicUrl(path);
    return data?.publicUrl ? { url: data.publicUrl } : { error: 'Could not build the image URL.' };
  } catch (e) {
    console.error('Image upload failed:', e);
    return { error: 'Upload failed. Please try again.' };
  }
}
