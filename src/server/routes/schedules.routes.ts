import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { 
  supabaseSchedules, 
  supabaseStorage,
  isSupabaseConfigured 
} from '../lib/supabase.js';
import { ScheduleItem, ScheduleImage } from '../../types.js';

const router = Router();

// 1. GET /api/schedules/images (Get all schedule images/files from Supabase)
router.get(['/images', '/upload-image'], async (req: Request, res: Response) => {
  const dbImages = await supabaseSchedules.getImages();
  const images: ScheduleImage[] = dbImages || [];

  return res.json({
    success: true,
    source: 'supabase',
    schedule_images: images,
    images: images,
  });
});

// DELETE schedule image/document file from Supabase Storage and DB (placed before /:id)
router.delete(['/images/:id', '/images', '/upload-image/:id', '/upload-image'], async (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.body?.id || 'all';
    await supabaseSchedules.deleteImage(id);
    const remaining = await supabaseSchedules.getImages();

    return res.json({
      success: true,
      message: 'File jadwal pelajaran berhasil dihapus dari sistem.',
      schedule_images: remaining || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus file jadwal.' });
  }
});

// 2. GET /api/schedules (Get schedules with filters from Supabase)
router.get('/', async (req: Request, res: Response) => {
  const { class_name, day } = req.query;

  const dbSchedules = await supabaseSchedules.getAll({
    class_name: typeof class_name === 'string' ? class_name : undefined,
    day: typeof day === 'string' ? day : undefined,
  });
  const dbImages = await supabaseSchedules.getImages();

  const list: ScheduleItem[] = dbSchedules || [];
  const images: ScheduleImage[] = dbImages || [];

  return res.json({
    success: true,
    source: 'supabase',
    schedules: list,
    images: images,
  });
});

// 3. POST /api/schedules (Admin add schedule item to Supabase with anti-duplication check)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { class_name, day, subject, teacher, start_time, end_time, room } = req.body;

    if (!class_name || !day || !subject || !teacher || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Lengkapi semua data jadwal mata pelajaran.',
      });
    }

    // Anti-duplication check for schedule items
    const existingList = await supabaseSchedules.getAll({ class_name: class_name.trim(), day });
    if (existingList && existingList.length > 0) {
      const isDuplicate = existingList.some((s) =>
        s.subject.toLowerCase().trim() === subject.toLowerCase().trim() &&
        s.start_time.trim() === start_time.trim() &&
        s.end_time.trim() === end_time.trim()
      );
      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          message: `Jadwal ${subject} untuk ${class_name} pada hari ${day} (${start_time} - ${end_time}) sudah terdaftar di database.`,
        });
      }
    }

    const newSchedule: ScheduleItem = {
      id: crypto.randomUUID(),
      class_name: class_name.trim(),
      day,
      subject: subject.trim(),
      teacher: teacher.trim(),
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      room: room ? room.trim() : undefined,
      created_at: new Date().toISOString(),
    };

    const created = await supabaseSchedules.create(newSchedule);

    if (!created) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan jadwal pelajaran ke database Supabase. Periksa koneksi dan skema database.',
      });
    }

    return res.status(201).json({
      success: true,
      source: 'supabase',
      message: 'Jadwal pelajaran berhasil ditambahkan ke Supabase.',
      schedule: created,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menambahkan jadwal pelajaran.' });
  }
});

// 4. PUT /api/schedules/:id (Admin update schedule item in Supabase)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { class_name, day, subject, teacher, start_time, end_time, room } = req.body;

    const updates: Partial<ScheduleItem> = {};
    if (class_name) updates.class_name = class_name.trim();
    if (day) updates.day = day;
    if (subject) updates.subject = subject.trim();
    if (teacher) updates.teacher = teacher.trim();
    if (start_time) updates.start_time = start_time.trim();
    if (end_time) updates.end_time = end_time.trim();
    if (room !== undefined) updates.room = room ? room.trim() : undefined;

    const updated = await supabaseSchedules.update(id, updates);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Jadwal pelajaran berhasil diperbarui di Supabase.',
      schedule: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui jadwal pelajaran.' });
  }
});

// 5. DELETE /api/schedules/:id (Admin delete schedule item from Supabase)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await supabaseSchedules.delete(id);

    return res.json({ success: true, message: 'Jadwal pelajaran berhasil dihapus dari Supabase.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus jadwal pelajaran.' });
  }
});

