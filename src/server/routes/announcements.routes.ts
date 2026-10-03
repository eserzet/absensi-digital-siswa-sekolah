import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getSession } from './auth.routes.js';
import { 
  supabaseAnnouncements, 
  isSupabaseConfigured 
} from '../lib/supabase.js';
import { broadcastPush } from '../lib/pushService.js';
import { Announcement, AnnouncementPriority } from '../../types.js';

const router = Router();

// Persistent read tracker for announcements stored in scratch/announcement_reads.json
const READS_FILE = path.resolve(process.cwd(), 'scratch', 'announcement_reads.json');

// Proactively ensure the scratch directory exists at module load time
try {
  const dir = path.dirname(READS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('[Announcements] Created scratch directory:', dir);
  }
  // Also initialize the file if it doesn't exist
  if (!fs.existsSync(READS_FILE)) {
    fs.writeFileSync(READS_FILE, '[]', 'utf-8');
    console.log('[Announcements] Initialized reads file:', READS_FILE);
  }
} catch (err) {
  console.warn('[Announcements] Could not initialize scratch directory:', err);
}

function loadReadsFromFile(): { announcement_id: string; student_id: string; read_at: string }[] {
  try {
    if (fs.existsSync(READS_FILE)) {
      const content = fs.readFileSync(READS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[Announcements] Failed to load reads file:', err);
  }
  return [];
}

function saveReadsToFile(reads: { announcement_id: string; student_id: string; read_at: string }[]) {
  try {
    const dir = path.dirname(READS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(READS_FILE, JSON.stringify(reads, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Announcements] Failed to save reads file:', err);
  }
}

let announcementReads = loadReadsFromFile();

// 1. GET /api/announcements (List announcements from Supabase, with read status if student)
router.get('/', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  const session = getSession(token);

  const role = session?.role || 'public';
  const studentId = session?.userId || (req.query.student_id as string);

  const dbAnnouncements = await supabaseAnnouncements.getAll(role);
  const list: Announcement[] = dbAnnouncements || [];

  // Ensure latest file reads are synchronized
  announcementReads = loadReadsFromFile();

  // Attach is_read flag for student
  const formatted = list.map((a) => {
    const isRead = studentId
      ? announcementReads.some((r) => r.announcement_id === a.id && r.student_id === studentId)
      : false;
    return {
      ...a,
      is_read: isRead,
    };
  });

  return res.json({
    success: true,
    source: 'supabase',
    announcements: formatted,
  });
});

// 2. GET /api/announcements/unread-count (For student header bell icon badge)
router.get('/unread-count', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  const session = getSession(token);
  const studentId = session?.userId || (req.query.student_id as string);

  if (!studentId && (!session || session.role !== 'student')) {
    return res.json({ success: true, unread_count: 0 });
  }

  const dbList = await supabaseAnnouncements.getAll('student');
  const published: Announcement[] = (dbList || []).filter((a) => a.status === 'published');

  announcementReads = loadReadsFromFile();

  const readIds = new Set(
    announcementReads.filter((r) => r.student_id === studentId).map((r) => r.announcement_id)
  );

  const unreadCount = published.filter((a) => !readIds.has(a.id)).length;

  return res.json({
    success: true,
    unread_count: unreadCount,
  });
});

// 3. POST /api/announcements/:id/read (Mark as read)
router.post('/:id/read', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body.token as string);
  const session = getSession(token);
  const studentId = session?.userId || (req.body?.student_id as string);

  if (!studentId && (!session || session.role !== 'student')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const announcementId = req.params.id;
  announcementReads = loadReadsFromFile();

  const exists = announcementReads.some(
    (r) => r.announcement_id === announcementId && r.student_id === studentId
  );

  if (!exists) {
    announcementReads.push({
      announcement_id: announcementId,
      student_id: studentId,
      read_at: new Date().toISOString(),
    });
    saveReadsToFile(announcementReads);
  }

  return res.json({ success: true, message: 'Ditandai telah dibaca.' });
});

// 3b. POST /api/announcements/read-all (Mark all announcements as read for current student)
router.post('/read-all', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.body.token as string);
  const session = getSession(token);
  const studentId = session?.userId || (req.body?.student_id as string);

  if (!studentId && (!session || session.role !== 'student')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const dbList = await supabaseAnnouncements.getAll('student');
  const published: Announcement[] = (dbList || []).filter((a) => a.status === 'published');

  announcementReads = loadReadsFromFile();
  const now = new Date().toISOString();

  for (const a of published) {
    const exists = announcementReads.some(
      (r) => r.announcement_id === a.id && r.student_id === studentId
    );
    if (!exists) {
      announcementReads.push({
        announcement_id: a.id,
        student_id: studentId,
        read_at: now,
      });
    }
  }

  saveReadsToFile(announcementReads);
  return res.json({ success: true, message: 'Semua pengumuman berhasil ditandai telah dibaca.' });
});

