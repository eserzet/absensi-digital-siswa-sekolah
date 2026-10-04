// ====================================================================
// SUPABASE CLIENT & REPOSITORY SERVICES
// Absensi Digital SMA Informatika Nurul Bayan
// ====================================================================
//
// IMPORTANT: All credentials MUST come from environment variables.
// Never hardcode API keys or secrets in source code.
// ====================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
import {
  Student,
  User,
  AttendanceRecord,
  Announcement,
  Holiday,
  ScheduleItem,
  ScheduleImage,
  SchoolLocation,
  AttendanceSettings,
  BrandingSettings,
} from '../../types.js';

// ── Singleton Client ──────────────────────────────────────────────────
let supabaseAdminClient: SupabaseClient | null = null;

function getEnv(key: string): string {
  let val = (process.env[key] || '').trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

function resolveSupabaseUrl(): string {
  return (
    getEnv('SUPABASE_URL') ||
    getEnv('VITE_SUPABASE_URL')
  );
}

function resolveSupabaseKey(): string {
  // Prefer service_role key (full access, bypasses RLS), fallback to anon
  return (
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('SERVICE_ROLE_KEY') ||
    getEnv('SUPABASE_SERVICE_KEY') ||
    getEnv('SUPABASE_KEY') ||
    getEnv('SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY')
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toValidUUID(val?: string): string {
  if (val && UUID_REGEX.test(val.trim())) {
    return val.trim().toLowerCase();
  }
  return crypto.randomUUID();
}

/**
 * Generates a deterministic RFC4122 v4-compliant UUID based on studentId and date.
 * Guarantees that any attendance attempt for the same student on the same date produces
 * the exact same Primary Key ID, blocking database-level duplicate inserts.
 */
export function getDeterministicAttendanceId(studentId: string, date: string): string {
  const hash = crypto.createHash('sha256').update(`att_${studentId}_${date}`).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-8${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Safely extracts the relative storage file path from a Supabase Storage public URL or filename.
 */
export function extractStorageFilePath(bucketName: string, urlOrPath?: string | null): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const clean = urlOrPath.trim();
  if (clean.includes(`${bucketName}/`)) {
    const parts = clean.split(`${bucketName}/`);
    return parts[1] ? parts[1].split('?')[0] : null;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:')) {
    return clean.split('?')[0];
  }
  return null;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();

  if (!url || !key) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
    return null;
  }

  if (!supabaseAdminClient) {
    try {
      supabaseAdminClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      console.log('[Supabase] Client initialized successfully.');
    } catch (err) {
      console.error('[Supabase] Failed to initialize client:', err);
      return null;
    }
  }

  return supabaseAdminClient;
}

export function isSupabaseConfigured(): boolean {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseKey();
  return Boolean(url && key && url.startsWith('http') && key.length > 20);
}

export function getSupabaseStatus(): { configured: boolean; url: string | null; keyType: string } {
  const url = resolveSupabaseUrl();
  const hasServiceRole = Boolean(getEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const hasAnon = Boolean(getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY'));

  return {
    configured: isSupabaseConfigured(),
    url: url ? url.replace(/^(https?:\/\/[^.]+).*/, '$1.supabase.co') : null,
    keyType: hasServiceRole ? 'service_role' : hasAnon ? 'anon' : 'none',
  };
}

// ====================================================================
// STUDENT REPOSITORY
// ====================================================================

export const supabaseStudents = {
  async getAll(filters?: { search?: string; class_name?: string; status?: string }): Promise<Student[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      let query = supabase.from('students').select('*, users!user_id(username)').order('full_name', { ascending: true });

      if (filters?.class_name && filters.class_name !== 'all') {
        query = query.eq('class_name', filters.class_name);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('is_active', filters.status === 'active');
      }

      let { data, error } = await query;
      if (error) {
        // Fallback without foreign-key join
        let simpleQuery = supabase.from('students').select('*').order('full_name', { ascending: true });
        if (filters?.class_name && filters.class_name !== 'all') {
          simpleQuery = simpleQuery.eq('class_name', filters.class_name);
        }
        if (filters?.status && filters.status !== 'all') {
          simpleQuery = simpleQuery.eq('is_active', filters.status === 'active');
        }
        const fallbackRes = await simpleQuery;
        if (fallbackRes.error) {
          console.error('[Students] getAll error:', fallbackRes.error);
          return [];
        }
        data = fallbackRes.data;
      }

      const raw = (data || []) as any[];
      let result: Student[] = raw.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        username: s.users?.username || s.username || '',
        full_name: s.full_name,
        class_name: s.class_name,
        gender: s.gender,
        whatsapp: s.whatsapp,
        profile_photo_url: s.profile_photo_url,
        is_active: s.is_active ?? true,
        created_at: s.created_at,
      }));

      if (filters?.search?.trim()) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (s) =>
            s.full_name.toLowerCase().includes(q) ||
            s.username.toLowerCase().includes(q) ||
            s.class_name.toLowerCase().includes(q)
        );
      }

      // Always sort students alphabetically A-Z case-insensitively
      result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'id', { sensitivity: 'base' }));

      return result;
    } catch (err) {
      console.error('[Students] getAll exception:', err);
      return [];
    }
  },

  async getById(id: string): Promise<Student | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      let { data, error } = await supabase.from('students').select('*, users!user_id(username)').eq('id', id).maybeSingle();
      if (error || !data) {
        const simple = await supabase.from('students').select('*').eq('id', id).maybeSingle();
        if (simple.error || !simple.data) return null;
        data = simple.data;
      }
      const s = data as any;
      return {
        id: s.id, user_id: s.user_id, username: s.users?.username || s.username || '',
        full_name: s.full_name, class_name: s.class_name, gender: s.gender,
        whatsapp: s.whatsapp, profile_photo_url: s.profile_photo_url,
        is_active: s.is_active ?? true, created_at: s.created_at,
      };
    } catch {
      return null;
    }
  },

  async getByUsername(username: string): Promise<Student | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { data: user } = await supabase.from('users').select('id, username').eq('username', username).maybeSingle();
      if (!user) return null;

      let { data, error } = await supabase.from('students').select('*, users!user_id(username)').eq('user_id', user.id).maybeSingle();
      if (error || !data) {
        const simple = await supabase.from('students').select('*').eq('user_id', user.id).maybeSingle();
        if (simple.error || !simple.data) return null;
        data = simple.data;
      }
      const s = data as any;
      return {
        id: s.id, user_id: s.user_id, username: user.username,
        full_name: s.full_name, class_name: s.class_name, gender: s.gender,
        whatsapp: s.whatsapp, profile_photo_url: s.profile_photo_url,
        is_active: s.is_active ?? true, created_at: s.created_at,
      };
    } catch {
      return null;
    }
  },

  async create(student: Student): Promise<Student | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const payload = {
        id: toValidUUID(student.id),
        user_id: toValidUUID(student.user_id),
        full_name: student.full_name,
        class_name: student.class_name,
        gender: student.gender,
        whatsapp: student.whatsapp,
        profile_photo_url: student.profile_photo_url,
        is_active: student.is_active ?? true,
      };

      let { data, error } = await supabase.from('students').insert(payload).select('*, users!user_id(username)').single();
      if (error) {
        const simple = await supabase.from('students').insert(payload).select('*').single();
        if (simple.error) {
          console.error('[Students] create error:', simple.error);
          return null;
        }
        data = simple.data;
      }
      const s = data as any;
      return {
        id: s.id, user_id: s.user_id, username: student.username || s.users?.username || '',
        full_name: s.full_name, class_name: s.class_name, gender: s.gender,
        whatsapp: s.whatsapp, profile_photo_url: s.profile_photo_url,
        is_active: s.is_active ?? true, created_at: s.created_at,
      };
    } catch (err) {
      console.error('[Students] create exception:', err);
      return null;
    }
  },

  async update(id: string, updates: Partial<Student>): Promise<Student | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const payload: Record<string, unknown> = {};
      if (updates.full_name !== undefined) payload.full_name = updates.full_name;
      if (updates.class_name !== undefined) payload.class_name = updates.class_name;
      if (updates.gender !== undefined) payload.gender = updates.gender;
      if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp;
      if (updates.profile_photo_url !== undefined) payload.profile_photo_url = updates.profile_photo_url;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;
      payload.updated_at = new Date().toISOString();

      let { data, error } = await supabase.from('students').update(payload).eq('id', id).select('*, users!user_id(username)').single();
      if (error || !data) {
        const simple = await supabase.from('students').update(payload).eq('id', id).select('*').single();
        if (simple.error || !simple.data) return null;
        data = simple.data;
      }
      const s = data as any;
      return {
        id: s.id, user_id: s.user_id, username: s.users?.username || updates.username || '',
        full_name: s.full_name, class_name: s.class_name, gender: s.gender,
        whatsapp: s.whatsapp, profile_photo_url: s.profile_photo_url,
        is_active: s.is_active ?? true, created_at: s.created_at,
      };
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  async deleteFull(studentId: string): Promise<{ success: boolean; deletedPhotosCount: number }> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { success: false, deletedPhotosCount: 0 };

    try {
      const student = await this.getById(studentId);

      // 1. Collect all attendance photo files belonging to this student
      const { data: attendanceRecords } = await supabase
        .from('attendance_records').select('id, photo_url').eq('student_id', studentId);

      const filesToDelete = new Set<string>();
      if (attendanceRecords?.length) {
        for (const rec of attendanceRecords) {
          if (rec.photo_url) {
            const fileName = extractStorageFilePath('attendance-images', rec.photo_url);
            if (fileName) filesToDelete.add(fileName);
          }
        }
      }

      // Also search attendance-images bucket directly for any files belonging to this student
      try {
        const { data: storageList } = await supabase.storage.from('attendance-images').list('', { limit: 1000 });
        if (storageList?.length) {
          for (const item of storageList) {
            if (item.name && (item.name.includes(studentId) || item.name.startsWith(`attendance_${studentId}`))) {
              filesToDelete.add(item.name);
            }
          }
        }
      } catch (listErr) {
        console.warn('[Students] List attendance-images error:', listErr);
      }

      // Delete all attendance photo files from Supabase Storage
      if (filesToDelete.size > 0) {
        try {
          const filesArr = Array.from(filesToDelete);
          console.log(`[Students] Deleting ${filesArr.length} attendance photo(s) from Supabase Storage for student ${studentId}:`, filesArr);
          await supabase.storage.from('attendance-images').remove(filesArr);
        } catch (storageErr) {
          console.error('[Students] Error removing attendance photos from storage:', storageErr);
        }
      }

      // 2. Collect and remove profile photo from profile-images bucket
      const profileFilesToDelete = new Set<string>();
      if (student?.profile_photo_url) {
        const pFile = extractStorageFilePath('profile-images', student.profile_photo_url);
        if (pFile) profileFilesToDelete.add(pFile);
      }
      try {
        const { data: profileList } = await supabase.storage.from('profile-images').list('', { limit: 1000 });
        if (profileList?.length) {
          for (const item of profileList) {
            if (item.name && (item.name.includes(studentId) || item.name.startsWith(`profile_${studentId}`))) {
              profileFilesToDelete.add(item.name);
            }
          }
        }
      } catch {}

      if (profileFilesToDelete.size > 0) {
        try {
          await supabase.storage.from('profile-images').remove(Array.from(profileFilesToDelete));
        } catch {}
      }

      // 3. Delete attendance records from database
      await supabase.from('attendance_records').delete().eq('student_id', studentId);

      // 4. Delete student record from database
      await supabase.from('students').delete().eq('id', studentId);

      // 5. Delete associated user login account from users table
      if (student?.user_id) {
        await supabase.from('users').delete().eq('id', student.user_id);
      }
      if (student?.username) {
        await supabase.from('users').delete().eq('username', student.username.trim().toLowerCase());
      }

      return { success: true, deletedPhotosCount: filesToDelete.size };
    } catch (err) {
      console.error('[Students] deleteFull error:', err);
      return { success: false, deletedPhotosCount: 0 };
    }
  },
};

