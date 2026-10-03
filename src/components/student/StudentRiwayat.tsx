import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../../types.js';
import { api } from '../../lib/api.js';
import { 
  History, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ImageOff, 
  Calendar,
  XCircle 
} from 'lucide-react';

export const StudentRiwayat: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHistory();
  }, [selectedStatus]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const url = selectedStatus === 'all' 
        ? '/attendance/my-history' 
        : `/attendance/my-history?status=${selectedStatus}`;
      
      const res = await api.get<{
        success: boolean;
        records: AttendanceRecord[];
      }>(url);

      if (res.success) {
        setRecords(res.records || []);
      }
    } catch (err) {
      console.error('Failed to load attendance history', err);
    } finally {
      setIsLoading(false);
    }
  };

  const STATUS_PILLS = [
    { key: 'all', label: 'Semua' },
    { key: 'HADIR', label: 'Hadir' },
    { key: 'TERLAMBAT', label: 'Terlambat' },
    { key: 'IZIN', label: 'Izin' },
    { key: 'SAKIT', label: 'Sakit' },
    { key: 'ALPHA', label: 'Alpha' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-24 font-sans transition-colors pt-1 sm:pt-2 md:pt-4">
      
      {/* Header Card */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 card-2d transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Riwayat Absensi Siswa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catatan presensi, waktu scan, dan verifikasi GPS
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pt-4 pb-1 no-scrollbar">
          {STATUS_PILLS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelectedStatus(p.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                selectedStatus === p.key
                  ? 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expiration Rules Note */}
      <div className="p-3.5 bg-slate-100/80 dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5 card-2d">
        <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] leading-relaxed">
          Foto dokumentasi kehadiran disimpan aktif di server dan dapat dilihat selama 24 jam.
        </span>
      </div>

      {/* Attendance List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
          Memuat riwayat absensi...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
          <History className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-1" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada catatan absensi dengan filter ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-[#0d1322] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 card-2d flex flex-col gap-3 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs ${
                        rec.status === 'HADIR'
                          ? 'bg-emerald-600'
                          : rec.status === 'TERLAMBAT'
                          ? 'bg-amber-500'
                          : rec.status === 'ALPHA'
                          ? 'bg-rose-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {rec.status === 'ALPHA' ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md text-white ${
                            rec.status === 'HADIR'
                              ? 'bg-emerald-600'
                              : rec.status === 'TERLAMBAT'
                              ? 'bg-amber-500'
                              : rec.status === 'ALPHA'
                              ? 'bg-rose-600'
                              : 'bg-blue-600'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {rec.date}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {rec.time} WIB
                    </span>
                    {rec.status === 'ALPHA' ? (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">
                        Otomatis Ditutup
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
                        Jarak: {rec.distance_meters}m
                      </span>
                    )}
                  </div>
                </div>

                {/* Photo or 24-hour Expiry Notice */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {rec.photo_url ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img
                          src={rec.photo_url}
                          alt="Foto Absensi"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        Foto dokumentasi aktif
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                      <ImageOff className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      <span className="italic text-[11px]">
                        {rec.status === 'ALPHA'
                          ? 'Tidak ada foto (Tercatat Alpha otomatis)'
                          : ((rec as any).photo_notice || 'Dokumentasi foto telah kedaluwarsa (> 24 jam).')}
                      </span>
                    </div>
                  )}

                  {rec.notes && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                      {rec.notes}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
