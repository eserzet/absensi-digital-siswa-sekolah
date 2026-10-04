import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  User,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  GraduationCap
} from 'lucide-react';

export interface PhotoPreviewData {
  url: string;
  title?: string;
  studentName?: string;
  className?: string;
  username?: string;
  statusBadge?: string;
  timestamp?: string;
  distanceMeters?: number;
  notes?: string;
  isProfilePhoto?: boolean;
}

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PhotoPreviewData | null;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Reset state when modal opens or photo changes
  useEffect(() => {
    if (isOpen) {
      setIsZoomed(false);
      setRotation(0);
      setIsImageLoading(true);
      setHasError(false);
    }
  }, [isOpen, data?.url]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(data.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeName = (data.studentName || 'siswa')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const suffix = data.isProfilePhoto ? 'profile' : 'absensi';
      link.download = `foto-${suffix}-${safeName}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback for cross-origin issues
      window.open(data.url, '_blank');
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'HADIR':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200';
      case 'TERLAMBAT':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200';
      case 'IZIN':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200';
      case 'SAKIT':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200';
      case 'ALPHA':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0d1322] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b101e]">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {data.isProfilePhoto ? (
                  <>
                    <User className="w-3 h-3" />
                    <span>Foto Profil Siswa</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3 h-3" />
                    <span>Bukti Absensi (Selfie)</span>
                  </>
                )}
              </span>

              {data.statusBadge && (
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusColor(
                    data.statusBadge
                  )}`}
                >
                  {data.statusBadge}
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
              {data.studentName || 'Data Siswa'}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {data.className && (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50">
                  <GraduationCap className="w-3 h-3" />
                  Kelas {data.className}
                </span>
              )}
              {data.username && (
                <span className="font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  @{data.username}
                </span>
              )}
              {data.timestamp && (
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {data.timestamp}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Tutup (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo Display Viewport */}
        <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] max-h-[58vh] bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none">
          {isImageLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 z-10 bg-slate-950">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Memuat resolusi penuh...</span>
            </div>
          )}

          {hasError ? (
            <div className="text-center p-6 space-y-2 text-slate-400">
              <p className="text-sm font-bold text-rose-400">Gagal memuat foto</p>
              <p className="text-xs text-slate-500">Tautan gambar tidak valid atau telah dihapus.</p>
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline pt-2"
              >
                <span>Buka URL Langsung</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center transition-transform duration-200 ${
                isZoomed ? 'cursor-zoom-out overflow-auto' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              <img
                src={data.url}
                alt={data.studentName || 'Foto'}
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setIsImageLoading(false);
                  setHasError(true);
                }}
                style={{
                  transform: `rotate(${rotation}deg) ${isZoomed ? 'scale(1.6)' : 'scale(1)'}`,
                  transformOrigin: 'center center',
                }}
                className={`max-w-full max-h-[52vh] object-contain rounded-2xl shadow-2xl transition-all duration-300 pointer-events-auto ${
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </div>
          )}

          {/* Floating Controls Overlay (Zoom & Rotate) */}
          {!hasError && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-lg z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(!isZoomed);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title={isZoomed ? 'Perkecil' : 'Perbesar Zoom'}
              >
                {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRotation((prev) => (prev + 90) % 360);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Putar 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Detail Notes / Location footer if available */}
        {(data.notes || data.distanceMeters != null) && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#0b101e] border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
            {data.distanceMeters != null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Jarak Presensi: <strong>{data.distanceMeters} meter</strong> dari sekolah
              </span>
            )}
            {data.notes && (
              <span className="text-[11px] italic truncate max-w-full">
                Ket: "{data.notes}"
              </span>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-white dark:bg-[#0d1322] border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh file foto ke perangkat"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Unduh</span>
            </button>

            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka gambar ukuran asli di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Ukuran Asli</span>
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