// ====================================================================
// USER REPOSITORY
// ====================================================================

export const supabaseUsers = {
  async getByUsername(username: string): Promise<User | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const clean = username.trim().toLowerCase();
      let { data, error } = await supabase.from('users').select('*').eq('username', clean).maybeSingle();
      if (error) {
        console.error('[Users] getByUsername error:', error);
      }
      if (!data) {
        const ilikeRes = await supabase.from('users').select('*').ilike('username', clean).maybeSingle();
        if (ilikeRes.error) {
          console.error('[Users] getByUsername ilike error:', ilikeRes.error);
        }
        data = ilikeRes.data;
      }
      return data as User | null;
    } catch (err) {
      console.error('[Users] getByUsername exception:', err);
      return null;
    }
  },

  async create(user: User): Promise<{ user: User | null; error?: string }> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { user: null, error: 'Database Supabase tidak terhubung.' };

    try {
      const payload = {
        id: toValidUUID(user.id),
        username: user.username,
        password_hash: user.password_hash,
        role: user.role || 'student',
      };
      const { data, error } = await supabase.from('users').insert(payload).select().single();
      if (error) {
        console.error('[Users] create error:', error);
        return { user: null, error: error.message || 'Gagal menyimpan user' };
      }
      return { user: data as User };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Exception saat insert user' };
    }
  },

  async getAdmin(): Promise<User | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const defaultUsername = (process.env.ADMIN_USERNAME || 'NUBA').trim();
      const defaultPassword = (process.env.ADMIN_PASSWORD || 'NUBACIMERAK123').trim();

      // Look up admin by role or username
      let { data: admin } = await supabase.from('users').select('*').eq('role', 'admin').maybeSingle();
      if (!admin) {
        const byName = await supabase.from('users').select('*').ilike('username', defaultUsername).maybeSingle();
        admin = byName.data;
      }

      if (!admin) {
        // Seed default admin in Supabase users table
        const defaultAdmin = {
          id: '00000000-0000-0000-0000-000000000001',
          username: defaultUsername,
          password_hash: defaultPassword,
          role: 'admin',
        };
        const { data: created } = await supabase.from('users').upsert(defaultAdmin).select().single();
        if (created) return created as User;
      }

      return admin as User | null;
    } catch (err) {
      console.error('[Users] getAdmin exception:', err);
      return null;
    }
  },

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  async updateAdminPassword(newPassword: string): Promise<boolean> {
    const res = await this.updateAdminCredentials({ password_hash: newPassword });
    return res.success;
  },

  async updateAdminCredentials(updates: { username?: string; password_hash?: string }): Promise<{ success: boolean; error?: string; username?: string }> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { success: false, error: 'Database Supabase tidak terhubung.' };

    try {
      const admin = await this.getAdmin();
      if (!admin) return { success: false, error: 'Akun admin tidak ditemukan di database.' };

      const payload: Record<string, any> = {};

      if (updates.username && updates.username.trim()) {
        const cleanUsername = updates.username.trim();
        // Check if username taken by another user
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .ilike('username', cleanUsername)
          .neq('id', admin.id)
          .maybeSingle();

        if (existing) {
          return { success: false, error: 'Username ini sudah digunakan oleh akun lain. Silakan pilih username lain.' };
        }
        payload.username = cleanUsername;
      }

      if (updates.password_hash && updates.password_hash.trim()) {
        payload.password_hash = updates.password_hash.trim();
      }

      if (Object.keys(payload).length === 0) {
        return { success: true, username: admin.username };
      }

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', admin.id);

      if (error) {
        console.error('[Users] updateAdminCredentials error:', error);
        return { success: false, error: error.message || 'Gagal menyimpan kredensial admin.' };
      }

      const finalUsername = payload.username || admin.username;
      return { success: true, username: finalUsername };
    } catch (err: any) {
      console.error('[Users] updateAdminCredentials exception:', err);
      return { success: false, error: err?.message || 'Terjadi kesalahan sistem saat memperbarui kredensial admin.' };
    }
  },
};

