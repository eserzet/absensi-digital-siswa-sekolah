import React, { useState, useEffect } from 'react';
import { Student, ScheduleImage } from '../../types.js';
import { api } from '../../lib/api.js';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  File, 
  ExternalLink, 
  Maximize2, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw,
  Info,
  CalendarCheck,
  Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';

interface StudentMapelProps {
  student: Student;
}

const SCHOOL_BANNER_BG = "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZgDiiO_xVpoBKAxOBMuTUF8i5lp6PRZ5a3z4PQ_E0phwWgtL2dnDMh2o0rXmVFouUea_b0YZOeBf7FWMSqse14hP-NBvUEHpBAiOuqVfmpumFCAFsiKsQnNJrCiQWXnTgTlQqWAUH4mP6=s1360-w1360-h1020-rw";

export const StudentMapel: React.FC<StudentMapelProps> = ({ student }) => {
  const { branding } = useTheme();
  const bannerBg = branding?.background_url || SCHOOL_BANNER_BG;
  const [scheduleImages, setScheduleImages] = useState<ScheduleImage[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showEmbeddedViewer, setShowEmbeddedViewer] = useState<boolean>(true);

  // Extract student grade (e.g. "X (10)" -> "10", "XI (11)" -> "11", "XII (12)" -> "12")
  const studentGrade = student.class_name.includes('10') || (student.class_name.startsWith('X') && !student.class_name.startsWith('XI') && !student.class_name.startsWith('XII'))
    ? '10'
    : student.class_name.includes('11') || (student.class_name.startsWith('XI') && !student.class_name.startsWith('XII'))
    ? '11'
    : '12';

  useEffect(() => {
    fetchScheduleFiles();
  }, [student.class_name]);

  const fetchScheduleFiles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        schedule_images?: ScheduleImage[];
        images?: ScheduleImage[];
      }>('/schedules/images');

      if (res.success) {
        const list = res.schedule_images || res.images || [];
        if (list.length > 0) {
          setScheduleImages(list);
          setSelectedFileIndex(0);
          return;
        }
      }

      const fallbackRes = await api.get<{
        success: boolean;
        images?: ScheduleImage[];
      }>(`/schedules?class_name=${encodeURIComponent(student.class_name)}`);

      if (fallbackRes.success && fallbackRes.images) {
        setScheduleImages(fallbackRes.images);
        setSelectedFileIndex(0);
      }
    } catch (err) {
      console.error('Gagal memuat dokumen jadwal', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (imageUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || 'Jadwal-Resmi-Sekolah.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  // 1 file jadwal berisi semua mapel dan kelas pada database
  const activeFiles = scheduleImages;
  const displayedFile = activeFiles[selectedFileIndex] || activeFiles[0];

  const isImageFile = displayedFile?.image_url && (
    displayedFile.file_type === 'image' || 
    displayedFile.image_url.startsWith('data:image') || 
    Boolean(displayedFile.image_url.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i))
  );

  return (
    <div className="space-y-5 pb-16 font-sans w-full max-w-2xl mx-auto transition-colors pt-1 sm:pt-2 md:pt-4">
      
      {/* 1. School Header Banner with Campus Photo */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white border border-emerald-600/40 dark:border-emerald-500/50 min-h-[140px] sm:min-h-[155px] flex flex-col justify-between card-2d transition-all">
        {/* Background Image of the school - High Clarity */}
        <img 
          src={bannerBg}
          alt="Gedung Kampus SMA Informatika Nurul Bayan"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Balanced Dark & Theme Gradient Overlay identical to Card Selamat Datang */}
        <div className="absolute inset-0 z-0 bg-linear-to-r from-slate-950/92 via-emerald-950/80 to-slate-950/75 backdrop-blur-[0.5px]" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-xs font-black uppercase tracking-wider">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-300" />
              Jadwal Resmi Kurikulum
            </span>
            <button
              type="button"
              onClick={fetchScheduleFiles}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
              title="Perbarui data jadwal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <h2 className="text-base sm:text-xl font-black text-white mt-3 leading-snug">
            Jadwal Pelajaran Resmi
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
            SMA Informatika Nurul Bayan &bull; Kelas: <b className="text-white font-bold">{student.class_name}</b> (Tingkat {studentGrade})
          </p>
        </div>
      </div>

      {/* Multi-File Tab Switcher if more than 1 file uploaded */}
      {activeFiles.length > 1 && (
        <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-3.5 border-2 border-slate-200 dark:border-slate-800 card-2d space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Tersedia {activeFiles.length} Dokumen Jadwal:
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Pilih Dokumen
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeFiles.map((file, idx) => {
              const isSelected = selectedFileIndex === idx;
              const isFileImg = file.file_type === 'image' || file.image_url?.match(/\.(jpg|jpeg|png|webp)/i);
              const isFilePdf = file.file_type === 'pdf' || file.image_url?.includes('.pdf');
              return (
                <button
                  key={file.id || idx}
                  type="button"
                  onClick={() => {
                    setSelectedFileIndex(idx);
                    setShowEmbeddedViewer(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 border-2 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isFilePdf ? (
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-rose-500'}`} />
                  ) : isFileImg ? (
                    <FileImage className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                  ) : (
                    <File className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                  )}
                  <span className="truncate max-w-[150px] sm:max-w-[220px]">
                    {file.file_name || file.title}
                  </span>
                  {file.file_size && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                      {file.file_size}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Main Official Schedule Document Card */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-5 sm:p-6 border-2 border-slate-200 dark:border-slate-800 card-2d space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Dokumen Terunggah
              </span>
              {activeFiles.length > 1 && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Dokumen {selectedFileIndex + 1} dari {activeFiles.length}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
              {displayedFile?.title || displayedFile?.file_name || 'File Dokumen Jadwal Terpadu'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dokumen kurikulum resmi untuk seluruh mata pelajaran semester aktif.
            </p>
          </div>

          {displayedFile?.image_url && (
            <div className="flex items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => handleOpenFile(displayedFile.image_url)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Buka File</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(
                  displayedFile.image_url, 
                  displayedFile.file_name || `${displayedFile.title || 'Jadwal-Resmi-Sekolah'}.${isImageFile ? 'png' : 'pdf'}`
                )}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95 card-2d"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File</span>
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
            <span>Memuat file jadwal resmi...</span>
          </div>
        ) : displayedFile?.image_url ? (
          isImageFile ? (
            /* Image Preview with Click-To-Zoom */
            <div className="space-y-3">
              <div
                onClick={() => {
                  setSelectedImageModal(displayedFile.image_url);
                  setImageScale(1);
                }}
                className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080c14] group cursor-pointer aspect-4/3 flex items-center justify-center shadow-xs"
              >
                <img
                  src={displayedFile.image_url}
                  alt={displayedFile.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="px-4 py-2 bg-white dark:bg-[#0d1322] text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg border border-slate-200 dark:border-slate-700">
                    <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Buka Gambar Layar Penuh
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Klik gambar di atas untuk melihat dalam resolusi penuh & zoom
                </span>
                <span className="font-mono text-slate-400 dark:text-slate-500">
                  {displayedFile.file_name || 'Bagan-Jadwal.jpg'}
                </span>
              </div>
            </div>
          ) : (
            /* Document Preview Card (PDF / Excel / Word) */
            <div className="space-y-4">
              <div className="p-6 bg-linear-to-br from-emerald-50/50 via-slate-50 to-emerald-50/30 dark:from-emerald-950/20 dark:via-[#0b101e] dark:to-emerald-950/10 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800/50 flex flex-col items-center justify-center text-center space-y-3.5">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0d1322] shadow-sm border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  {displayedFile.file_type === 'excel' ? (
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  ) : displayedFile.file_type === 'word' ? (
                    <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <FileText className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {displayedFile.file_name || displayedFile.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    {displayedFile.file_type === 'excel' 
                      ? 'Format Lembar Kerja Excel. Dapat dibuka dengan WPS Office atau Microsoft Excel.' 
                      : displayedFile.file_type === 'word'
                      ? 'Format Dokumen Word. Dapat dibuka dengan aplikasi dokumen.'
                      : 'Format Dokumen PDF Resmi. Format terbaik untuk tabel kurikulum yang jernih dan mudah dibaca.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenFile(displayedFile.image_url)}
                    className="flex-1 py-2.5 px-4 bg-white dark:bg-[#0d1322] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Buka File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(
                      displayedFile.image_url, 
                      displayedFile.file_name || `${displayedFile.title || 'Jadwal-Resmi-Sekolah'}.pdf`
                    )}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer active:scale-95 card-2d"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File</span>
                  </button>
                </div>
              </div>

              {/* Embedded PDF Viewer if PDF format */}
              {displayedFile.file_type === 'pdf' && (
                <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-slate-50 dark:bg-[#080c14]">
                  <div className="bg-slate-800 dark:bg-[#080c14] text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold">Pratinjau Dokumen PDF Resmi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEmbeddedViewer(!showEmbeddedViewer)}
                        className="text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/10"
                      >
                        {showEmbeddedViewer ? 'Sembunyikan' : 'Tampilkan Dokumen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(displayedFile.image_url)}
                        className="text-emerald-300 hover:text-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-white/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Tab Baru</span>
                      </button>
                    </div>
                  </div>
                  {showEmbeddedViewer && (
                    <div className="relative w-full h-[520px] bg-slate-100 dark:bg-[#080c14]">
                      <iframe
                        src={`${displayedFile.image_url}#toolbar=0`}
                        title="Pratinjau Dokumen Jadwal Pelajaran"
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          /* Empty State when no document has been uploaded */
          <div className="text-center p-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#080c14] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <File className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              File jadwal resmi belum diunggah oleh admin kurikulum sekolah.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
              Admin sekolah dapat mengunggah file jadwal terpadu (PDF, Excel, Word, atau Gambar) melalui panel Kurikulum.
            </p>
          </div>
        )}
      </div>

      {/* 3. Helpful Info Card */}
      <div className="bg-emerald-50/60 dark:bg-[#091a14] rounded-2xl p-4 border-2 border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 card-2d transition-all">
        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed">
          <p className="font-bold text-xs text-emerald-950 dark:text-emerald-300 mb-0.5">Informasi Dokumen Jadwal</p>
          Dokumen ini merupakan jadwal resmi pelajaran yang diterbitkan oleh bagian Kurikulum SMA Informatika Nurul Bayan. Anda dapat mengunduh dan menyimpannya di ponsel agar dapat dibuka kapan saja tanpa kuota.
        </div>
      </div>

      {/* 4. Fullscreen Zoom Modal for Schedule Image */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-white pb-3">
            <span className="text-xs font-bold truncate max-w-[50%]">
              {displayedFile?.title || 'Dokumen Jadwal Pelajaran'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(selectedImageModal, `${displayedFile?.title || 'Jadwal-Resmi'}.png`)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer card-2d"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
              <button
                type="button"
                onClick={() => setImageScale((prev) => Math.min(prev + 0.3, 3.5))}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white cursor-pointer"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setImageScale((prev) => Math.max(prev - 0.3, 0.7))}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white cursor-pointer"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedImageModal(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-2">
            <img
              src={selectedImageModal}
              alt="Jadwal Pelajaran Fullscreen"
              style={{ transform: `scale(${imageScale})`, transition: 'transform 0.15s ease-out' }}
              className="max-w-full max-h-full object-contain select-none"
            />
          </div>

          <p className="text-center text-[11px] text-white/60 pt-2">
            Gunakan tombol zoom di atas atau cubit layar sentuh untuk memperbesar teks jadwal.
          </p>
        </div>
      )}

    </div>
  );
};