// 6. POST /api/schedules/upload-image or /api/schedules/images (Admin upload schedule document/image file)
router.post(['/upload-image', '/images'], async (req: Request, res: Response) => {
  try {
    const { class_grade, image_url, title, file_name, file_type, file_size } = req.body;

    if (!image_url) {
      return res.status(400).json({
        success: false,
        message: 'File jadwal wajib diisi.',
      });
    }

    const grade = 'all';
    const className = 'Semua Kelas (10, 11, 12)';
    const defaultTitle = 'Jadwal Mata Pelajaran Lengkap';

    let storedImageUrl = image_url;

    // Detect file extension and MIME from base64 or file_name
    let extension = 'pdf';
    let mimeType = 'application/pdf';

    if (typeof image_url === 'string' && image_url.startsWith('data:')) {
      const dataUriMatch = image_url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      if (dataUriMatch) {
        mimeType = dataUriMatch[1];
        if (mimeType.includes('pdf')) extension = 'pdf';
        else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('sheet')) extension = 'xlsx';
        else if (mimeType.includes('word') || mimeType.includes('document')) extension = 'docx';
        else if (mimeType.includes('png')) extension = 'png';
        else if (mimeType.includes('webp')) extension = 'webp';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
      }
    } else if (file_name) {
      const dotParts = file_name.split('.');
      if (dotParts.length > 1) {
        extension = dotParts.pop()!.toLowerCase();
      }
    }

    // Determine simplified file_type
    let detectedFileType: 'pdf' | 'excel' | 'word' | 'image' | 'file' = file_type || 'file';
    if (extension === 'pdf') detectedFileType = 'pdf';
    else if (['xlsx', 'xls', 'csv'].includes(extension)) detectedFileType = 'excel';
    else if (['docx', 'doc'].includes(extension)) detectedFileType = 'word';
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) detectedFileType = 'image';

    // Upload to Supabase Storage bucket 'schedule-images' if file is base64
    if (typeof image_url === 'string' && image_url.startsWith('data:')) {
      // 1. Get current files in storage to clean up replaced ones
      const supabase = (await import('../lib/supabase.js')).getSupabaseAdmin();
      let existingFiles: string[] = [];
      if (supabase) {
        try {
          const { data: list } = await supabase.storage.from('schedule-images').list();
          existingFiles = (list || []).filter(f => f.name && !f.name.startsWith('.')).map(f => f.name);
        } catch {}
      }

      const safeName = file_name ? file_name.replace(/[^a-zA-Z0-9._-]/g, '_') : `jadwal_all_${Date.now()}.${extension}`;
      const fileName = `schedule_${Date.now()}_${safeName}`;
      const uploadedPublicUrl = await supabaseStorage.uploadBase64(
        'schedule-images',
        fileName,
        image_url,
        mimeType
      );
      if (uploadedPublicUrl) {
        storedImageUrl = uploadedPublicUrl;

        // Auto-delete older schedule files so they don't pile up in Supabase Storage!
        if (supabase && existingFiles.length > 0) {
          const filesToDelete = existingFiles.filter(f => f !== fileName);
          if (filesToDelete.length > 0) {
            console.log(`[Schedules] Cleaned up ${filesToDelete.length} replaced schedule file(s) from Supabase Storage:`, filesToDelete);
            try { await supabase.storage.from('schedule-images').remove(filesToDelete); } catch {}
          }
        }
      }
    }

    const updatedRecord: ScheduleImage = {
      id: 'img-10',
      class_grade: 'all',
      class_name: className,
      image_url: storedImageUrl,
      title: title || file_name || defaultTitle,
      updated_at: new Date().toISOString(),
      file_type: detectedFileType,
      file_name: file_name || `Jadwal-Mapel.${extension}`,
      file_size: file_size || undefined,
    };

    await supabaseSchedules.upsertImage({
      id: updatedRecord.id,
      class_grade: updatedRecord.class_grade,
      class_name: updatedRecord.class_name,
      image_url: updatedRecord.image_url,
      title: updatedRecord.title,
      updated_at: updatedRecord.updated_at,
    });

    const allImages = await supabaseSchedules.getImages();

    return res.json({
      success: true,
      source: 'supabase',
      message: 'File jadwal pelajaran berhasil diunggah ke Supabase (berlaku untuk semua kelas).',
      schedule_image: updatedRecord,
      image: updatedRecord,
      schedule_images: allImages || [updatedRecord],
      images: allImages || [updatedRecord],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui file jadwal.' });
  }
});

export default router;
