import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';
import { QRCodeConfig } from '../../types.js';
import { Logo } from '../common/Logo.js';
import { useTheme } from '../../context/ThemeContext.js';
import { 
  QrCode, 
  Download, 
  Printer, 
  RefreshCw, 
  ShieldCheck, 
  Info,
  Building2 
} from 'lucide-react';
import QRCode from 'qrcode';

export const AdminQRCode: React.FC = () => {
  const { branding } = useTheme();
  const [config, setConfig] = useState<QRCodeConfig>({
    school_name: 'SMA Informatika Nurul Bayan',
    qr_payload: 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN',
    generated_at: new Date().toISOString(),
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch remote config from database first, then generate real QR image
  useEffect(() => {
    fetchQRConfig();
  }, []);

  const generateQrImage = async (payload: string) => {
    const rawPayload = payload || 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN';
    // Format full deep-link URL so students can scan directly with native iPhone / Android camera
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const textToEncode = `${origin}/?qr=${encodeURIComponent(rawPayload)}`;
    
    // 1. Render to canvas if available
    if (canvasRef.current) {
      try {
        await QRCode.toCanvas(canvasRef.current, textToEncode, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (err) {
        console.error('Canvas QR rendering error', err);
      }
    }

    // 2. Generate Data URL for download and img fallback
    try {
      const url = await QRCode.toDataURL(textToEncode, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('DataURL QR rendering error', err);
    }
  };

  const fetchQRConfig = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        config?: QRCodeConfig;
        qr_code?: string;
        school_name?: string;
      }>('/qr');

      const payload = res.config?.qr_payload || res.qr_code || 'NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN';
      const schoolName = res.config?.school_name || res.school_name || 'SMA Informatika Nurul Bayan';
      const genAt = res.config?.generated_at || new Date().toISOString();

      setConfig({
        school_name: schoolName,
        qr_payload: payload,
        generated_at: genAt,
      });

      setIsLoading(false);
      setTimeout(() => {
        generateQrImage(payload);
      }, 50);
    } catch (err) {
      console.error('Failed to load QR config', err);
      setIsLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    if (!confirm('Apakah Anda yakin ingin memperbarui kode QR absensi sekolah? Seluruh siswa harus memindai QR code yang baru.')) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        config: QRCodeConfig;
      }>('/qr/regenerate', {});

      if (res.success && res.config) {
        setConfig(res.config);
        await generateQrImage(res.config.qr_payload);
      }
    } catch (err) {
      console.error('Failed to regenerate QR', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl && canvasRef.current) {
      const canvasUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = canvasUrl;
      link.download = `QR_Absensi_SMA_Informatika_Nurul_Bayan.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_Absensi_SMA_Informatika_Nurul_Bayan.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            QR Gerbang Sekolah
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            QR Code Tunggal Absensi Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cetak dan tempelkan QR Code ini pada gerbang masuk atau papan pengumuman sekolah
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRegenerateQR}
            disabled={isRegenerating}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Buat token kode QR baru jika kode lama bocor"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Memperbarui...' : 'Perbarui Kode QR'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh QR Code (PNG)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Lembar Resmi</span>
          </button>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-start gap-3 text-xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-blue-950">Satu QR Code untuk Seluruh Siswa</span>
          <p className="leading-relaxed text-blue-800">
            Sesuai regulasi sistem, hanya ada <b>satu QR Code resmi</b> untuk seluruh kelas dan siswa di SMA Informatika Nurul Bayan. Validasi kehadiran dijamin melalui pencocokan koordinat GPS radius 100 meter serta swafoto dokumentasi kamera depan siswa.
          </p>
        </div>
      </div>

      {/* Printable Poster Container */}
      <div className="flex justify-center">
        <div
          ref={printAreaRef}
          className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-md max-w-lg w-full text-center space-y-6 print:m-0 print:p-6 print:border-none print:shadow-none"
        >
          {/* School Header */}
          <div className="space-y-2 pb-5 border-b border-slate-200">
            <div className="flex justify-center mb-2">
              <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center select-none filter drop-shadow-sm">
                <Logo size="xl" showText={false} />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              SMA INFORMATIKA NURUL BAYAN
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              SISTEM PRESENSI DIGITAL BERBASIS QR & GPS
            </p>
            <p className="text-[11px] text-slate-400">
              Kec. Cimerak, Kab. Pangandaran, Jawa Barat
            </p>
          </div>

          {/* QR Box with direct Canvas and img fallback */}
          <div className="py-2 flex flex-col items-center justify-center">
            {isLoading ? (
              <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-slate-100 border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 animate-pulse shadow-inner">
                <QrCode className="w-12 h-12 text-slate-400 animate-spin" />
                <span className="text-xs font-bold text-slate-400">Memuat Kode QR Resmi...</span>
              </div>
            ) : (
              <>
                <div className="p-4 bg-white rounded-3xl border-4 border-slate-900 shadow-xl inline-flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                  />
                  {/* Hidden image element to guarantee availability */}
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="QR Code Absensi Sekolah"
                      className="hidden"
                    />
                  )}
                </div>

                <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-bold tracking-wider">
                  {config.qr_payload}
                </div>
              </>
            )}
          </div>

          {/* Instructions for students */}
          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 text-left space-y-1.5 border border-slate-200/60">
            <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
              Petunjuk Bagi Siswa:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500">
              <li>Scan bisa langsung lewat <b>Kamera Bawaan HP (iPhone/Android)</b> atau tombol <b>"Scan Sekarang"</b> di aplikasi.</li>
              <li>Pastikan fitur <b>GPS / Lokasi</b> pada ponsel Anda telah aktif dan berada di area sekolah.</li>
              <li>Ambil foto swafoto (selfie) wajah Anda sebagai bukti dokumentasi kehadiran yang sah.</li>
              <li>Sistem akan otomatis mencatat presensi Anda dan terverifikasi secara real-time.</li>
            </ol>
          </div>

          <p className="text-[10px] text-slate-400 pt-2">
            Diperbarui oleh Administrator SMA Informatika Nurul Bayan
          </p>
        </div>
      </div>

    </div>
  );
};
