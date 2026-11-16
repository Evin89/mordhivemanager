/** Decode locally; the stored data URL is bounded including base64 overhead. */
export async function processPortraitPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a photo smaller than 15 MB.');
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      source = img;
    } catch {
      throw new Error('This image could not be opened. Try a JPEG or WebP photo.');
    } finally { URL.revokeObjectURL(url); }
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Photo processing is unavailable in this browser.');
    const side = Math.min(source.width, source.height);
    ctx.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 320, 320);
    let result = canvas.toDataURL('image/webp', 0.8);
    const format = result.startsWith('data:image/webp;') ? 'image/webp' : 'image/jpeg';
    for (let quality = format === 'image/webp' ? 0.8 : 0.82; quality >= 0.1; quality -= 0.1) {
      result = canvas.toDataURL(format, quality);
      if (result.length <= 60 * 1024) return result;
    }
    throw new Error('This photo could not fit within 60 KB. Try a simpler image.');
  } finally { if ('close' in source) source.close(); }
}
