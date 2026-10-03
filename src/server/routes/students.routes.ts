import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Student } from '../../types.js';
import { 
  supabaseStudents, 
  supabaseUsers, 
  supabaseStorage,
  isSupabaseConfigured,
  getSupabaseAdmin
} from '../lib/supabase.js';

const router = Router();

// 1. GET /api/students (List all students with search & class filters from Supabase)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, class_name, status } = req.query;

    const list = await supabaseStudents.getAll({
      search: typeof search === 'string' ? search : undefined,
      class_name: typeof class_name === 'string' ? class_name : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    const students = (list || []).sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '', 'id', { sensitivity: 'base' })
    );

    return res.json({
      success: true,
      source: 'supabase',
      total: students.length,
      students,
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data siswa dari database.',
      total: 0,
      students: [],
    });
  }
});

// 2. GET /api/students/:id (Get single student from Supabase)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await supabaseStudents.getById(id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }

    return res.json({ success: true, source: 'supabase', student });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data siswa.' });
  }
});

// 3. PUT /api/students/:id (Update student profile in Supabase)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, class_name, gender, whatsapp, profile_photo_url } = req.body;

    const currentStudent = await supabaseStudents.getById(id);
    if (!currentStudent) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }

    let finalProfilePhotoUrl = profile_photo_url;
    if (isSupabaseConfigured() && typeof profile_photo_url === 'string' && profile_photo_url.startsWith('data:')) {
      // Clean up previous custom photo from Supabase storage so storage does not accumulate orphaned files
      if (currentStudent.profile_photo_url && currentStudent.profile_photo_url.includes('profile-images/')) {
        await supabaseStorage.deleteFile('profile-images', currentStudent.profile_photo_url);
      }

      const fileName = `profile_${id}_${Date.now()}.jpg`;
      const uploadedPublicUrl = await supabaseStorage.uploadBase64(
        'profile-images',
        fileName,
        profile_photo_url,
        'image/jpeg'
      );
      if (uploadedPublicUrl) {
        finalProfilePhotoUrl = uploadedPublicUrl;
      }
    }

    const updates: Record<string, unknown> = {};
    if (full_name) updates.full_name = full_name.trim();
    if (class_name) updates.class_name = class_name.trim();
    if (gender) updates.gender = gender;
    if (whatsapp) updates.whatsapp = whatsapp.trim();
    if (finalProfilePhotoUrl) updates.profile_photo_url = finalProfilePhotoUrl;
    updates.updated_at = new Date().toISOString();

    const updatedStudent = await supabaseStudents.update(id, updates);

    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Profil siswa berhasil diperbarui.',
      student: updatedStudent,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui profil siswa.' });
  }
});

// 4. PUT /api/students/:id/status (Toggle active / inactive account status in Supabase)
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updatedStudent = await supabaseStudents.update(id, { is_active: Boolean(is_active) });

    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: `Status akun siswa berhasil diubah menjadi ${is_active ? 'AKTIF' : 'NONAKTIF'}.`,
      student: updatedStudent,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengubah status akun siswa.' });
  }
});