// ====================================================================
// ATTENDANCE REPOSITORY
// ====================================================================

export const supabaseAttendance = {
  async getAll(filters?: {
    date?: string; start_date?: string; end_date?: string;
    class_name?: string; status?: string;
  }): Promise<AttendanceRecord[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      let query = supabase.from('attendance_records').select('*')
        .order('date', { ascending: false }).order('time', { ascending: false });

      if (filters?.date) query = query.eq('date', filters.date);
      if (filters?.start_date) query = query.gte('date', filters.start_date);
      if (filters?.end_date) query = query.lte('date', filters.end_date);
      if (filters?.class_name && filters.class_name !== 'all') query = query.eq('class_name', filters.class_name);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) { console.error('[Attendance] getAll error:', error); return null; }
      return (data || []) as AttendanceRecord[];
    } catch (err) {
      console.error('[Attendance] getAll exception:', err);
      return null;
    }
  },

  async getToday(studentId: string, todayDate: string): Promise<AttendanceRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('attendance_records').select('*')
        .eq('student_id', studentId).eq('date', todayDate).maybeSingle();
      return (error || !data) ? null : data as AttendanceRecord;
    } catch { return null; }
  },

  async getHistory(studentId: string, status?: string): Promise<AttendanceRecord[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      let query = supabase.from('attendance_records').select('*')
        .eq('student_id', studentId).order('date', { ascending: false }).order('time', { ascending: false });
      if (status && status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      return error ? null : (data || []) as AttendanceRecord[];
    } catch { return null; }
  },

  async create(record: AttendanceRecord): Promise<AttendanceRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const studentId = toValidUUID(record.student_id);
      const recordDate = record.date;
      const targetId = record.id && UUID_REGEX.test(record.id)
        ? record.id.toLowerCase()
        : getDeterministicAttendanceId(studentId, recordDate);

      // Check if an attendance record for this student on this date already exists
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', recordDate)
        .maybeSingle();

      if (existing) {
        // Enforce strict 1 record per student per day: if an attendance record exists (including automatic ALPHA),
        // it cannot be overwritten by student check-in. Only admin can modify via update endpoint.
        return existing as AttendanceRecord;
      }

      const payload = {
        id: targetId,
        student_id: studentId,
        student_name: record.student_name || record.student?.full_name || '',
        class_name: record.class_name || record.student?.class_name || '',
        date: recordDate,
        time: record.time,
        timestamp: record.timestamp || new Date().toISOString(),
        status: record.status,
        photo_url: record.photo_url || null,
        latitude: record.latitude ?? null,
        longitude: record.longitude ?? null,
        distance_meters: record.distance_meters ?? null,
        is_valid_location: record.is_valid_location ?? true,
        notes: record.notes || null,
        updated_by_admin: record.updated_by_admin ?? false,
        updated_reason: record.updated_reason || null,
      };

      const { data, error } = await supabase.from('attendance_records').insert(payload).select().single();
      if (error) {
        // If Postgres unique violation (23505 duplicate key), retrieve and return the existing record
        if (error.code === '23505') {
          const { data: duplicate } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('student_id', studentId)
            .eq('date', recordDate)
            .maybeSingle();
          if (duplicate) return duplicate as AttendanceRecord;
        }
        console.error('[Attendance] create error:', error);
        return null;
      }
      return data as AttendanceRecord;
    } catch (err) {
      console.error('[Attendance] create exception:', err);
      return null;
    }
  },

  async deduplicateRecords(targetDate?: string): Promise<number> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return 0;

    try {
      let query = supabase.from('attendance_records').select('*').order('created_at', { ascending: true });
      if (targetDate) {
        query = query.eq('date', targetDate);
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) return 0;

      const map = new Map<string, any>();
      const duplicateIdsToDelete: string[] = [];

      for (const record of data) {
        const key = `${record.student_id}_${record.date}`;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, record);
        } else {
          // Keep non-ALPHA over ALPHA
          if (existing.status === 'ALPHA' && record.status !== 'ALPHA') {
            duplicateIdsToDelete.push(existing.id);
            map.set(key, record);
          } else if (record.updated_by_admin && !existing.updated_by_admin) {
            duplicateIdsToDelete.push(existing.id);
            map.set(key, record);
          } else {
            duplicateIdsToDelete.push(record.id);
          }
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        console.log(`[Attendance] Cleaned ${duplicateIdsToDelete.length} duplicate records from Supabase`);
        await supabase.from('attendance_records').delete().in('id', duplicateIdsToDelete);
      }

      return duplicateIdsToDelete.length;
    } catch (err) {
      console.error('[Attendance] deduplicateRecords exception:', err);
      return 0;
    }
  },

  async update(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('attendance_records').update(updates).eq('id', id).select().single();
      return error ? null : data as AttendanceRecord;
    } catch { return null; }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      // Find photo_url before deleting to clean up Supabase Storage
      const { data: rec } = await supabase.from('attendance_records').select('photo_url').eq('id', id).maybeSingle();
      if (rec?.photo_url) {
        const filePath = extractStorageFilePath('attendance-images', rec.photo_url);
        if (filePath) {
          try { await supabase.storage.from('attendance-images').remove([filePath]); } catch {}
        }
      }

      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (error) { console.error('[Attendance] delete error:', error); return false; }
      return true;
    } catch (err) {
      console.error('[Attendance] delete exception:', err);
      return false;
    }
  },

  async deleteMany(ids: string[]): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase || ids.length === 0) return false;
    try {
      // Find photo_urls before deleting to clean up Supabase Storage
      const { data: recs } = await supabase.from('attendance_records').select('photo_url').in('id', ids);
      if (recs?.length) {
        const files: string[] = [];
        for (const r of recs) {
          if (r.photo_url) {
            const f = extractStorageFilePath('attendance-images', r.photo_url);
            if (f) files.push(f);
          }
        }
        if (files.length > 0) {
          try { await supabase.storage.from('attendance-images').remove(files); } catch {}
        }
      }

      const { error } = await supabase.from('attendance_records').delete().in('id', ids);
      if (error) { console.error('[Attendance] deleteMany error:', error); return false; }
      return true;
    } catch (err) {
      console.error('[Attendance] deleteMany exception:', err);
      return false;
    }
  },

  async deleteAll(filters?: { date?: string; class_name?: string }): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      // Find photo_urls before deleting to clean up Supabase Storage
      let selectQuery = supabase.from('attendance_records').select('photo_url');
      if (filters?.date) selectQuery = selectQuery.eq('date', filters.date);
      if (filters?.class_name && filters.class_name !== 'all') selectQuery = selectQuery.eq('class_name', filters.class_name);
      const { data: recs } = await selectQuery;

      if (recs?.length) {
        const files: string[] = [];
        for (const r of recs) {
          if (r.photo_url) {
            const f = extractStorageFilePath('attendance-images', r.photo_url);
            if (f) files.push(f);
          }
        }
        if (files.length > 0) {
          try { await supabase.storage.from('attendance-images').remove(files); } catch {}
        }
      }

      let query = supabase.from('attendance_records').delete();
      if (filters?.date) {
        query = query.eq('date', filters.date);
      }
      if (filters?.class_name && filters.class_name !== 'all') {
        query = query.eq('class_name', filters.class_name);
      }
      // If no specific filter, delete where id is not empty
      if (!filters?.date && (!filters?.class_name || filters.class_name === 'all')) {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const { error } = await query;
      if (error) { console.error('[Attendance] deleteAll error:', error); return false; }
      return true;
    } catch (err) {
      console.error('[Attendance] deleteAll exception:', err);
      return false;
    }
  },

  async deleteAutomaticAlpha(date: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('date', date)
        .eq('status', 'ALPHA')
        .ilike('notes', '%Otomatis ALPHA%');
      if (error) { console.error('[Attendance] deleteAutomaticAlpha error:', error); return false; }
      return true;
    } catch (err) {
      console.error('[Attendance] deleteAutomaticAlpha exception:', err);
      return false;
    }
  },
};