// 4. POST /api/announcements (Admin create announcement in Supabase)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, status = 'published', priority = 'normal' } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Judul dan isi pengumuman wajib diisi.',
      });
    }

    // Check for duplicate title among active announcements
    const existingList = await supabaseAnnouncements.getAll('admin');
    if (existingList && existingList.length > 0) {
      const cleanTitle = title.trim().toLowerCase();
      const duplicate = existingList.find((a) => a.title.trim().toLowerCase() === cleanTitle && a.status === 'published');
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Pengumuman dengan judul "${title.trim()}" sudah ada dan masih aktif. Gunakan judul lain atau perbarui pengumuman tersebut.`,
        });
      }
    }

    const newId = crypto.randomUUID();
    const normalizedPriority: AnnouncementPriority = 
      (priority === 'important' || priority === 'penting') ? 'important' : 'normal';

    const newAnnouncement: Announcement = {
      id: newId,
      title: title.trim(),
      content: content.trim(),
      date: new Date().toISOString().split('T')[0],
      status: status === 'draft' ? ('draft' as const) : ('published' as const),
      priority: normalizedPriority,
      created_at: new Date().toISOString(),
      is_active: true,
    };

    const created = await supabaseAnnouncements.create(newAnnouncement);

    if (!created) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan pengumuman ke database Supabase. Periksa koneksi dan skema database.',
      });
    }

    // Send push notification to all subscribed devices (background, non-blocking)
    if (newAnnouncement.status === 'published') {
      broadcastPush({
        title: `📢 ${created.title}`,
        body: created.content.substring(0, 120) + (created.content.length > 120 ? '...' : ''),
        url: '/',
        tag: `announcement-${created.id}`,
      }).catch((err) => console.error('[Announcements] Push broadcast error:', err));
    }

    return res.status(201).json({
      success: true,
      source: 'supabase',
      message: 'Pengumuman berhasil diterbitkan ke Supabase.',
      announcement: created,
    });
  } catch (error) {
    console.error('[Announcements] POST error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat pengumuman.',
    });
  }
});

// 5. PUT /api/announcements/:id (Admin update announcement in Supabase)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, status, priority, is_active } = req.body;

    const updates: Partial<Announcement> = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (status !== undefined) {
      updates.status = status;
      updates.is_active = status === 'published';
    }
    if (priority !== undefined) {
      updates.priority = (priority === 'important' || priority === 'penting') ? 'important' : 'normal';
    }
    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
      if (updates.status === undefined) {
        updates.status = updates.is_active ? 'published' : 'draft';
      }
    }

    const updated = await supabaseAnnouncements.update(id, updates);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Pengumuman berhasil diperbarui.',
      announcement: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengumuman.' });
  }
});

// 6. DELETE /api/announcements/:id (Admin delete announcement from Supabase)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await supabaseAnnouncements.delete(id);

    return res.json({ success: true, message: 'Pengumuman berhasil dihapus dari Supabase.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus pengumuman.' });
  }
});

export default router;
