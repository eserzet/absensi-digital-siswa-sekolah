import { AttendanceSettings, SchoolLocation } from '../../types.js';

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  id: 'primary-settings',
  start_time: '06:00',
  on_time_limit: '07:30',
  end_time: '11:30',
  gps_radius_meters: 100,
  check_in_time: '07:30',
  check_out_time: '14:30',
  alpha_cutoff_time: '11:30',
  late_tolerance_minutes: 0,
  school_qr_code: 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN',
  admin_whatsapp: process.env.ADMIN_WHATSAPP || '6285659611760',
  updated_at: new Date().toISOString(),
};

export const DEFAULT_SCHOOL_LOCATION: SchoolLocation = {
  id: 'primary-location',
  school_name: 'SMA Informatika Nurul Bayan',
  latitude: -7.678912,
  longitude: 108.456789,
  radius_meters: 100,
  address: 'Jl. Raya Cimerak, Desa Cimerak, Kec. Cimerak, Kab. Pangandaran, Jawa Barat',
  updated_at: new Date().toISOString(),
};