// ====================================================================
// ANNOUNCEMENTS REPOSITORY
// ====================================================================

export const supabaseAnnouncements = {
  async getAll(role?: string): Promise<Announcement[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (role !== 'admin') query = query.eq('status', 'published');
      const { data, error } = await query;
      if (error) {
        console.error('[Announcements] getAll error:', error);
        return null;
      }
      return ((data || []) as any[]).map((a) => ({
        ...a,
        is_active: a.status === 'published',
      })) as Announcement[];
    } catch { return null; }
  },

  async create(announcement: Announcement): Promise<Announcement | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const payload = {
        id: toValidUUID(announcement.id),
        title: announcement.title.trim(),
        content: announcement.content.trim(),
        date: announcement.date,
        status: announcement.status || 'published',
        priority: announcement.priority || 'normal',
        created_at: announcement.created_at || new Date().toISOString(),
      };
      const { data, error } = await supabase.from('announcements').insert(payload).select().single();
      if (error) {
        console.error('[Announcements] create error:', error.message, error.code);
        return null;
      }
      return {
        ...data,
        is_active: data.status === 'published',
      } as Announcement;
    } catch (err) {
      console.error('[Announcements] create exception:', err);
      return null;
    }
  },

  async update(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title.trim();
      if (updates.content !== undefined) payload.content = updates.content.trim();
      if (updates.date !== undefined) payload.date = updates.date;
      if (updates.status !== undefined) {
        payload.status = updates.status;
      } else if (updates.is_active !== undefined) {
        payload.status = updates.is_active ? 'published' : 'draft';
      }
      if (updates.priority !== undefined) payload.priority = updates.priority;

      if (Object.keys(payload).length === 0) {
        const { data: existing } = await supabase.from('announcements').select('*').eq('id', id).maybeSingle();
        if (!existing) return null;
        return {
          ...existing,
          is_active: existing.status === 'published',
        } as Announcement;
      }

      const { data, error } = await supabase.from('announcements').update(payload).eq('id', id).select().single();
      if (error) {
        console.error('[Announcements] update error:', error);
        return null;
      }
      return {
        ...data,
        is_active: data.status === 'published',
      } as Announcement;
    } catch { return null; }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) console.error('[Announcements] delete error:', error);
      return !error;
    } catch { return false; }
  },
};