// 5. PUT /api/students/:id/reset-password (Admin reset password in Supabase users table)
router.put('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || typeof new_password !== 'string' || new_password.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 4 karakter.',
      });
    }

    const student = await supabaseStudents.getById(id);
    if (!student || !student.user_id) {
      return res.status(404).json({ success: false, message: 'Akun siswa tidak ditemukan di sistem.' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, message: 'Database Supabase tidak terhubung.' });
    }

    const { error } = await supabase
      .from('users')
      .update({ password_hash: new_password.trim() })
      .eq('id', student.user_id);

    if (error) {
      console.error('[Students] Reset password error:', error);
      return res.status(500).json({ success: false, message: 'Gagal mereset password di Supabase.' });
    }

    return res.json({
      success: true,
      message: `Password siswa ${student.full_name} berhasil direset.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mereset password siswa.' });
  }
});

// 5B. GET /api/students/:id/password (Admin view student password from Supabase users table)
router.get('/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await supabaseStudents.getById(id);
    if (!student || !student.user_id) {
      return res.status(404).json({ success: false, message: 'Akun siswa tidak ditemukan di sistem.' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, message: 'Database Supabase tidak terhubung.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('username, password_hash')
      .eq('id', student.user_id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'Data autentikasi pengguna tidak ditemukan.' });
    }

    return res.json({
      success: true,
      student_id: student.id,
      full_name: student.full_name,
      username: user.username,
      password: user.password_hash,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil password siswa.' });
  }
});

// 6. POST /api/students (Admin create new student in Supabase with anti-duplication)
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Koneksi Database Supabase belum aktif di server. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY telah diatur di Environment Variables cPanel.',
      });
    }

    const { full_name, class_name, gender, whatsapp, username, password, profile_photo_url } = req.body;

    if (!full_name || !class_name || !gender || !whatsapp || !username || !password) {
      return res.status(400).json({ success: false, message: 'Seluruh data siswa wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username hanya boleh huruf, angka, titik, atau strip.' });
    }

    // 1. Check duplicate username
    const existingDbUser = await supabaseUsers.getByUsername(cleanUsername);
    if (existingDbUser) {
      return res.status(409).json({ success: false, message: `Username "${cleanUsername}" sudah terdaftar di database. Silakan gunakan username lain.` });
    }

    // 2. Check duplicate WhatsApp and student name + class
    const existingStudents = await supabaseStudents.getAll();
    if (existingStudents && existingStudents.length > 0) {
      const cleanWa = whatsapp.trim().replace(/[^0-9]/g, '');
      const duplicateWa = existingStudents.find((s) => s.whatsapp?.replace(/[^0-9]/g, '') === cleanWa);
      if (duplicateWa) {
        return res.status(409).json({
          success: false,
          message: `Nomor WhatsApp ${whatsapp} sudah terdaftar untuk siswa ${duplicateWa.full_name} (${duplicateWa.class_name}).`,
        });
      }

      const cleanName = full_name.trim().toLowerCase();
      const cleanClass = class_name.trim().toLowerCase();
      const duplicateStudent = existingStudents.find((s) =>
        s.full_name.trim().toLowerCase() === cleanName &&
        s.class_name.trim().toLowerCase() === cleanClass
      );
      if (duplicateStudent) {
        return res.status(409).json({
          success: false,
          message: `Siswa "${full_name}" di kelas "${class_name}" sudah terdaftar di database.`,
        });
      }
    }

    const newUserId = crypto.randomUUID();
    const newStudentId = crypto.randomUUID();
    let photoUrl = profile_photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

    if (profile_photo_url && typeof profile_photo_url === 'string' && profile_photo_url.startsWith('data:')) {
      const fileName = `profile_${newStudentId}_${Date.now()}.jpg`;
      const uploadedPublicUrl = await supabaseStorage.uploadBase64(
        'profile-images',
        fileName,
        profile_photo_url,
        'image/jpeg'
      );
      if (uploadedPublicUrl) {
        photoUrl = uploadedPublicUrl;
      }
    }

    const newStudent: Student = {
      id: newStudentId,
      user_id: newUserId,
      username: cleanUsername,
      full_name: full_name.trim(),
      class_name: class_name.trim(),
      gender,
      whatsapp: whatsapp.trim(),
      profile_photo_url: photoUrl,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const newUser = {
      id: newUserId,
      username: cleanUsername,
      password_hash: password,
      role: 'student' as const,
      created_at: new Date().toISOString(),
    };

    const userResult = await supabaseUsers.create(newUser);
    if (!userResult.user) {
      return res.status(500).json({
        success: false,
        message: `Gagal membuat akun login siswa di database Supabase: ${userResult.error || 'Periksa izin RLS tabel users.'}`,
      });
    }

    const createdStudent = await supabaseStudents.create(newStudent);
    if (!createdStudent) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('users').delete().eq('id', newUserId);
      }
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan profil siswa di database Supabase. Periksa izin RLS tabel students.',
      });
    }

    return res.status(201).json({
      success: true,
      message: `Siswa ${createdStudent.full_name} berhasil ditambahkan ke database Supabase.`,
      student: createdStudent,
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return res.status(500).json({ success: false, message: `Gagal menambahkan data siswa baru: ${error?.message || ''}` });
  }
});

// 7. DELETE /api/students/:id (Admin permanently delete student + all attendance records + photos)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find student first (by student id or user id)
    let student = await supabaseStudents.getById(id);
    if (!student && isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: s } = await supabase.from('students').select('id').eq('user_id', id).maybeSingle();
        if (s?.id) student = await supabaseStudents.getById(s.id);
      }
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan di database.' });
    }

    // Perform complete cascading deletion (removes attendance photos, profile photo, attendance records, student, and user)
    const result = await supabaseStudents.deleteFull(student.id);

    return res.json({
      success: true,
      message: `Data siswa ${student.full_name} (@${student.username}) beserta seluruh data absensi dan foto berhasil dihapus permanen dari Supabase.`,
      deleted_photos_count: result.deletedPhotosCount,
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus data siswa.' });
  }
});

export default router;
