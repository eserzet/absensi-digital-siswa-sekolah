import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api.js';
import { AttendanceRecord, AttendanceStatus, Student } from '../../types.js';
import { getWIBTodayDateString } from '../../lib/dateUtils.js';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Loader2,
  Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SCHOOL_LOGO_URL } from '../common/Logo.js';
import { useTheme } from '../../context/ThemeContext.js';

const CLASS_OPTIONS = [
  'all',
  'X (10)',
  'XI (11)',
  'XII (12)',
];

export interface StudentRecapRow {
  student_id: string;
  full_name: string;
  username: string;
  class_name: string;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpha: number;
  total_hadir: number;
  total_records: number;
  attendance_rate: number;
}

export const AdminRekap: React.FC = () => {
  const { branding } = useTheme();
  const today = getWIBTodayDateString();
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState({
    total_records: 0,
    total_hadir: 0,
    total_terlambat: 0,
    total_izin: 0,
    total_sakit: 0,
    total_alpha: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecapData();
  }, [startDate, endDate, selectedClass, selectedStatus]);

  const fetchRecapData = async () => {
    setIsLoading(true);
    try {
      const url = `/attendance/recap?start_date=${startDate}&end_date=${endDate}&class_name=${selectedClass}&status=${selectedStatus}`;
      const [recapRes, studentsRes] = await Promise.all([
        api.get<{
          success: boolean;
          records: AttendanceRecord[];
          summary: typeof summary;
        }>(url),
        api.get<{
          success: boolean;
          students: Student[];
        }>('/students').catch(() => ({ success: false, students: [] })),
      ]);

      if (recapRes.success) {
        setRecords(recapRes.records || []);
        setSummary(recapRes.summary);
      }
      if (studentsRes && studentsRes.success && Array.isArray(studentsRes.students)) {
        setStudents(studentsRes.students);
      }
    } catch (err) {
      console.error('Failed to load recap data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Selalu urutkan daftar transaksi log presensi sesuai Abjad (A-Z)
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const nameA = (a.student?.full_name || a.student_name || '').trim();
      const nameB = (b.student?.full_name || b.student_name || '').trim();
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });
  }, [records]);

  // REKAP AGREGAT PER SISWA: 1 Nama per Baris dengan rincian Hadir, Terlambat, Izin, Sakit, Alpha, dan % Kehadiran
  const studentRecapList = useMemo<StudentRecapRow[]>(() => {
    const studentMap = new Map<string, StudentRecapRow>();

    // 1. Inisialisasi dari daftar master siswa (hanya siswa aktif)
    students.forEach((s) => {
      if (selectedClass !== 'all' && s.class_name !== selectedClass) return;
      if (s.is_active === false) return;
      studentMap.set(s.id, {
        student_id: s.id,
        full_name: (s.full_name || 'Tanpa Nama').trim(),
        username: s.username || '-',
        class_name: s.class_name || '-',
        hadir: 0,
        terlambat: 0,
        izin: 0,
        sakit: 0,
        alpha: 0,
        total_hadir: 0,
        total_records: 0,
        attendance_rate: 0,
      });
    });

    // 2. Akumulasi data absensi dari rentang tanggal yang dipilih
    records.forEach((r) => {
      const studentId = r.student_id || r.student?.id || '';
      const fullName = (r.student?.full_name || r.student_name || '').trim();
      const username = r.student?.username || '-';
      const className = r.student?.class_name || r.class_name || '-';

      // Pastikan sesuai filter kelas
      if (selectedClass !== 'all' && className !== selectedClass) return;

      let entry = studentId ? studentMap.get(studentId) : null;
      if (!entry && fullName) {
        for (const val of studentMap.values()) {
          if (val.full_name.toLowerCase() === fullName.toLowerCase()) {
            entry = val;
            break;
          }
        }
      }

      if (!entry) {
        const key = studentId || fullName || `anon_${Math.random()}`;
        entry = {
          student_id: studentId || key,
          full_name: fullName || 'Siswa',
          username,
          class_name: className,
          hadir: 0,
          terlambat: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total_hadir: 0,
          total_records: 0,
          attendance_rate: 0,
        };
        studentMap.set(key, entry);
      }

      if (r.status === 'HADIR') entry.hadir += 1;
      else if (r.status === 'TERLAMBAT') entry.terlambat += 1;
      else if (r.status === 'IZIN') entry.izin += 1;
      else if (r.status === 'SAKIT') entry.sakit += 1;
      else if (r.status === 'ALPHA') entry.alpha += 1;
    });

    // 3. Kalkulasi total kehadiran dan persentase
    let list = Array.from(studentMap.values()).map((s) => {
      const total_hadir = s.hadir + s.terlambat;
      const total_records = s.hadir + s.terlambat + s.izin + s.sakit + s.alpha;
      const attendance_rate = total_records > 0 ? Math.round((total_hadir / total_records) * 100) : 0;
      return {
        ...s,
        total_hadir,
        total_records,
        attendance_rate,
      };
    });

    // 4. Filter status jika dipilih
    if (selectedStatus !== 'all') {
      list = list.filter((s) => {
        if (selectedStatus === 'HADIR') return s.hadir > 0;
        if (selectedStatus === 'TERLAMBAT') return s.terlambat > 0;
        if (selectedStatus === 'IZIN') return s.izin > 0;
        if (selectedStatus === 'SAKIT') return s.sakit > 0;
        if (selectedStatus === 'ALPHA') return s.alpha > 0;
        return true;
      });
    }

    // 5. Urutkan nama siswa A-Z secara alfabetis
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name, 'id', { sensitivity: 'base' }));
  }, [records, students, selectedClass, selectedStatus]);

  // Helper konversi URL gambar ke base64 untuk disematkan ke PDF
  const getBase64FromUrl = async (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch {
          // fallback
        }
        resolve('');
      };
      img.onerror = () => resolve('');
    });
  };

  // Helper nama file unik dengan kelas, rentang tanggal, dan timestamp jam-menit-detik agar tidak bertumpuk
  const generateExportFileName = (extension: 'pdf' | 'xls' | 'csv'): string => {
    const classSlug = selectedClass === 'all' ? 'Semua_Kelas' : `Kelas_${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const statusSlug = selectedStatus !== 'all' ? `_${selectedStatus}` : '';
    const dateSlug = startDate === endDate ? startDate : `${startDate}_sd_${endDate}`;
    
    // Format timestamp lokal (HHmmss) untuk menjamin nama file selalu berbeda di setiap download
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    return `Rekap_Presensi_${classSlug}${statusSlug}_${dateSlug}_${timeStr}.${extension}`;
  };

  // Ekspor Dokumen Resmi PDF Berwarna dengan Kop, Logo, Ringkasan Statistik, dan Tabel Rapi
  // Ekspor Dokumen Resmi PDF Berwarna dengan Kop, Logo, Ringkasan Statistik, dan Tabel Rekapitulasi Per Siswa
  const handleExportPDF = async () => {
    if (studentRecapList.length === 0) return;
    setIsExportingPDF(true);

    try {
      const classLabel = selectedClass === 'all' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
      const statusLabel = selectedStatus === 'all' ? 'Semua Status' : selectedStatus;
      const printDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Format A4 Landscape (297mm x 210mm) untuk memuat tabel presensi per siswa secara optimal
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 14;

      // 1. Aksen Garis Hiasan Atas (Emerald Theme)
      doc.setFillColor(4, 120, 87); // #047857
      doc.rect(0, 0, pageWidth, 4.5, 'F');

      // 2. Logo Resmi Sekolah
      const logoUrl = (branding?.logo_url && branding.logo_url !== '/pwa-512x512.png') ? branding.logo_url : SCHOOL_LOGO_URL;
      const logoBase64 = await getBase64FromUrl(logoUrl);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', margin, 8.5, 20, 20);
        } catch (err) {
          console.warn('Could not render logo in PDF', err);
        }
      }

      // 3. Teks Kop Surat Sekolah
      const headerLeft = logoBase64 ? margin + 23 : margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(4, 120, 87); // Emerald Green
      doc.text((branding?.school_name || 'SMA INFORMATIKA NURUL BAYAN').toUpperCase(), headerLeft, 14.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text('SISTEM INFORMASI PRESENSI & KEHADIRAN DIGITAL SISWA', headerLeft, 19.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text('Kecamatan Cimerak, Kabupaten Pangandaran, Jawa Barat • Dokumen Resmi Kedinasan Sekolah', headerLeft, 24);

      // Garis Pembatas Kop Ganda
      doc.setDrawColor(4, 120, 87);
      doc.setLineWidth(0.7);
      doc.line(margin, 30, pageWidth - margin, 30);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.line(margin, 31.2, pageWidth - margin, 31.2);

      // 4. Judul Laporan & Parameter Pencarian
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text('REKAPITULASI KEHADIRAN SISWA (AGREGAT PER SISWA)', margin, 37.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Periode: ${startDate} s/d ${endDate}    |    Kelas: ${classLabel}    |    Filter Status: ${statusLabel}    |    Waktu Ekspor: ${printDate}`,
        margin,
        42
      );

      // 5. Kotak Ringkasan Statistik Berwarna (6 Cards)
      const stats = [
        { label: 'Total Siswa', count: studentRecapList.length, bg: [15, 23, 42], text: [255, 255, 255] },
        { label: 'Hadir Tepat', count: summary.total_hadir, bg: [21, 128, 61], text: [255, 255, 255] },
        { label: 'Terlambat', count: summary.total_terlambat, bg: [217, 119, 6], text: [255, 255, 255] },
        { label: 'Izin', count: summary.total_izin, bg: [37, 99, 235], text: [255, 255, 255] },
        { label: 'Sakit', count: summary.total_sakit, bg: [79, 70, 229], text: [255, 255, 255] },
        { label: 'Alpha', count: summary.total_alpha, bg: [220, 38, 38], text: [255, 255, 255] },
      ];

      const boxWidth = (pageWidth - margin * 2 - 5 * 2.5) / 6;
      const boxHeight = 10;
      const boxY = 45.5;

      stats.forEach((st, i) => {
        const x = margin + i * (boxWidth + 2.5);
        doc.setFillColor(st.bg[0], st.bg[1], st.bg[2]);
        doc.roundedRect(x, boxY, boxWidth, boxHeight, 1.8, 1.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(st.text[0], st.text[1], st.text[2]);
        doc.text(String(st.count), x + boxWidth / 2, boxY + 5.2, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(st.label, x + boxWidth / 2, boxY + 8.5, { align: 'center' });
      });

      // 6. Tabel Data Kehadiran Per Siswa (1 Baris per Siswa, Tanpa Username/NISN)
      const tableHeaders = [
        ['No.', 'Nama Siswa (A-Z)', 'Kelas', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha', 'Total Hadir', '% Kehadiran']
      ];

      const tableBody = studentRecapList.map((s, idx) => [
        idx + 1,
        s.full_name,
        s.class_name,
        s.hadir,
        s.terlambat,
        s.izin,
        s.sakit,
        s.alpha,
        s.total_hadir,
        `${s.attendance_rate}%`
      ]);

      autoTable(doc, {
        startY: 59,
        head: tableHeaders,
        body: tableBody,
        theme: 'striped',
        margin: { left: margin, right: margin, bottom: 22 },
        headStyles: {
          fillColor: [4, 120, 87],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.8,
          halign: 'center',
          cellPadding: 2,
        },
        bodyStyles: {
          fontSize: 7.2,
          textColor: [30, 41, 59],
          cellPadding: 1.8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { fontStyle: 'bold', cellWidth: 80 },
          2: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 19 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 19 },
          7: { halign: 'center', fontStyle: 'bold', cellWidth: 19 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
          9: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const col = data.column.index;
            const val = Number(data.cell.raw) || 0;
            if (col === 3 && val > 0) {
              data.cell.styles.fillColor = [240, 253, 244];
              data.cell.styles.textColor = [21, 128, 61];
            } else if (col === 4 && val > 0) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
            } else if (col === 5 && val > 0) {
              data.cell.styles.fillColor = [239, 246, 255];
              data.cell.styles.textColor = [29, 78, 216];
            } else if (col === 6 && val > 0) {
              data.cell.styles.fillColor = [238, 242, 255];
              data.cell.styles.textColor = [67, 56, 202];
            } else if (col === 7 && val > 0) {
              data.cell.styles.fillColor = [254, 242, 242];
              data.cell.styles.textColor = [185, 28, 28];
            } else if (col === 8) {
              data.cell.styles.textColor = [4, 120, 87];
            } else if (col === 9) {
              const num = parseInt(String(data.cell.raw)) || 0;
              if (num >= 85) {
                data.cell.styles.textColor = [21, 128, 61];
              } else if (num >= 70) {
                data.cell.styles.textColor = [180, 83, 9];
              } else {
                data.cell.styles.textColor = [185, 28, 28];
              }
            }
          }
        },
        didDrawPage: (data) => {
          const pageStr = `Halaman ${data.pageNumber} dari ${doc.getNumberOfPages()}`;
          doc.setFontSize(7.2);
          doc.setTextColor(148, 163, 184);
          doc.text(pageStr, pageWidth / 2, pageHeight - 6, { align: 'center' });
          doc.text(
            'Dokumen digenerate otomatis oleh Sistem Presensi SMA Informatika Nurul Bayan',
            margin,
            pageHeight - 6
          );
        }
      });

      // 7. Area Tanda Tangan Resmi di Halaman Terakhir
      const finalY = (doc as any).lastAutoTable?.finalY || 140;
      let sigY = finalY + 7;
      if (sigY + 32 > pageHeight - 12) {
        doc.addPage();
        sigY = 22;
      }

      const sigX = pageWidth - margin - 60;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Pangandaran, ${printDate}`, sigX, sigY);
      doc.text('Mengetahui,', sigX, sigY + 4);
      doc.text('Kepala SMA Informatika Nurul Bayan', sigX, sigY + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('( ______________________________ )', sigX, sigY + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      doc.text('NIP. -', sigX, sigY + 28);

      // Simpan dan Download PDF dengan nama file unik
      doc.save(generateExportFileName('pdf'));
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('Terjadi kesalahan saat mengekspor file PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Ekspor ke Excel (.xls) dengan tabel terstruktur, 1 nama per baris (tidak dobel), rincian H, T, I, S, A
  const handleExportExcel = () => {
    if (studentRecapList.length === 0) return;

    const classLabel = selectedClass === 'all' ? 'Semua Kelas' : `Kelas ${selectedClass}`;
    const statusLabel = selectedStatus === 'all' ? 'Semua Status' : selectedStatus;
    const printDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const tableRows = studentRecapList.map((s, idx) => {
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const rateColor = s.attendance_rate >= 85 ? '#15803d' : s.attendance_rate >= 70 ? '#b45309' : '#b91c1c';

      return `
        <tr style="background-color: ${rowBg};">
          <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px; color: #475569;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: bold; color: #0f172a;">${s.full_name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; color: #047857; font-weight: bold;">${s.class_name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: #15803d; background-color: ${s.hadir > 0 ? '#f0fdf4' : 'transparent'};">${s.hadir}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: #b45309; background-color: ${s.terlambat > 0 ? '#fef3c7' : 'transparent'};">${s.terlambat}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: #1d4ed8; background-color: ${s.izin > 0 ? '#eff6ff' : 'transparent'};">${s.izin}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: #4338ca; background-color: ${s.sakit > 0 ? '#eef2ff' : 'transparent'};">${s.sakit}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: #b91c1c; background-color: ${s.alpha > 0 ? '#fef2f2' : 'transparent'};">${s.alpha}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; font-weight: bold; color: #047857; background-color: #ecfdf5;">${s.total_hadir}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; font-weight: bold; color: ${rateColor};">${s.attendance_rate}%</td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Rekap Presensi Siswa</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #047857; color: #ffffff; font-weight: bold; border: 1px solid #065f46; padding: 10px 12px; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 20px;">
          <h2 style="color: #047857; margin: 0; padding: 0;">SMA INFORMATIKA NURUL BAYAN</h2>
          <h3 style="color: #0f172a; margin: 5px 0 10px 0; padding: 0;">REKAPITULASI KEHADIRAN SISWA (AGREGAT PER SISWA)</h3>
          <p style="margin: 2px 0; font-size: 12px; color: #334155;"><strong>Periode:</strong> ${startDate} s/d ${endDate} &nbsp;|&nbsp; <strong>Kelas:</strong> ${classLabel} &nbsp;|&nbsp; <strong>Filter Status:</strong> ${statusLabel}</p>
          <p style="margin: 2px 0; font-size: 11px; color: #64748b;"><strong>Tanggal Ekspor:</strong> ${printDate} &nbsp;|&nbsp; <strong>Total Siswa:</strong> ${studentRecapList.length} Siswa (1 Nama per Baris, Urut A-Z)</p>
        </div>

        <table style="margin-bottom: 15px; width: auto;">
          <tr style="background-color: #f1f5f9;">
            <th style="background-color: #0f172a; color: #fff; padding: 6px 12px;">Total Siswa</th>
            <th style="background-color: #15803d; color: #fff; padding: 6px 12px;">Hadir Tepat</th>
            <th style="background-color: #b45309; color: #fff; padding: 6px 12px;">Terlambat</th>
            <th style="background-color: #1d4ed8; color: #fff; padding: 6px 12px;">Izin</th>
            <th style="background-color: #4338ca; color: #fff; padding: 6px 12px;">Sakit</th>
            <th style="background-color: #b91c1c; color: #fff; padding: 6px 12px;">Alpha</th>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: bold; padding: 6px 12px;">${studentRecapList.length}</td>
            <td style="text-align: center; font-weight: bold; padding: 6px 12px; color: #15803d;">${summary.total_hadir}</td>
            <td style="text-align: center; font-weight: bold; padding: 6px 12px; color: #b45309;">${summary.total_terlambat}</td>
            <td style="text-align: center; font-weight: bold; padding: 6px 12px; color: #1d4ed8;">${summary.total_izin}</td>
            <td style="text-align: center; font-weight: bold; padding: 6px 12px; color: #4338ca;">${summary.total_sakit}</td>
            <td style="text-align: center; font-weight: bold; padding: 6px 12px; color: #b91c1c;">${summary.total_alpha}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th style="width: 45px;">No.</th>
              <th>Nama Siswa (A-Z)</th>
              <th>Kelas</th>
              <th>Hadir (H)</th>
              <th>Terlambat (T)</th>
              <th>Izin (I)</th>
              <th>Sakit (S)</th>
              <th>Alpha (A)</th>
              <th>Total Hadir</th>
              <th>% Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateExportFileName('xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Ekspor ke CSV dengan UTF-8 BOM, 1 nama per baris (tidak dobel, tanpa username/NISN)
  const handleExportCSV = () => {
    if (studentRecapList.length === 0) return;

    const headers = ['No.', 'Nama Siswa', 'Kelas', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpha', 'Total Hadir', 'Persentase Kehadiran'];
    const rows = studentRecapList.map((s, idx) => [
      idx + 1,
      `"${s.full_name.replace(/"/g, '""')}"`,
      s.class_name,
      s.hadir,
      s.terlambat,
      s.izin,
      s.sakit,
      s.alpha,
      s.total_hadir,
      `"${s.attendance_rate}%"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generateExportFileName('csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Laporan & Rekapitulasi
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
            Rekap Kehadiran Siswa
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Data terurut sesuai huruf abjad nama siswa (A-Z) dengan nomor urutan rapi
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2">
          {/* Tombol Ekspor PDF Resmi Berwarna */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF || sortedRecords.length === 0}
            className="flex-1 sm:flex-none px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download dokumen PDF resmi lengkap dengan kop, logo sekolah, tabel berwarna & ringkasan statistik"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                <span>Membuat PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-rose-100" />
                <span>Ekspor PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
            title="Download file Excel (.xls) berformat tabel rapi & berwarna"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Ekspor Excel (.xls)</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Download file data CSV"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Cetak atau simpan sebagai PDF laporan resmi"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 transition-colors">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Dari Tanggal
          </label>
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Sampai Tanggal
          </label>
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Filter Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">Semua Kelas</option>
            {CLASS_OPTIONS.filter((c) => c !== 'all').map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Status Kehadiran
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">Semua Status</option>
            <option value="HADIR">Hadir</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="IZIN">Izin</option>
            <option value="SAKIT">Sakit</option>
            <option value="ALPHA">Alpha</option>
          </select>
        </div>
      </div>

      {/* Recap Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-[#0d1322] rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Total Siswa
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-white mt-1 block">
            {studentRecapList.length}
          </span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-3 sm:p-4 border border-emerald-100 dark:border-emerald-800/60 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            Hadir Tepat
          </span>
          <span className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1 block">
            {summary.total_hadir}
          </span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-3 sm:p-4 border border-amber-100 dark:border-amber-800/60 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            Terlambat
          </span>
          <span className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-300 mt-1 block">
            {summary.total_terlambat}
          </span>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-3 sm:p-4 border border-blue-100 dark:border-blue-800/60 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
            Total Izin
          </span>
          <span className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-300 mt-1 block">
            {summary.total_izin}
          </span>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-3 sm:p-4 border border-indigo-100 dark:border-indigo-800/60 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
            Total Sakit
          </span>
          <span className="text-lg sm:text-xl font-black text-indigo-800 dark:text-indigo-300 mt-1 block">
            {summary.total_sakit}
          </span>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-3 sm:p-4 border border-rose-100 dark:border-rose-800/60 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Total Alpha
          </span>
          <span className="text-lg sm:text-xl font-black text-rose-800 dark:text-rose-300 mt-1 block">
            {summary.total_alpha}
          </span>
        </div>
      </div>

      {/* Tabel Data Rekapitulasi Per Siswa (1 Baris Per Siswa) */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden p-3.5 sm:p-0 transition-colors">
        
        {/* Mobile View: Kartu Rekapitulasi Siswa (< md) */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
              Memuat data rekap siswa...
            </div>
          ) : studentRecapList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              Tidak ada data siswa pada filter ini.
            </div>
          ) : (
            studentRecapList.map((s, idx) => (
              <div
                key={`${s.student_id}-${idx}`}
                className="p-3.5 bg-slate-50/80 dark:bg-[#0b101e] hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-2.5 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-[10px] shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                        {s.full_name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">Kelas {s.class_name}</span>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      s.attendance_rate >= 85
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : s.attendance_rate >= 75
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {s.attendance_rate}%
                  </span>
                </div>

                {/* Breakdown Presensi Siswa */}
                <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
                  <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60">
                    <span className="block text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Hadir</span>
                    <span className="block text-xs font-black text-emerald-800 dark:text-emerald-300">{s.hadir}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60">
                    <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase">Telat</span>
                    <span className="block text-xs font-black text-amber-800 dark:text-amber-300">{s.terlambat}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60">
                    <span className="block text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase">Izin</span>
                    <span className="block text-xs font-black text-blue-800 dark:text-blue-300">{s.izin}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60">
                    <span className="block text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Sakit</span>
                    <span className="block text-xs font-black text-indigo-800 dark:text-indigo-300">{s.sakit}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/70 dark:border-rose-800/60">
                    <span className="block text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase">Alpha</span>
                    <span className="block text-xs font-black text-rose-800 dark:text-rose-300">{s.alpha}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                  <span>Total Hadir Kumulatif: <strong className="text-slate-800 dark:text-white font-black">{s.total_hadir} hari</strong></span>
                  <span>Tingkat Kehadiran: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{s.attendance_rate}%</strong></span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Tabel Rekapitulasi Siswa (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-3 text-center w-12 text-slate-500 dark:text-slate-400">No.</th>
                <th className="py-3.5 px-4">Nama Siswa (A-Z)</th>
                <th className="py-3.5 px-3">Kelas</th>
                <th className="py-3.5 px-2.5 text-center text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30">Hadir</th>
                <th className="py-3.5 px-2.5 text-center text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30">Telat</th>
                <th className="py-3.5 px-2.5 text-center text-blue-800 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30">Izin</th>
                <th className="py-3.5 px-2.5 text-center text-indigo-800 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30">Sakit</th>
                <th className="py-3.5 px-2.5 text-center text-rose-800 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/30">Alpha</th>
                <th className="py-3.5 px-3 text-center font-black text-slate-800 dark:text-white">Total Hadir</th>
                <th className="py-3.5 px-3 text-center font-black text-slate-800 dark:text-white">% Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    Memuat data rekapitulasi...
                  </td>
                </tr>
              ) : studentRecapList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data siswa pada filter ini.
                  </td>
                </tr>
              ) : (
                studentRecapList.map((s, idx) => (
                  <tr key={`${s.student_id}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {s.full_name}
                    </td>
                    <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-bold">
                      {s.class_name}
                    </td>
                    <td className="py-3 px-2.5 text-center bg-emerald-50/20 dark:bg-emerald-950/20">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        {s.hadir}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center bg-amber-50/20 dark:bg-amber-950/20">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {s.terlambat}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center bg-blue-50/20 dark:bg-blue-950/20">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                        {s.izin}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center bg-indigo-50/20 dark:bg-indigo-950/20">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                        {s.sakit}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center bg-rose-50/20 dark:bg-rose-950/20">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                        {s.alpha}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white">
                      {s.total_hadir}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                          s.attendance_rate >= 85
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : s.attendance_rate >= 75
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {s.attendance_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PRINTABLE OFFICIAL REPORT CONTAINER (Shown strictly on window.print()) ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report, #printable-report * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 20px !important;
            display: block !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="printable-report" className="hidden">
        {/* Kop Surat Resmi dengan Logo */}
        <div className="flex items-center gap-4 pb-4 mb-4 border-b-2 border-slate-900">
          <div className="w-16 h-16 shrink-0 flex items-center justify-center select-none">
            <img 
              src={branding?.logo_url && branding.logo_url !== '/pwa-512x512.png' ? branding.logo_url : SCHOOL_LOGO_URL} 
              alt="Logo SMA Informatika Nurul Bayan" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 text-center pr-16">
            <h3 className="text-xs font-bold tracking-widest text-slate-600 uppercase">
              YAYASAN NURUL BAYAN CIMERAK
            </h3>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide mt-0.5">
              {branding?.school_name || 'SMA INFORMATIKA NURUL BAYAN'}
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Jl. Sukajaya No. 12, Cimerak, Kab. Pangandaran, Jawa Barat • Email: smastika.nurulbayan@gmail.com
            </p>
          </div>
        </div>

        {/* Judul Laporan */}
        <div className="text-center mb-5">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
            LAPORAN REKAPITULASI KEHADIRAN SISWA
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Periode: <span className="font-semibold">{startDate}</span> s/d <span className="font-semibold">{endDate}</span> &nbsp;|&nbsp; Kelas: <span className="font-semibold">{selectedClass === 'all' ? 'Semua Kelas' : selectedClass}</span>
          </p>
        </div>

        {/* Ringkasan Angka Rekap */}
        <div className="grid grid-cols-6 gap-2 mb-5 text-center text-xs">
          <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Siswa</div>
            <div className="text-sm font-black text-slate-900">{studentRecapList.length}</div>
          </div>
          <div className="p-2 border border-emerald-300 rounded-lg bg-emerald-50">
            <div className="text-[10px] text-emerald-700 uppercase font-bold">Hadir</div>
            <div className="text-sm font-black text-emerald-800">{summary.total_hadir}</div>
          </div>
          <div className="p-2 border border-amber-300 rounded-lg bg-amber-50">
            <div className="text-[10px] text-amber-700 uppercase font-bold">Terlambat</div>
            <div className="text-sm font-black text-amber-800">{summary.total_terlambat}</div>
          </div>
          <div className="p-2 border border-blue-300 rounded-lg bg-blue-50">
            <div className="text-[10px] text-blue-700 uppercase font-bold">Izin</div>
            <div className="text-sm font-black text-blue-800">{summary.total_izin}</div>
          </div>
          <div className="p-2 border border-indigo-300 rounded-lg bg-indigo-50">
            <div className="text-[10px] text-indigo-700 uppercase font-bold">Sakit</div>
            <div className="text-sm font-black text-indigo-800">{summary.total_sakit}</div>
          </div>
          <div className="p-2 border border-rose-300 rounded-lg bg-rose-50">
            <div className="text-[10px] text-rose-700 uppercase font-bold">Alpha</div>
            <div className="text-sm font-black text-rose-800">{summary.total_alpha}</div>
          </div>
        </div>

        {/* Tabel Data Rekapitulasi Per Siswa (1 Baris per Siswa, Tidak Dobel, Tanpa NISN) */}
        <table className="w-full text-left text-xs border-collapse mb-8 border border-slate-300">
          <thead>
            <tr className="bg-emerald-800 text-white font-bold text-center">
              <th className="py-2 px-2 border border-slate-300 w-10">No.</th>
              <th className="py-2 px-3 border border-slate-300 text-left">Nama Siswa (A-Z)</th>
              <th className="py-2 px-2 border border-slate-300">Kelas</th>
              <th className="py-2 px-2 border border-slate-300 bg-emerald-900/50">Hadir</th>
              <th className="py-2 px-2 border border-slate-300 bg-amber-900/50">Telat</th>
              <th className="py-2 px-2 border border-slate-300 bg-blue-900/50">Izin</th>
              <th className="py-2 px-2 border border-slate-300 bg-indigo-900/50">Sakit</th>
              <th className="py-2 px-2 border border-slate-300 bg-rose-900/50">Alpha</th>
              <th className="py-2 px-2 border border-slate-300">Total Hadir</th>
              <th className="py-2 px-2 border border-slate-300">% Hadir</th>
            </tr>
          </thead>
          <tbody>
            {studentRecapList.map((s, idx) => (
              <tr key={`${s.student_id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                <td className="py-1.5 px-3 border border-slate-300 font-bold text-slate-900">{s.full_name}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-semibold text-emerald-800">{s.class_name}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-emerald-700 bg-emerald-50/40">{s.hadir}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-amber-700 bg-amber-50/40">{s.terlambat}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-blue-700 bg-blue-50/40">{s.izin}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-indigo-700 bg-indigo-50/40">{s.sakit}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-bold text-rose-700 bg-rose-50/40">{s.alpha}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-slate-900">{s.total_hadir}</td>
                <td className="py-1.5 px-2 border border-slate-300 text-center font-black text-slate-900">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                    s.attendance_rate >= 85 ? 'text-emerald-700 font-black' :
                    s.attendance_rate >= 75 ? 'text-amber-700 font-black' : 'text-rose-700 font-black'
                  }`}>
                    {s.attendance_rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kolom Tanda Tangan */}
        <div className="flex justify-between text-xs pt-6 text-slate-800">
          <div className="text-center w-60">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala SMA Informatika Nurul Bayan</p>
            <div className="h-20" />
            <p className="font-bold underline uppercase">( ............................................ )</p>
            <p className="text-[10px] text-slate-500">NIP. -</p>
          </div>
          <div className="text-center w-60">
            <p>Pangandaran, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Petugas / Operator Presensi</p>
            <div className="h-20" />
            <p className="font-bold underline uppercase">( Administrator Presensi )</p>
            <p className="text-[10px] text-slate-500">Super Administrator</p>
          </div>
        </div>
      </div>

    </div>
  );
};
