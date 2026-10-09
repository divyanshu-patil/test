export const MAX_FILES = 10;
export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_CAPTION = 2200;

/** Client-side checks for fast feedback only; the API re-validates the actual bytes. */
export function validateFiles(existing: number, files: File[]): { ok: File[]; errors: string[] } {
  const ok: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (!ACCEPTED.includes(f.type)) errors.push(`${f.name}: use a JPEG, PNG, WebP or GIF image.`);
    else if (f.size > MAX_BYTES) errors.push(`${f.name}: images must be under 10 MB.`);
    else if (existing + ok.length >= MAX_FILES) {
      errors.push(`You can add up to ${MAX_FILES} images per post.`);
      break;
    } else ok.push(f);
  }
  return { ok, errors };
}
