import { supabase } from './supabase';

const BUCKET = 'activity-images';
const MAX_DIM = 1600;      // longest edge, px
const QUALITY = 0.85;      // JPEG quality — light compression, still crisp

/**
 * Downscale an image to at most MAX_DIM on its longest edge and re-encode as JPEG.
 * Handles orientation via the browser's native decode. Returns a JPEG Blob.
 */
export async function compressToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  if (!blob) throw new Error('Image encode failed');
  return blob;
}

/**
 * Compress + upload one or more images for a user; returns their public URLs.
 * Files are stored under `<userId>/…` so per-user RLS policies apply.
 */
export async function uploadImages(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const jpeg = await compressToJpeg(file);
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, jpeg, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

/** Best-effort delete of an uploaded image by its public URL (ignores failures). */
export async function deleteImage(url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