// ====================================================================
// SCHEDULES REPOSITORY
// ====================================================================

export const supabaseSchedules = {
  async getAll(filters?: { class_name?: string; day?: string }): Promise<ScheduleItem[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      let query = supabase.from('schedules').select('*').order('start_time', { ascending: true });
      if (filters?.class_name && filters.class_name !== 'all') query = query.eq('class_name', filters.class_name);
      if (filters?.day && filters.day !== 'all') query = query.eq('day', filters.day);
      const { data, error } = await query;
      if (error) {
        console.error('[Schedules] getAll error:', error);
        return null;
      }
      return (data || []) as ScheduleItem[];
    } catch { return null; }
  },

  async create(item: ScheduleItem): Promise<ScheduleItem | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const payload = {
        id: toValidUUID(item.id),
        class_name: item.class_name.trim(),
        day: item.day,
        subject: item.subject.trim(),
        teacher: item.teacher.trim(),
        start_time: item.start_time.trim(),
        end_time: item.end_time.trim(),
        room: item.room ? item.room.trim() : null,
        schedule_image_url: item.schedule_image_url || null,
        created_at: item.created_at || new Date().toISOString(),
      };
      const { data, error } = await supabase.from('schedules').insert(payload).select().single();
      if (error) {
        console.error('[Schedules] create error:', error);
        return null;
      }
      return data as ScheduleItem;
    } catch (err) {
      console.error('[Schedules] create exception:', err);
      return null;
    }
  },

  async update(id: string, updates: Partial<ScheduleItem>): Promise<ScheduleItem | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const payload: any = {};
      if (updates.class_name !== undefined) payload.class_name = updates.class_name.trim();
      if (updates.day !== undefined) payload.day = updates.day;
      if (updates.subject !== undefined) payload.subject = updates.subject.trim();
      if (updates.teacher !== undefined) payload.teacher = updates.teacher.trim();
      if (updates.start_time !== undefined) payload.start_time = updates.start_time.trim();
      if (updates.end_time !== undefined) payload.end_time = updates.end_time.trim();
      if (updates.room !== undefined) payload.room = updates.room ? updates.room.trim() : null;
      if (updates.schedule_image_url !== undefined) payload.schedule_image_url = updates.schedule_image_url;

      const { data, error } = await supabase.from('schedules').update(payload).eq('id', id).select().single();
      if (error) {
        console.error('[Schedules] update error:', error);
        return null;
      }
      return data as ScheduleItem;
    } catch { return null; }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) console.error('[Schedules] delete error:', error);
      return !error;
    } catch { return false; }
  },

  async getImages(): Promise<ScheduleImage[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      // 1. Fetch all active files directly from Supabase Storage 'schedule-images'
      const storageList = await supabase.storage.from('schedule-images').list('', {
        sortBy: { column: 'created_at', order: 'desc' }
      });
      const storageFiles = (storageList.data || []).filter(f => f.name && !f.name.startsWith('.'));

      // 2. Fetch extra metadata from DB if present
      const { data: dbRows } = await supabase.from('schedule_images').select('*');
      const dbMap = new Map<string, any>();
      if (dbRows && Array.isArray(dbRows)) {
        for (const row of dbRows) {
          if (row.image_url) dbMap.set(row.image_url, row);
        }
      }

      const results: ScheduleImage[] = [];

      for (const file of storageFiles) {
        const pub = supabase.storage.from('schedule-images').getPublicUrl(file.name);
        const url = pub.data?.publicUrl || '';
        const cleanName = file.name.replace(/^schedule_\d+_/, '');
        const ext = cleanName.split('.').pop()?.toLowerCase() || '';

        let file_type: 'pdf' | 'excel' | 'word' | 'image' | 'file' = 'file';
        if (ext === 'pdf') file_type = 'pdf';
        else if (['xlsx', 'xls', 'csv'].includes(ext)) file_type = 'excel';
        else if (['docx', 'doc'].includes(ext)) file_type = 'word';
        else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) file_type = 'image';

        const sizeInBytes = file.metadata?.size || 0;
        let formattedSize: string | undefined;
        if (sizeInBytes > 0) {
          if (sizeInBytes < 1024) formattedSize = `${sizeInBytes} B`;
          else if (sizeInBytes < 1024 * 1024) formattedSize = `${(sizeInBytes / 1024).toFixed(1)} KB`;
          else formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
        }

        const matchedDb = dbMap.get(url);
        const title = matchedDb?.title || cleanName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

        results.push({
          id: file.id || file.name,
          class_grade: 'all',
          class_name: 'Semua Kelas (10, 11, 12)',
          image_url: url,
          title: title,
          updated_at: file.updated_at || file.created_at || new Date().toISOString(),
          file_type,
          file_name: cleanName,
          file_size: formattedSize,
        });
      }

      // If storage has no files but DB rows exist, fallback to DB rows
      if (results.length === 0 && dbRows && dbRows.length > 0) {
        for (const item of dbRows) {
          results.push({
            id: item.id,
            class_grade: item.class_grade || 'all',
            class_name: item.class_name || 'Semua Kelas',
            image_url: item.image_url,
            title: item.title,
            updated_at: item.updated_at,
            file_type: item.image_url?.includes('.pdf') ? 'pdf' : 'image',
            file_name: item.title,
          });
        }
      }

      return results;
    } catch (err) {
      console.error('[Schedules] getImages error:', err);
      return null;
    }
  },

  async upsertImage(image: ScheduleImage): Promise<ScheduleImage | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      // Clean up legacy split rows so database has exactly ONE unified schedule row
      await supabase.from('schedule_images').delete().in('id', ['img-11', 'img-12']);

      // Upsert single unified record (class_grade '10' satisfies Postgres schema check constraint)
      await supabase.from('schedule_images').upsert({
        id: 'img-10',
        class_grade: '10',
        class_name: 'Semua Kelas (10, 11, 12)',
        image_url: image.image_url,
        title: image.title || 'Jadwal Mata Pelajaran Lengkap',
        updated_at: image.updated_at || new Date().toISOString(),
      }, { onConflict: 'class_grade' });

      return {
        ...image,
        class_grade: 'all',
        class_name: 'Semua Kelas (10, 11, 12)',
      };
    } catch (err) {
      console.error('[Schedules] upsertImage error:', err);
      return null;
    }
  },

  async deleteImage(idOrFileName?: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;

    try {
      const list = await supabase.storage.from('schedule-images').list();
      const files = (list.data || []).filter(f => f.name && !f.name.startsWith('.'));

      if (!idOrFileName || idOrFileName === 'all' || idOrFileName === 'img-all') {
        // Delete all files and rows
        await supabase.from('schedule_images').delete().neq('id', '__keep_nothing__');
        if (files.length > 0) {
          await supabase.storage.from('schedule-images').remove(files.map(f => f.name));
        }
        return true;
      }

      // Delete specific file matching id, name, or partial url
      const targetFile = files.find(f => 
        f.id === idOrFileName || 
        f.name === idOrFileName || 
        idOrFileName.includes(f.name) ||
        f.name.includes(idOrFileName)
      );

      if (targetFile) {
        await supabase.storage.from('schedule-images').remove([targetFile.name]);
      } else {
        await supabase.storage.from('schedule-images').remove([idOrFileName]);
      }

      // Clean up split rows
      await supabase.from('schedule_images').delete().in('id', ['img-11', 'img-12']);

      // If remaining files exist in storage, update single DB row to point to the newest remaining file
      const remainingList = await supabase.storage.from('schedule-images').list();
      const remaining = (remainingList.data || []).filter(f => f.name && !f.name.startsWith('.'));
      if (remaining.length > 0) {
        const newest = remaining.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
        const pub = supabase.storage.from('schedule-images').getPublicUrl(newest.name);
        const cleanTitle = newest.name.replace(/^schedule_\d+_/, '').replace(/_/g, ' ');
        await supabase.from('schedule_images').upsert({
          id: 'img-10',
          class_grade: '10',
          class_name: 'Semua Kelas (10, 11, 12)',
          image_url: pub.data?.publicUrl,
          title: cleanTitle,
          updated_at: newest.updated_at || new Date().toISOString(),
        }, { onConflict: 'class_grade' });
      } else {
        await supabase.from('schedule_images').delete().neq('id', '__keep_nothing__');
      }

      return true;
    } catch (err) {
      console.error('[Schedules] deleteImage error:', err);
      return false;
    }
  },
};

