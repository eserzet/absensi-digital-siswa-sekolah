/**
 * Client-side image compression utility using HTML5 Canvas.
 * Compresses images before uploading to minimize Supabase Storage and database usage.
 * Target size for selfies/profiles: ~15 KB - 25 KB.
 * Target size for schedule images: ~50 KB - 90 KB (while keeping timetable text sharp).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetMaxKb?: number;
}

export async function compressImageToDataUrl(
  fileOrDataUrl: File | string,
  options: CompressionOptions = {}
): Promise<string> {
  const maxWidth = options.maxWidth || 360;
  const maxHeight = options.maxHeight || 360;
  const initialQuality = options.quality !== undefined ? options.quality : 0.5;
  const targetMaxKb = options.targetMaxKb || 22; // ~15-25 KB

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const runCompression = () => {
      try {
        let width = img.width || 360;
        let height = img.height || 360;

        // Scale down keeping aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
          return;
        }

        // Draw image onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = initialQuality;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate approximate size in KB
        let approxKb = (dataUrl.length * 3) / 4 / 1024;

        // Iteratively lower quality until under targetMaxKb or reached minimum quality
        while (approxKb > targetMaxKb && quality > 0.25) {
          quality -= 0.06;
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.25, quality));
          approxKb = (dataUrl.length * 3) / 4 / 1024;
        }

        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas compression error, using fallback:', err);
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      }
    };

    img.onload = runCompression;
    img.onerror = () => {
      if (typeof fileOrDataUrl === 'string') {
        resolve(fileOrDataUrl);
      } else {
        reject(new Error('Gagal memuat gambar untuk kompresi'));
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
