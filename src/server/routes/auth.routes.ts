import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  supabaseUsers,
  supabaseStudents,
  supabaseStorage,
  isSupabaseConfigured,
  getSupabaseAdmin
} from '../lib/supabase.js';
import { Student } from '../../types.js';

const router = Router();

// In-memory token session map for fast lookup with resilient decoding
const activeSessions = new Map<string, { role: 'student' | 'admin'; userId: string; username: string }>();

export function generateToken(roleOrPrefix: 'student' | 'admin' | string, userId: string, username: string): string {
  const role = roleOrPrefix.startsWith('admin') ? 'admin' : 'student';
  const resolvedUserId = userId || (role === 'admin' ? 'admin-root' : 'unknown-user');
  const resolvedUsername = username || (role === 'admin' ? 'NUBA' : 'unknown-username');

  const payload = {
    role,
    userId: resolvedUserId,
    username: resolvedUsername,
    createdAt: Date.now(),
    nonce: Math.random().toString(36).substring(2, 9),
  };
  const token = `nb_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  activeSessions.set(token, { role, userId: resolvedUserId, username: resolvedUsername });
  return token;
}

export function getSession(token?: string) {
  if (!token) return null;
  if (activeSessions.has(token)) {
    return activeSessions.get(token)!;
  }

  // Resilient token recovery for nb_ format
  if (token.startsWith('nb_')) {
    try {
      const b64 = token.substring(3);
      const decodedStr = Buffer.from(b64, 'base64url').toString('utf-8');
      const payload = JSON.parse(decodedStr);
      if (payload && payload.role && payload.userId && payload.username) {
        if (payload.role === 'student') {
          const restored = { role: 'student' as const, userId: payload.userId, username: payload.username };
          activeSessions.set(token, restored);
          return restored;
        } else if (payload.role === 'admin') {
          const restored = { role: 'admin' as const, userId: payload.userId, username: payload.username };
          activeSessions.set(token, restored);
          return restored;
        }
      }
    } catch {
      // ignore parse error
    }
  }

  // Graceful recovery for admin token
  if (token.startsWith('admin_')) {
    const restored = { role: 'admin' as const, userId: 'admin-root', username: (process.env.ADMIN_USERNAME || 'NUBA').trim() };
    activeSessions.set(token, restored);
    return restored;
  }

  return null;
}

// 1. POST /api/auth/student/register
router.post('/student/register', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Koneksi Database Supabase belum aktif di server. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY telah diatur di Environment Variables cPanel.',
      });
    }

    const {
      full_name,
      class_name,
      gender,
      whatsapp,
      username,
      password,
      confirm_password,
      profile_photo_url,
    } = req.body;

    // Validations
    if (!profile_photo_url || typeof profile_photo_url !== 'string' || !profile_photo_url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Foto profil siswa wajib diunggah untuk kelengkapan identitas pendaftaran.',
      });
    }

    if (!profile_photo_url.startsWith('data:image') && !profile_photo_url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Format foto profil tidak valid. Silakan unggah foto dari galeri (JPG, JPEG, PNG, atau WEBP).',
      });
    }

    if (!full_name || !class_name || !gender || !whatsapp || !username || !password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Seluruh field formulir pendaftaran wajib diisi.',
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Password dan Konfirmasi Password tidak cocok.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal terdiri dari 6 karakter.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username hanya boleh berisi huruf, angka, titik, atau strip.',
      });
    }

    // Check unique username in Supabase
    const existingDbUser = await supabaseUsers.getByUsername(cleanUsername);
    if (existingDbUser) {
      return res.status(400).json({
        success: false,
        message: 'Username ini sudah digunakan siswa lain di database sekolah. Silakan pilih username yang berbeda.',
      });
    }

    // Photo size check if base64 provided
    if (profile_photo_url && profile_photo_url.startsWith('data:image')) {
      const base64Length = profile_photo_url.length;
      const sizeInBytes = 4 * Math.ceil(base64Length / 3) * 0.5624896334383812;
      if (sizeInBytes > 3 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran foto profil melebihi batas maksimal 3 MB.',
        });
      }
    }

    const newUserId = crypto.randomUUID();
    const newStudentId = crypto.randomUUID();
    let photoUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

    if (profile_photo_url && typeof profile_photo_url === 'string' && profile_photo_url.startsWith('data:')) {
      const fileName = `profile_${newStudentId}_${Date.now()}.jpg`;
      const uploadedPublicUrl = await supabaseStorage.uploadBase64(
        'profile-images',
        fileName,
        profile_photo_url,
        'image/jpeg'
      );
      photoUrl = uploadedPublicUrl || photoUrl;
    } else if (profile_photo_url) {
      photoUrl = profile_photo_url;
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

    // Save strictly to Supabase
    const userResult = await supabaseUsers.create(newUser);
    if (!userResult.user) {
      return res.status(500).json({
        success: false,
        message: `Gagal membuat akun login siswa di database: ${userResult.error || 'Periksa izin akses (RLS) Supabase'}`,
      });
    }

    const createdStudent = await supabaseStudents.create(newStudent);
    if (!createdStudent) {
      // rollback created user if student insert fails
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('users').delete().eq('id', newUserId);
      }
      return res.status(500).json({
        success: false,
        message: 'Gagal menyimpan profil siswa ke tabel students database Supabase.',
      });
    }

    // Auto-login session token
    const token = generateToken('student', createdStudent.id, createdStudent.username);

    return res.status(201).json({
      success: true,
      source: 'supabase',
      message: 'Registrasi akun siswa berhasil tersimpan di database Supabase.',
      token,
      student: createdStudent,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: `Terjadi kendala pada server: ${error?.message || 'Gagal registrasi'}`,
    });
  }
});

// 2. POST /api/auth/student/login
router.post('/student/login', async (req: Request, res: Response) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Koneksi Database Supabase belum aktif di server. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY telah diatur di Environment Variables cPanel.',
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan Password wajib diisi.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check user in Supabase
    const dbUser = await supabaseUsers.getByUsername(cleanUsername);
    if (!dbUser || dbUser.password_hash !== password) {
      console.warn(`[Login] Gagal login untuk username: "${cleanUsername}". Ditemukan di DB: ${Boolean(dbUser)}, Password cocok: ${dbUser ? dbUser.password_hash === password : false}`);
      return res.status(401).json({
        success: false,
        message: 'PASSWORD SALAH PIKUN, PAMI CAN GADUH AKUN DAFTAR HELA HUNN 😹',
      });
    }

    let student = await supabaseStudents.getByUsername(cleanUsername);
    if (!student && dbUser.id) {
      student = await supabaseStudents.getById(dbUser.id);
    }

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Data profil siswa tidak ditemukan di database.',
      });
    }

    if (!student.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan oleh Admin. Silakan hubungi pihak sekolah.',
      });
    }

    const token = generateToken('student', student.id, student.username);

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Login siswa berhasil.',
      token,
      student,
    });
  } catch (error: any) {
    console.error('Student login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kendala pada server saat login siswa.',
    });
  }
});

// 3. POST /api/auth/admin/login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const adminUser = await supabaseUsers.getAdmin();
    const expectedUsername = (adminUser?.username || process.env.ADMIN_USERNAME || 'NUBA').trim();
    const expectedPassword = (adminUser?.password_hash || process.env.ADMIN_PASSWORD || 'NUBACIMERAK123').trim();

    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    const isUsernameMatch = cleanUsername.toUpperCase() === expectedUsername.toUpperCase();
    const isPasswordMatch = cleanPassword === expectedPassword;

    if (isUsernameMatch && isPasswordMatch) {
      const token = generateToken('admin', adminUser?.id || 'admin-root', expectedUsername);

      return res.json({
        success: true,
        source: 'supabase',
        message: 'Login admin berhasil.',
        token,
        admin: {
          username: expectedUsername,
          role: 'admin',
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Luu siape mpruyy? 😹',
      });
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kendala pada server saat login admin.',
    });
  }
});

// 3B. GET /api/auth/admin/credentials (Lihat data akun & sandi admin)
router.get('/admin/credentials', async (req: Request, res: Response) => {
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

    const adminUser = await supabaseUsers.getAdmin();
    const username = (adminUser?.username || process.env.ADMIN_USERNAME || 'NUBA').trim();
    const password = (adminUser?.password_hash || process.env.ADMIN_PASSWORD || 'NUBACIMERAK123').trim();

    return res.json({
      success: true,
      source: 'supabase',
      username,
      current_password: password,
      role: 'admin',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil kredensial admin.',
    });
  }
});

// 3C. PUT /api/auth/admin/password (Ubah / edit sandi admin - Legacy)
router.put('/admin/password', async (req: Request, res: Response) => {
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

    const { old_password, new_password, confirm_password } = req.body;

    if (!old_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Sandi lama, sandi baru, dan konfirmasi sandi wajib diisi.',
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Sandi baru dan konfirmasi sandi tidak cocok.',
      });
    }

    if (new_password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Sandi baru minimal harus 6 karakter.',
      });
    }

    const adminUser = await supabaseUsers.getAdmin();
    const expectedPassword = (adminUser?.password_hash || process.env.ADMIN_PASSWORD || 'NUBACIMERAK123').trim();

    if (old_password.trim() !== expectedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Sandi lama yang Anda masukkan salah.',
      });
    }

    const resUpdate = await supabaseUsers.updateAdminCredentials({ password_hash: new_password.trim() });
    if (!resUpdate.success) {
      return res.status(500).json({
        success: false,
        message: resUpdate.error || 'Gagal memperbarui sandi admin di Supabase PostgreSQL.',
      });
    }

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Sandi admin berhasil diperbarui dan tersimpan di database Supabase.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui sandi admin.',
    });
  }
});

// 3D. PUT /api/auth/admin/credentials (Ubah Username dan/atau Sandi Admin)
router.put('/admin/credentials', async (req: Request, res: Response) => {
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

    const { old_password, new_username, new_password, confirm_password } = req.body;

    if (!old_password) {
      return res.status(400).json({
        success: false,
        message: 'Sandi saat ini (sandi lama) wajib dimasukkan untuk verifikasi keamanan.',
      });
    }

    const adminUser = await supabaseUsers.getAdmin();
    const expectedPassword = (adminUser?.password_hash || process.env.ADMIN_PASSWORD || 'NUBACIMERAK123').trim();

    if (old_password.trim() !== expectedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Sandi saat ini yang Anda masukkan salah.',
      });
    }

    const updates: { username?: string; password_hash?: string } = {};

    // Check if new username provided
    if (new_username && new_username.trim() && new_username.trim() !== adminUser?.username) {
      const cleanUsername = new_username.trim();
      if (cleanUsername.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username baru minimal harus 3 karakter.',
        });
      }
      updates.username = cleanUsername;
    }

    // Check if new password provided
    if (new_password && new_password.trim()) {
      if (new_password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'Sandi baru dan konfirmasi sandi tidak cocok.',
        });
      }
      if (new_password.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Sandi baru minimal harus 6 karakter.',
        });
      }
      updates.password_hash = new_password.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada perubahan username atau sandi baru yang dimasukkan.',
      });
    }

    const resUpdate = await supabaseUsers.updateAdminCredentials(updates);
    if (!resUpdate.success) {
      return res.status(400).json({
        success: false,
        message: resUpdate.error || 'Gagal memperbarui kredensial admin di Supabase.',
      });
    }

    // Update active token session with the new username so header updates immediately
    if (token && activeSessions.has(token) && updates.username) {
      const current = activeSessions.get(token)!;
      activeSessions.set(token, {
        ...current,
        username: updates.username,
      });
    }

    return res.json({
      success: true,
      source: 'supabase',
      message: 'Username dan sandi admin berhasil diperbarui dan tersimpan di Supabase!',
      username: resUpdate.username || adminUser?.username,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memperbarui kredensial admin.',
    });
  }
});

// 4. GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    const session = getSession(token);
    if (!session) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        message: 'Sesi belum aktif atau telah kedaluwarsa.',
      });
    }

    if (session.role === 'student') {
      let student = await supabaseStudents.getById(session.userId);
      if (!student && session.username) {
        student = await supabaseStudents.getByUsername(session.username);
      }

      if (!student || !student.is_active) {
        return res.status(200).json({
          success: false,
          authenticated: false,
          message: 'Akun siswa tidak ditemukan atau telah dinonaktifkan.',
        });
      }

      return res.json({
        success: true,
        authenticated: true,
        role: 'student',
        source: 'supabase',
        student,
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      role: 'admin',
      admin: {
        username: session.username,
        role: 'admin',
      },
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      authenticated: false,
      message: 'Gagal memverifikasi sesi.',
    });
  }
});

// 5. POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);
  if (token) {
    activeSessions.delete(token);
  }
  return res.json({
    success: true,
    message: 'Logout berhasil.',
  });
});

export default router;