// ====================================================================
// HOLIDAYS REPOSITORY
// ====================================================================

export const supabaseHolidays = {
  async getAll(): Promise<Holiday[] | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('holidays').select('*').order('date', { ascending: true });
      if (error) {
        console.error('[Holidays] getAll error:', error);
        return null;
      }
      return ((data || []) as any[]).map((h) => {
        const d = new Date(h.date);
        const isFri = !isNaN(d.getTime()) && d.getDay() === 5;
        return {
          id: h.id,
          date: h.date,
          name: h.name,
          description: h.description || null,
          is_recurring: Boolean(h.is_recurring),
          is_friday: isFri,
          created_at: h.created_at,
        };
      }) as Holiday[];
    } catch { return null; }
  },

  async create(holiday: Holiday): Promise<Holiday | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const payload = {
        id: toValidUUID(holiday.id),
        date: holiday.date,
        name: holiday.name.trim(),
        description: holiday.description ? holiday.description.trim() : null,
        is_recurring: Boolean(holiday.is_recurring),
        created_at: holiday.created_at || new Date().toISOString(),
      };
      const { data, error } = await supabase.from('holidays').insert(payload).select().single();
      if (error) {
        console.error('[Holidays] create error:', error.message, error.code);
        return null;
      }
      const d = new Date(data.date);
      return {
        ...data,
        is_friday: !isNaN(d.getTime()) && d.getDay() === 5,
      } as Holiday;
    } catch (err) {
      console.error('[Holidays] create exception:', err);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) console.error('[Holidays] delete error:', error);
      return !error;
    } catch { return false; }
  },
};

// ====================================================================
// LOCATION REPOSITORY
// ====================================================================
// LOCATION REPOSITORY (Stored in Supabase Cloud PostgreSQL)
// ====================================================================

