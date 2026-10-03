import { Router, Request, Response } from 'express';
import { supabaseBranding } from '../lib/supabase.js';
import { getSession } from './auth.routes.js';

const router = Router();

// 1. GET /api/branding (Public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const branding = await supabaseBranding.get();
    return res.json({
      success: true,
      source: 'supabase',
      branding,
    });
  } catch (error: any) {
    console.error('Get branding error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat konfigurasi branding.',
    });
  }
});

// 2. PUT /api/branding (Admin only)
router.put('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    const session = getSession(token);
    if (!session || session.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Akses khusus administrator sekolah.',
      });
    }

    const { school_name, academic_year, logo_url, background_url, theme_color } = req.body;
    const updated = await supabaseBranding.update({
      ...(school_name !== undefined && { school_name }),
      ...(academic_year !== undefined && { academic_year }),
      ...(logo_url !== undefined && { logo_url }),
      ...(background_url !== undefined && { background_url }),
      ...(theme_color !== undefined && { theme_color }),
    });

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Tampilan & branding sekolah berhasil disimpan.',
      branding: updated,
    });
  } catch (error: any) {
    console.error('Update branding error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui tampilan branding sekolah.',
    });
  }
});

// 3. POST /api/branding/upload (Admin upload logo or background)
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    const session = getSession(token);
    if (!session || session.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Akses khusus administrator sekolah.',
      });
    }

    const { type, image_base64, mime_type } = req.body;
    if (!type || !image_base64) {
      return res.status(400).json({
        success: false,
        message: 'Tipe file dan konten gambar (base64) wajib disertakan.',
      });
    }

    if (type !== 'logo' && type !== 'background') {
      return res.status(400).json({
        success: false,
        message: 'Tipe gambar harus berupa "logo" atau "background".',
      });
    }

    const publicUrl = await supabaseBranding.uploadAsset(type, image_base64, mime_type || 'image/png');
    if (!publicUrl) {
      return res.status(500).json({
        success: false,
        message: `Gagal mengunggah ${type === 'logo' ? 'Logo Sekolah' : 'Background Banner'} ke Supabase Storage.`,
      });
    }

    const currentBranding = await supabaseBranding.get();

    // Auto-generate 1:1 square PWA icons if logo was uploaded
    if (type === 'logo') {
      try {
        const sharp = (await import('sharp')).default;
        const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');
        
        const icon512 = await sharp(imageBuffer)
          .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();

        const icon192 = await sharp(imageBuffer)
          .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();

        const maskable512 = await sharp(imageBuffer)
          .resize(410, 410, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .extend({
            top: 51,
            bottom: 51,
            left: 51,
            right: 51,
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png()
          .toBuffer();

        const fs = await import('fs');
        const path = await import('path');
        const publicDir = path.resolve(process.cwd(), 'public');
        const distDir = path.resolve(process.cwd(), 'dist');

        fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
        fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
        fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskable512);

        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'pwa-512x512.png'), icon512);
          fs.writeFileSync(path.join(distDir, 'pwa-192x192.png'), icon192);
          fs.writeFileSync(path.join(distDir, 'pwa-maskable-512x512.png'), maskable512);
        }
      } catch (iconErr) {
        console.warn('Could not auto-generate PWA icons on logo upload:', iconErr);
      }
    }

    return res.json({
      success: true,
      source: 'supabase',
      message: `${type === 'logo' ? 'Logo Sekolah' : 'Background Banner'} berhasil diunggah dan aktif.`,
      url: publicUrl,
      branding: currentBranding,
    });
  } catch (error: any) {
    console.error('Upload branding asset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengunggah berkas branding.',
    });
  }
});

// 4. POST /api/branding/reset (Admin reset to default)
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    const session = getSession(token);
    if (!session || session.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Akses khusus administrator sekolah.',
      });
    }

    const resetBranding = await supabaseBranding.reset();

    // Re-generate default square icons from school-logo.png
    try {
      const fs = await import('fs');
      const path = await import('path');
      const publicDir = path.resolve(process.cwd(), 'public');
      const distDir = path.resolve(process.cwd(), 'dist');
      const schoolLogo = path.join(publicDir, 'school-logo.png');
      if (fs.existsSync(schoolLogo)) {
        const sharp = (await import('sharp')).default;
        const icon512 = await sharp(schoolLogo)
          .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();
        const icon192 = await sharp(schoolLogo)
          .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();
        fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
        fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'pwa-512x512.png'), icon512);
          fs.writeFileSync(path.join(distDir, 'pwa-192x192.png'), icon192);
        }
      }
    } catch {}

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Branding sekolah berhasil dikembalikan ke pengaturan awal.',
      branding: resetBranding,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mereset branding sekolah.',
    });
  }
});

export default router;
