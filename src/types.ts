// ====================================================================
// SHARED TYPES: Absensi Digital SMA Informatika Nurul Bayan
// ====================================================================

export type UserRole = 'student' | 'admin';

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPHA';

export type Gender = 'Laki-laki' | 'Perempuan';

export type AnnouncementStatus = 'published' | 'draft';
export type AnnouncementPriority = 'normal' | 'important';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password_hash?: string;
  created_at?: string;
}

export interface Student {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  class_name: string;
  gender: Gender;
  whatsapp: string;
  profile_photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  class_name?: string;
  student?: Student;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  timestamp: string;
  status: AttendanceStatus;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  distance_meters?: number;
  is_valid_location: boolean;
  notes?: string;
  updated_by_admin?: boolean;
  updated_reason?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  status: AnnouncementStatus;
  priority: AnnouncementPriority | 'normal' | 'penting';
  created_at: string;
  is_read?: boolean;
  is_active?: boolean;
}

export interface QRCodeConfig {
  school_name: string;
  qr_payload: string;
  generated_at: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  is_recurring?: boolean;
  is_friday?: boolean;
  created_at?: string;
}

export interface ScheduleItem {
  id: string;
  class_name: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  subject: string;
  teacher: string;
  start_time: string;
  end_time: string;
  room?: string;
  schedule_image_url?: string;
  created_at?: string;
}

export interface ScheduleImage {
  id: string;
  class_grade: 'all' | '10' | '11' | '12';
  class_name: string;
  image_url: string;
  title: string;
  updated_at: string;
  file_type?: 'pdf' | 'excel' | 'word' | 'image' | 'file';
  file_name?: string;
  file_size?: string;
}

export interface AttendanceSettings {
  id?: string;
  start_time: string; // e.g. "06:00"
  on_time_limit: string; // e.g. "07:15"
  end_time: string; // e.g. "08:30"
  gps_radius_meters: number;
  check_in_time?: string; // e.g. "07:30"
  check_out_time?: string; // e.g. "14:30"
  alpha_cutoff_time?: string; // e.g. "10:00"
  late_tolerance_minutes?: number;
  school_qr_code?: string;
  admin_whatsapp?: string;
  updated_at?: string;
}

export interface SchoolLocation {
  id?: string;
  school_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string;
  updated_at?: string;
}

export interface AttendanceStats {
  total_students: number;
  total_present: number;
  total_late: number;
  total_permission: number;
  total_sick: number;
  total_alpha: number;
  attendance_percentage: number;
}

export interface BrandingSettings {
  school_name: string;
  academic_year?: string;
  logo_url: string;
  background_url: string;
  theme_color: string;
  updated_at?: string;
}