export const supabaseLocation = {
  async get(): Promise<SchoolLocation | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('school_location')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('[Location] get error from Supabase:', error);
        return null;
      }
      return (data as SchoolLocation) || null;
    } catch (err) {
      console.error('[Location] get exception:', err);
      return null;
    }
  },

  async update(loc: SchoolLocation): Promise<SchoolLocation | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Location] Supabase client not available!');
      return null;
    }
    try {
      const existing = await this.get();
      const targetId = (existing?.id && toValidUUID(existing.id)) || (loc.id && toValidUUID(loc.id)) || '00000000-0000-0000-0000-000000000001';

      const payload = {
        id: targetId,
        school_name: loc.school_name?.trim() || 'SMA Informatika Nurul Bayan',
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        radius_meters: Number(loc.radius_meters) || 100,
        address: loc.address?.trim() || '',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('school_location')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Location] update error from Supabase:', error);
        return null;
      }
      console.log('[Location] Berhasil disimpan ke Supabase (id:', data.id, ')');
      return data as SchoolLocation;
    } catch (err) {
      console.error('[Location] update exception:', err);
      return null;
    }
  },
};

// ====================================================================
// SETTINGS REPOSITORY (Stored in Supabase Cloud PostgreSQL)
// ====================================================================

export const supabaseSettings = {
  async get(): Promise<AttendanceSettings | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('[Settings] get error from Supabase:', error);
        return null;
      }
      if (!data) return null;

      const loc = await supabaseLocation.get();
      const d = data as any;
      const startTime = d.start_time || d.check_out_time || '06:00';
      const onTimeLimit = d.on_time_limit || d.check_in_time || '07:15';
      const endTime = d.end_time || d.alpha_cutoff_time || '11:30';
      const gpsRadius = loc?.radius_meters || d.gps_radius_meters || 100;

      return {
        id: d.id,
        start_time: startTime,
        on_time_limit: onTimeLimit,
        end_time: endTime,
        gps_radius_meters: gpsRadius,
        check_in_time: onTimeLimit,
        check_out_time: startTime,
        alpha_cutoff_time: endTime,
        late_tolerance_minutes: d.late_tolerance_minutes || 0,
        school_qr_code: d.school_qr_code || 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN',
        admin_whatsapp: d.admin_whatsapp || process.env.ADMIN_WHATSAPP || '6285659611760',
        updated_at: d.updated_at,
      };
    } catch (err) {
      console.error('[Settings] get exception:', err);
      return null;
    }
  },

  async update(settings: AttendanceSettings): Promise<AttendanceSettings | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[Settings] Supabase client not available!');
      return null;
    }
    try {
      const existing = await this.get();
      const targetId = (existing?.id && toValidUUID(existing.id)) || (settings.id && toValidUUID(settings.id)) || '87aba268-c5e1-45f4-bfa2-7760265d1ec7';

      // 1. Update school_location radius if gps_radius_meters is provided
      if (typeof settings.gps_radius_meters === 'number') {
        const existingLoc = await supabaseLocation.get();
        if (existingLoc) {
          await supabaseLocation.update({
            ...existingLoc,
            radius_meters: settings.gps_radius_meters,
          });
        }
      }

      const startTime = settings.start_time || '06:00';
      const onTimeLimit = settings.on_time_limit || settings.check_in_time || '07:15';
      const endTime = settings.end_time || settings.alpha_cutoff_time || '11:30';

      const payload = {
        id: targetId,
        check_in_time: onTimeLimit,
        check_out_time: startTime, // Store start_time (<= 10 chars, e.g. "06:00")
        alpha_cutoff_time: endTime,
        late_tolerance_minutes: Number(settings.late_tolerance_minutes) || 0,
        school_qr_code: settings.school_qr_code?.trim() || 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('attendance_settings')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Settings] update error from Supabase:', error);
        return null;
      }
      console.log('[Settings] Berhasil disimpan ke Supabase (id:', data.id, ')');
      return {
        ...settings,
        id: data.id,
        start_time: startTime,
        on_time_limit: onTimeLimit,
        end_time: endTime,
        check_in_time: onTimeLimit,
        check_out_time: startTime,
        alpha_cutoff_time: endTime,
        gps_radius_meters: settings.gps_radius_meters || 100,
        updated_at: data.updated_at,
      };
    } catch (err) {
      console.error('[Settings] update exception:', err);
      return null;
    }
  },
};

// ====================================================================
// STORAGE SERVICE (Supabase Storage Buckets)
// ====================================================================

export const supabaseStorage = {
  async uploadBase64(
    bucketName: 'schedule-images' | 'profile-images' | 'attendance-images' | 'branding-assets' | string,
    fileName: string,
    base64OrUrl: string,
    defaultMime = 'image/jpeg'
  ): Promise<string | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase || !base64OrUrl || typeof base64OrUrl !== 'string') return null;

    // Already a hosted URL — return as-is
    if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://')) return base64OrUrl;

    try {
      let cleanBase64 = base64OrUrl;
      let detectedMime = defaultMime;

      const match = base64OrUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-.+]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        cleanBase64 = match[2];
      }

      const fileBuffer = Buffer.from(cleanBase64, 'base64');
      const { error } = await supabase.storage.from(bucketName).upload(fileName, fileBuffer, {
        contentType: detectedMime, upsert: true,
      });

      if (error) {
        console.error(`[Storage] Upload error [${bucketName}]:`, error.message);
        return null;
      }

      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return publicData?.publicUrl || null;
    } catch (err) {
      console.error(`[Storage] Upload exception [${bucketName}]:`, err);
      return null;
    }
  },

  async deleteFile(bucketName: string, fileNameOrUrl: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;
    try {
      let filePath = fileNameOrUrl;
      if (fileNameOrUrl.includes(bucketName)) {
        const parts = fileNameOrUrl.split(`${bucketName}/`);
        if (parts.length > 1) filePath = parts[1].split('?')[0];
      }
      const { error } = await supabase.storage.from(bucketName).remove([filePath]);
      return !error;
    } catch { return false; }
  },

  async cleanupExpiredAttendancePhotos(olderThanHours = 24): Promise<number> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return 0;

    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 3600_000).toISOString();
      const cutoffDate = cutoffTime.split('T')[0];

      const { data: records, error } = await supabase
        .from('attendance_records').select('id, photo_url, timestamp, date')
        .not('photo_url', 'is', null)
        .or(`timestamp.lte.${cutoffTime},date.lt.${cutoffDate}`);

      if (error || !records?.length) return 0;

      const filesToDelete: string[] = [];
      const recordIds: string[] = [];

      for (const rec of records) {
        if (rec.photo_url?.includes('attendance-images/')) {
          const parts = rec.photo_url.split('attendance-images/');
          if (parts[1]) filesToDelete.push(parts[1].split('?')[0]);
        }
        recordIds.push(rec.id);
      }

      if (filesToDelete.length > 0) {
        await supabase.storage.from('attendance-images').remove(filesToDelete);
      }
      if (recordIds.length > 0) {
        await supabase.from('attendance_records').update({ photo_url: null }).in('id', recordIds);
      }

      return recordIds.length;
    } catch (err) {
      console.warn('[Storage] Cleanup expired photos error:', err);
      return 0;
    }
  },
};

