import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';
import { compressImageToDataUrl } from '../../lib/imageCompression.js';
import { ScheduleImage } from '../../types.js';
import { ConfirmModal } from '../common/ConfirmModal.js';
import { 
  Upload, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  FileImage, 
  FileText, 
  FileSpreadsheet, 
  File, 
  RefreshCw, 
  BookOpen, 
  Sparkles, 
  ExternalLink,
  Trash2,
  X,
  FileCheck,
  Clock,
  HardDrive
} from 'lucide-react';

export const AdminScheduleUpload: React.FC = () => {
  const [scheduleImages, setScheduleImages] = useState<ScheduleImage[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ScheduleImage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Cleanup object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (selectedPreviewUrl && selectedPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        schedule_images?: ScheduleImage[];
        images?: ScheduleImage[];
      }>('/schedules/images');

      if (res.success) {
        const list = res.schedule_images || res.images || [];
        setScheduleImages(list);
        if (list.length > 0 && !activePreviewId) {
          setActivePreviewId(list[0].id || list[0].file_name || null);
        }
      }
    } catch (err) {
      console.error('Failed to load schedule files', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    const isExcel = ext === 'xlsx' || ext === 'xls' || ext === 'csv' || file.type.includes('spreadsheet') || file.type.includes('excel');
    const isWord = ext === 'docx' || ext === 'doc' || file.type.includes('word') || file.type.includes('officedocument');

    if (!isImage && !isPdf && !isExcel && !isWord) {
      setErrorMessage('Format file didukung: PDF, Excel (.xlsx, .xls), Word (.docx), atau Gambar (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal 20 MB.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    // If image, create preview
    if (isImage) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedPreviewUrl(previewUrl);
    } else {
      setSelectedPreviewUrl(null);
    }

    // Pre-populate custom title if empty
    if (!customTitle.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setCustomTitle(`Jadwal Pelajaran - ${baseName}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleCancelSelected = () => {
    setSelectedFile(null);
    if (selectedPreviewUrl && selectedPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }
    setSelectedPreviewUrl(null);
    setCustomTitle('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Silakan pilih file jadwal terlebih dahulu.');
      return;
    }

    const file = selectedFile;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    const isExcel = ext === 'xlsx' || ext === 'xls' || ext === 'csv' || file.type.includes('spreadsheet') || file.type.includes('excel');
    const isWord = ext === 'docx' || ext === 'doc' || file.type.includes('word') || file.type.includes('officedocument');

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let fileBase64 = '';
      let detectedType: 'pdf' | 'excel' | 'word' | 'image' | 'file' = 'file';

      if (isPdf) detectedType = 'pdf';
      else if (isExcel) detectedType = 'excel';
      else if (isWord) detectedType = 'word';
      else if (isImage) detectedType = 'image';

      if (isImage) {
        fileBase64 = await compressImageToDataUrl(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.65,
          targetMaxKb: 90,
        });
      } else {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      }

      const defaultTitle = isPdf 
        ? `Dokumen PDF Jadwal Pelajaran (${file.name})`
        : isExcel
        ? `Tabel Excel Jadwal Pelajaran (${file.name})`
        : isWord
        ? `Dokumen Word Jadwal Pelajaran (${file.name})`
        : 'Bagan Jadwal Mata Pelajaran Lengkap';

      const titleToSend = customTitle.trim() || defaultTitle;

      const res = await api.post<{
        success: boolean;
        message: string;
        schedule_image?: ScheduleImage;
        image?: ScheduleImage;
        schedule_images?: ScheduleImage[];
        images?: ScheduleImage[];
      }>('/schedules/images', {
        class_grade: 'all',
        image_url: fileBase64,
        title: titleToSend,
        file_name: file.name,
        file_size: formatFileSize(file.size),
        file_type: detectedType,
      });

      if (res.success) {
        const updatedList = res.schedule_images || res.images;
        if (updatedList && updatedList.length > 0) {
          setScheduleImages(updatedList);
          setActivePreviewId(updatedList[0].id || updatedList[0].file_name || null);
        } else {
          await fetchSchedules();
        }

        setSuccessMessage(`Berhasil mengunggah file "${file.name}" ke jadwal sekolah!`);
        handleCancelSelected();
        setTimeout(() => setSuccessMessage(null), 6000);
      } else {
        setErrorMessage(res.message || 'Gagal mengunggah file jadwal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteScheduleFile = async () => {
    const target = fileToDelete || activeImage;
    if (!target) return;

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deleteId = target.id || target.file_name || target.class_grade || 'all';
      const res = await api.delete<{
        success: boolean;
        message: string;
        schedule_images?: ScheduleImage[];
      }>(`/schedules/images/${encodeURIComponent(deleteId)}`);

      if (res.success) {
        const remaining = res.schedule_images || [];
        setScheduleImages(remaining);
        if (activePreviewId === target.id || activePreviewId === target.file_name) {
          setActivePreviewId(remaining[0]?.id || remaining[0]?.file_name || null);
        }
        setSuccessMessage(`File "${target.file_name || target.title}" berhasil dihapus dari sistem.`);
        setShowDeleteModal(false);
        setFileToDelete(null);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.message || 'Gagal menghapus file jadwal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menghapus file.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Active schedule file
  const activeImage = scheduleImages.find((img) => img.id === activePreviewId || img.file_name === activePreviewId) 
    || scheduleImages[0];

  const handleDownload = (fileUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename || 'Jadwal-Pelajaran.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const getFileBadge = (file?: ScheduleImage) => {
    if (!file) return null;
    const type = file.file_type || (
      file.image_url?.includes('.pdf') ? 'pdf' : 
      file.image_url?.startsWith('data:image') || file.image_url?.match(/\.(jpg|jpeg|png|webp)/i) ? 'image' : 
      'file'
    );
    
    if (type === 'pdf') {
      return (
        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full font-bold text-[10px] flex items-center gap-1">
          <FileText className="w-3 h-3 text-rose-600" />
          PDF Document
        </span>
      );
    }
    if (type === 'excel') {
      return (
        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full font-bold text-[10px] flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
          Excel Spreadsheet
        </span>
      );
    }
    if (type === 'word') {
      return (
        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full font-bold text-[10px] flex items-center gap-1">
          <FileText className="w-3 h-3 text-blue-600" />
          Word Document
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full font-bold text-[10px] flex items-center gap-1">
        <FileImage className="w-3 h-3 text-emerald-600" />
        Foto / Gambar
      </span>
    );
  };

  const isImageFile = activeImage?.image_url && (
    activeImage.file_type === 'image' || 
    activeImage.image_url.startsWith('data:image') || 
    Boolean(activeImage.image_url.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i))
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Manajemen Kurikulum & Akademik
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Jadwal Mata Pelajaran (Mapel)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah dan kelola file dokumen jadwal terpadu (PDF, Excel, Word, atau Gambar) untuk seluruh siswa.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSchedules}
          className="px-3.5 py-2 bg-white/90 hover:bg-emerald-50 text-emerald-800 border border-emerald-100/90 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button 
            type="button" 
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50/90 border border-rose-200/90 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-semibold shadow-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Callout */}
      <div className="p-4 bg-emerald-50/60 backdrop-blur-xs border border-emerald-100/90 rounded-2xl flex items-start gap-3 text-xs text-emerald-950 shadow-2xs">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-emerald-900">
            Alur Pengelolaan Jadwal Mapel
          </span>
          <p className="leading-relaxed text-emerald-800/90 text-[11px]">
            1. Pilih file jadwal dari komputer/HP &rarr; 2. Tinjau file yang dipilih dan klik tombol <b>Unggah File Jadwal</b> &rarr; 3. File yang diunggah akan langsung muncul di panel <b>File Jadwal Aktif</b> dan dapat Anda lihat atau hapus kapan saja.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Upload Area */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-emerald-100/90 shadow-xl shadow-emerald-950/5 space-y-5">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Unggah File Jadwal Pelajaran
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                File ini akan otomatis dapat diakses oleh <b>Semua Siswa (Kelas 10, 11, & 12)</b>
              </p>
            </div>

            {/* If NO file selected yet: Show File Selection / Dropzone */}
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-emerald-200/90 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 transition-all rounded-2xl p-7 text-center cursor-pointer space-y-3.5 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleInputChange}
                  accept=".pdf, .xlsx, .xls, .docx, .doc, image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600 group-hover:scale-105 transition-transform">
                  <FileText className="w-7 h-7" />
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-800 block group-hover:text-emerald-800 transition-colors">
                    Klik atau Tarik File Jadwal ke Sini
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Mendukung format <b>PDF</b>, <b>Excel (.xlsx)</b>, <b>Word (.docx)</b>, atau <b>Gambar (PNG, JPG)</b> (Maks. 20 MB)
                  </span>
                </div>

                <button
                  type="button"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih File Dokumen / Gambar</span>
                </button>
              </div>
            ) : (
              /* If file IS SELECTED: Show Staged File Preview & Prominent Upload Button */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        {selectedFile.type.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
                          <FileText className="w-5 h-5" />
                        ) : selectedFile.name.match(/\.(xlsx|xls|csv)/i) ? (
                          <FileSpreadsheet className="w-5 h-5" />
                        ) : selectedFile.type.startsWith('image/') ? (
                          <FileImage className="w-5 h-5" />
                        ) : (
                          <File className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-slate-800 block truncate">
                          {selectedFile.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                          <span>{formatFileSize(selectedFile.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold uppercase">Siap Diunggah</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelSelected}
                      disabled={isUploading}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Batalkan Pilihan File"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thumbnail preview if image */}
                  {selectedPreviewUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-200/80 max-h-40 bg-slate-900/5">
                      <img
                        src={selectedPreviewUrl}
                        alt="Pratinjau File Pilihan"
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Optional Custom Title Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul / Keterangan Jadwal (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Contoh: Jadwal Pelajaran Semester Genap Lengkap"
                    disabled={isUploading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* THE EXPLICIT UPLOAD BUTTON */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteUpload}
                    disabled={isUploading}
                    className="w-full py-3.5 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/40"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang Mengunggah File ke Server...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload File Jadwal Sekarang</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSelected}
                    disabled={isUploading}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal / Pilih File Lain
                  </button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 space-y-1.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-700 block">Panduan Format File:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                <li><b>PDF</b>: Sangat direkomendasikan agar tabel jadwal tetap tajam di HP siswa.</li>
                <li><b>Excel / Word</b>: Memudahkan siswa membuka dengan Google Docs / WPS Office.</li>
                <li><b>Gambar (JPG/PNG)</b>: Otomatis dioptimalkan agar tidak membebani kuota siswa.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Uploaded Schedule Files View & Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-emerald-100/90 shadow-xl shadow-emerald-950/5 space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-emerald-100/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    File Jadwal Aktif Saat Ini
                  </h2>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200">
                    {scheduleImages.length} File Aktif
                  </span>
                </div>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Semua file di bawah ini aktif tampil dan dapat dibuka oleh seluruh siswa (baik PDF maupun Foto).
                </span>
              </div>
            </div>

            {/* If Active Files Exist */}
            {isLoading ? (
              <div className="space-y-3 animate-pulse py-2">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : scheduleImages.length > 0 ? (
              <div className="space-y-4">
                
                {/* List of all active uploaded files */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Daftar Dokumen ({scheduleImages.length} file):
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {scheduleImages.map((file, idx) => {
                      const isCurrentSelected = (activeImage?.id === file.id) || (activeImage?.file_name === file.file_name);
                      const isFilePdf = file.file_type === 'pdf' || file.image_url?.includes('.pdf');
                      const isFileImg = file.file_type === 'image' || Boolean(file.image_url?.match(/\.(jpg|jpeg|png|webp)/i));

                      return (
                        <div 
                          key={file.id || idx}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCurrentSelected 
                              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' 
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80'
                          }`}
                        >
                          <div 
                            onClick={() => setActivePreviewId(file.id || file.file_name || null)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                              {isFilePdf ? (
                                <FileText className="w-5 h-5 text-rose-600" />
                              ) : file.file_type === 'excel' ? (
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                              ) : isFileImg ? (
                                <FileImage className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <File className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                                  {file.file_name || file.title}
                                </span>
                                {getFileBadge(file)}
                                {isCurrentSelected && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    Sedang Ditinjau
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                                {file.file_size && <span>{file.file_size}</span>}
                                {file.file_size && <span>•</span>}
                                <span>
                                  {file.updated_at
                                    ? new Date(file.updated_at).toLocaleDateString('id-ID', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        year: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })
                                    : 'Baru saja'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for this file */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePreviewId(file.id || file.file_name || null);
                                if (isFileImg) setPreviewModalUrl(file.image_url);
                                else handleOpenFile(file.image_url);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Pratinjau File"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Pratinjau</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(file.image_url, file.file_name || `${file.title || 'Jadwal'}.pdf`)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Unduh File"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Unduh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFileToDelete(file);
                                setShowDeleteModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Hapus File Ini Saja"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Interactive Preview of Currently Selected File */}
                {activeImage && (
                  <div className="pt-3 border-t border-emerald-100/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        Pratinjau Aktif: {activeImage.file_name || activeImage.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(activeImage.image_url)}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Buka Layar Penuh
                      </button>
                    </div>

                    {isImageFile ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-emerald-100 bg-slate-50 flex items-center justify-center max-h-[350px]">
                        <img
                          src={activeImage.image_url}
                          alt={activeImage.title}
                          className="w-full h-auto max-h-[350px] object-contain rounded-2xl cursor-pointer"
                          onClick={() => setPreviewModalUrl(activeImage.image_url)}
                        />
                        <div
                          onClick={() => setPreviewModalUrl(activeImage.image_url)}
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-bold text-xs gap-2 backdrop-blur-2xs"
                        >
                          <Eye className="w-5 h-5" />
                          <span>Klik untuk memperbesar tampilan</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-slate-50">
                        <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
                          <span className="text-xs font-bold truncate max-w-xs">{activeImage.file_name || activeImage.title}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenFile(activeImage.image_url)}
                            className="text-emerald-300 hover:text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Tab Baru</span>
                          </button>
                        </div>
                        <div className="relative w-full h-[360px] bg-slate-100">
                          <iframe
                            src={`${activeImage.image_url}#toolbar=0`}
                            title={activeImage.title}
                            className="w-full h-full border-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              /* Empty State */
              <div className="py-20 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-emerald-200/60 space-y-2.5">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <File className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700 block">
                  Belum Ada File Jadwal yang Diunggah
                </span>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Silakan pilih file PDF, Excel, Word, atau gambar jadwal di panel sebelah kiri lalu tekan tombol <b>Upload File Jadwal Sekarang</b>.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal Zoom Preview for Images */}
      {previewModalUrl && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Pratinjau File Jadwal
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewModalUrl, 'Jadwal-Mapel-Lengkap.png')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[300px]">
              <img
                src={previewModalUrl}
                alt="Pratinjau Jadwal"
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Hapus File Jadwal Pelajaran"
        message={
          fileToDelete
            ? `Apakah Anda yakin ingin menghapus file "${fileToDelete.file_name || fileToDelete.title}" dari sistem? File lainnya yang terunggah akan tetap aman dan dapat diakses siswa.`
            : 'Apakah Anda yakin ingin menghapus file jadwal ini dari sistem? Setelah dihapus, siswa tidak dapat melihat dokumen jadwal sampai Anda mengunggah file yang baru.'
        }
        confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus File'}
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleDeleteScheduleFile}
        onCancel={() => {
          setShowDeleteModal(false);
          setFileToDelete(null);
        }}
      />

    </div>
  );
};