// ====================================================================
// BRANDING REPOSITORY (Stored in Supabase Cloud Storage branding-assets)
// ====================================================================

export const DEFAULT_BRANDING: BrandingSettings = {
  school_name: 'SMA Informatika Nurul Bayan',
  academic_year: 'Tahun Ajaran 2024/2025',
  logo_url: '/school-logo.png',
  background_url: '',
  theme_color: 'emerald',
};

export const supabaseBranding = {
  _cached: null as BrandingSettings | null,

  async get(): Promise<BrandingSettings> {
    if (this._cached) return this._cached;
    const supabase = getSupabaseAdmin();
    if (!supabase) return DEFAULT_BRANDING;

    try {
      const { data, error } = await supabase.storage
        .from('branding-assets')
        .download('branding/config.json');

      if (error || !data) {
        return DEFAULT_BRANDING;
      }

      const text = await data.text();
      const parsed = JSON.parse(text);
      const rawLogo = parsed.logo_url;
      const logoUrl = rawLogo && rawLogo !== '/pwa-512x512.png' ? rawLogo : '/school-logo.png';
      this._cached = {
        school_name: parsed.school_name || DEFAULT_BRANDING.school_name,
        academic_year: parsed.academic_year || DEFAULT_BRANDING.academic_year,
        logo_url: logoUrl,
        background_url: parsed.background_url || '',
        theme_color: parsed.theme_color || DEFAULT_BRANDING.theme_color,
        updated_at: parsed.updated_at,
      };
      return this._cached;
    } catch {
      return DEFAULT_BRANDING;
    }
  },

  async update(updates: Partial<BrandingSettings>): Promise<BrandingSettings> {
    const current = await this.get();
    const supabase = getSupabaseAdmin();

    // Auto-clean old storage files if replaced or cleared
    if (supabase && updates.logo_url !== undefined && updates.logo_url !== current.logo_url && current.logo_url?.includes('branding-assets/')) {
      const p = extractStorageFilePath('branding-assets', current.logo_url);
      if (p) {
        try { await supabase.storage.from('branding-assets').remove([p]); } catch {}
      }
    }
    if (supabase && updates.background_url !== undefined && updates.background_url !== current.background_url && current.background_url?.includes('branding-assets/')) {
      const p = extractStorageFilePath('branding-assets', current.background_url);
      if (p) {
        try { await supabase.storage.from('branding-assets').remove([p]); } catch {}
      }
    }

    const updated: BrandingSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase.storage
          .from('branding-assets')
          .upload('branding/config.json', Buffer.from(JSON.stringify(updated)), {
            contentType: 'application/json',
            upsert: true,
          });
      } catch (err) {
        console.error('[Branding] upload config exception:', err);
      }
    }

    this._cached = updated;
    return updated;
  },

  async uploadAsset(type: 'logo' | 'background', base64Data: string, mimeType = 'image/png'): Promise<string | null> {
    const supabase = getSupabaseAdmin();
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('svg') ? 'svg' : 'png';
    const fileName = `branding/${type}_${Date.now()}.${ext}`;
    const url = await supabaseStorage.uploadBase64('branding-assets', fileName, base64Data, mimeType);
    if (url) {
      if (type === 'logo') {
        await this.update({ logo_url: url });
      } else {
        await this.update({ background_url: url });
      }

      // Storage cleanup: delete all previous files of this type in branding folder so they don't pile up!
      if (supabase) {
        try {
          const { data: fileList } = await supabase.storage.from('branding-assets').list('branding');
          if (fileList && fileList.length > 0) {
            const filesToRemove: string[] = [];
            for (const file of fileList) {
              if (file.name.startsWith(`${type}_`) && `branding/${file.name}` !== fileName) {
                filesToRemove.push(`branding/${file.name}`);
              }
            }
            if (filesToRemove.length > 0) {
              console.log(`[Branding] Cleaned up ${filesToRemove.length} older ${type} file(s) from Supabase Storage:`, filesToRemove);
              await supabase.storage.from('branding-assets').remove(filesToRemove);
            }
          }
        } catch (cleanupErr) {
          console.warn(`[Branding] Cleanup old ${type} files error:`, cleanupErr);
        }
      }
    }
    return url;
  },

  async reset(): Promise<BrandingSettings> {
    const supabase = getSupabaseAdmin();
    // Clean up uploaded assets from storage
    if (supabase) {
      try {
        const { data: fileList } = await supabase.storage.from('branding-assets').list('branding');
        if (fileList?.length) {
          const filesToRemove = fileList
            .filter(f => f.name.startsWith('logo_') || f.name.startsWith('background_'))
            .map(f => `branding/${f.name}`);
          if (filesToRemove.length > 0) {
            await supabase.storage.from('branding-assets').remove(filesToRemove);
          }
        }
      } catch {}
    }

    const resetConfig: BrandingSettings = {
      ...DEFAULT_BRANDING,
      updated_at: new Date().toISOString(),
    };
    if (supabase) {
      try {
        await supabase.storage
          .from('branding-assets')
          .upload('branding/config.json', Buffer.from(JSON.stringify(resetConfig)), {
            contentType: 'application/json',
            upsert: true,
          });
      } catch {}
    }
    this._cached = resetConfig;
    return resetConfig;
  }
};
