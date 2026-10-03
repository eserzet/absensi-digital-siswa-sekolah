import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  QrCode,
  MapPin,
  Camera,
  CameraOff,
  CalendarOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  SwitchCamera,
  Upload,
  Image as ImageIcon,
  Zap,
  ZapOff,
  Navigation
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { compressImageToDataUrl } from '../../lib/imageCompression.js';
import { AttendanceRecord, SchoolLocation } from '../../types.js';
import { formatIndonesianDate, getWIBTodayDateString, getWIBTimeString } from '../../lib/dateUtils.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useNotification } from '../../context/NotificationContext.js';

const isIOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
);

interface StudentScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: AttendanceRecord) => void;
  onAttendanceSuccess?: (record: AttendanceRecord) => void;
  onNavigateRiwayat?: () => void;
  initialScannedQr?: string | null;
}

type Step = 'validating' | 'already_attended' | 'holiday' | 'qr' | 'gps' | 'camera' | 'success';

export const StudentScanModal: React.FC<StudentScanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAttendanceSuccess,
  onNavigateRiwayat,
  initialScannedQr,
}) => {
  const permissions = usePermissions();
  const { sendNotification } = useNotification();
  const [currentStep, setCurrentStep] = useState<Step>('qr');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: QR State
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [schoolQRCode, setSchoolQRCode] = useState<string>('NUBA-SMART-ATTENDANCE-2026-NURUL-BAYAN');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isQrCameraStarting, setIsQrCameraStarting] = useState<boolean>(false);
  const [qrFacingMode, setQrFacingMode] = useState<'environment' | 'user'>('environment');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'html5qr-code-full-region';

  // Step 2: GPS State
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<SchoolLocation>({
    school_name: 'SMA Informatika Nurul Bayan',
    latitude: -7.678912,
    longitude: 108.456789,
    radius_meters: 100,
    address: 'Jl. Raya Cimerak, Kab. Pangandaran',
    updated_at: new Date().toISOString(),
  });
  const [isLocationValid, setIsLocationValid] = useState<boolean>(false);

  // Step 3: Camera State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [qrCameraBlocked, setQrCameraBlocked] = useState<boolean>(false);
  const [frontCameraBlocked, setFrontCameraBlocked] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Result & Validation State
  const [savedRecord, setSavedRecord] = useState<AttendanceRecord | null>(null);
  const [alreadyAttendedRecord, setAlreadyAttendedRecord] = useState<AttendanceRecord | null>(null);
  const [todayHoliday, setTodayHoliday] = useState<{ isHoliday: boolean; name?: string } | null>(null);
  const [attendanceCutoffTime, setAttendanceCutoffTime] = useState<string>('');

  // Step Reset and Lifecycle Initialization
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('validating');
      setCapturedPhoto(null);
      setUserLocation(null);
      setDistanceMeters(null);
      setIsLocationValid(false);
      setScannedQR(null);
      setSavedRecord(null);
      setAlreadyAttendedRecord(null);
      setErrorMessage(null);
      setIsLoading(false);
      setQrCameraBlocked(false);
      setFrontCameraBlocked(false);
      setTodayHoliday(null);

      // Verify attendance status, school QR, and location
      Promise.all([
        api.get<{
          success: boolean;
          has_attended: boolean;
          is_holiday?: boolean;
          holiday_name?: string;
          is_alpha?: boolean;
          attendance?: AttendanceRecord | null;
          settings?: {
            start_time?: string;
            on_time_limit?: string;
            end_time?: string;
            alpha_cutoff_time?: string;
          };
        }>('/attendance/my-today'),
        api.get<{ success: boolean; qr_code: string }>('/qr/school').catch(() => null),
        api.get<{ success: boolean; location: SchoolLocation }>('/location').catch(() => null),
      ])
        .then(([attRes, qrRes, locRes]) => {
          if (qrRes && (qrRes as any).qr_code) {
            setSchoolQRCode((qrRes as any).qr_code);
          }
          if (locRes && (locRes as any).location) {
            setSchoolLocation((locRes as any).location);
          }

          if (attRes?.success) {
            const cutoff = (attRes.settings?.end_time || attRes.settings?.alpha_cutoff_time || '11:30').trim();
            setAttendanceCutoffTime(cutoff);

            // Check if today is a recognized holiday
            if (attRes.is_holiday) {
              setTodayHoliday({
                isHoliday: true,
                name: attRes.holiday_name || 'Hari Libur Sekolah',
              });
              setCurrentStep('holiday');
              return;
            }

            // A. Check if user already attended today (Single attendance validation per day)
            if (attRes.has_attended && attRes.attendance) {
              setAlreadyAttendedRecord(attRes.attendance);
              setCurrentStep('already_attended');
              return;
            }

            // B. Check if attendance cutoff time has passed (Status Alpha)
            if (attRes.is_alpha) {
              const alphaRecord = attRes.attendance || {
                id: 'alpha-cutoff',
                student_id: '',
                student_name: 'Siswa',
                class_name: '',
                date: getWIBTodayDateString(),
                time: `${cutoff}:00`,
                timestamp: new Date().toISOString(),
                status: 'ALPHA',
                photo_url: null,
                latitude: null,
                longitude: null,
                distance_meters: 0,
                is_valid_location: false,
                notes: `Otomatis ALPHA: Melewati batas waktu akhir sekolah (${cutoff} WIB)`,
                created_at: new Date().toISOString(),
              };
              setAlreadyAttendedRecord(alphaRecord);
              setCurrentStep('already_attended');
              return;
            }

            // C. Additional client check for cutoff time
            const currentWIB = getWIBTimeString();
            if (currentWIB >= `${cutoff}:00`) {
              const autoAlpha: AttendanceRecord = {
                id: 'alpha-cutoff-local',
                student_id: '',
                student_name: 'Siswa',
                class_name: '',
                date: getWIBTodayDateString(),
                time: `${cutoff}:00`,
                timestamp: new Date().toISOString(),
                status: 'ALPHA',
                photo_url: null,
                latitude: null,
                longitude: null,
                distance_meters: 0,
                is_valid_location: false,
                notes: `Otomatis ALPHA: Melewati batas akhir operasional sekolah (${cutoff} WIB)`,
                created_at: new Date().toISOString(),
              };
              setAlreadyAttendedRecord(autoAlpha);
              setCurrentStep('already_attended');
              return;
            }

            // Student is eligible to scan attendance
            setCurrentStep('qr');
          } else {
            setCurrentStep('qr');
          }
        })
        .catch(() => {
          setCurrentStep('qr');
        });
    } else {
      stopCameraTracks();
      stopQRScanner();
    }
  }, [isOpen]);

  // 2. Pre-fetch GPS in background when modal is open if permission was previously granted
  useEffect(() => {
    if (isOpen && (permissions.geolocation === 'granted' || localStorage.getItem('nb_location_granted') === 'true')) {
      if (navigator.geolocation && !userLocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const uLat = pos.coords.latitude;
            const uLon = pos.coords.longitude;
            const acc = pos.coords.accuracy || 0;
            setUserLocation({ latitude: uLat, longitude: uLon });
            setGpsAccuracy(acc);
            const dist = calculateDistance(uLat, uLon, schoolLocation.latitude, schoolLocation.longitude);
            setDistanceMeters(dist);
            setIsLocationValid(dist <= schoolLocation.radius_meters);
            permissions.markGeolocationGranted();
          },
          () => { },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
        );
      }
    }
  }, [isOpen, permissions.geolocation, schoolLocation.latitude, schoolLocation.longitude, schoolLocation.radius_meters]);

  // 3. Initialize QR Scanner when on 'qr' step
  useEffect(() => {
    if (isOpen && currentStep === 'qr') {
      const timer = setTimeout(() => {
        startQRScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopQRScanner();
      };
    }
  }, [isOpen, currentStep]);

  const stopQRScanner = async () => {
    setIsTorchOn(false);
    setIsQrCameraStarting(false);

    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping QR scanner:', e);
      }
      qrScannerRef.current = null;
    }

    // Explicitly release any dangling video tracks on iOS WebKit
    const container = document.getElementById(qrRegionId);
    if (container) {
      const videos = container.querySelectorAll('video');
      videos.forEach((video) => {
        if (video.srcObject) {
          try {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
          } catch { }
          video.srcObject = null;
        }
      });
      container.innerHTML = '';
    }
  };

  const applyIOSVideoAttributes = (video: HTMLVideoElement) => {
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('muted', 'true');
    video.playsInline = true;
    video.muted = true;
  };

  const startQRScanner = async (preferredFacing?: 'environment' | 'user') => {
    const targetFacing = preferredFacing || qrFacingMode;
    setQrFacingMode(targetFacing);
    setIsQrCameraStarting(true);
    setQrCameraBlocked(false);
    setErrorMessage(null);

    try {
      await stopQRScanner();

      const container = document.getElementById(qrRegionId);
      if (!container) {
        setIsQrCameraStarting(false);
        return;
      }

      // Setup MutationObserver to guarantee playsinline, webkit-playsinline, autoplay, muted on iOS WebKit
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            if (node instanceof HTMLVideoElement) {
              applyIOSVideoAttributes(node);
            } else if (node instanceof HTMLElement) {
              node.querySelectorAll('video').forEach(applyIOSVideoAttributes);
            }
          });
        });
      });

      observer.observe(container, { childList: true, subtree: true });

      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxEdge = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: qrboxEdge, height: qrboxEdge };
        },
        aspectRatio: 1.0,
      };

      let started = false;
      const html5QrCode = new Html5Qrcode(qrRegionId, {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });
      qrScannerRef.current = html5QrCode;

      // ATTEMPT 1: Target facing mode ('environment' for back camera by default)
      try {
        await html5QrCode.start(
          { facingMode: targetFacing },
          qrConfig,
          (decodedText) => handleQRScanned(decodedText),
          () => { }
        );
        started = true;
      } catch (err1) {
        console.warn(`QR Scanner facingMode ${targetFacing} failed:`, err1);
      }

      // ATTEMPT 2: Fallback to opposite facing mode (e.g. if rear fails or device only has selfie/webcam)
      if (!started) {
        const oppositeFacing = targetFacing === 'environment' ? 'user' : 'environment';
        try {
          await html5QrCode.start(
            { facingMode: oppositeFacing },
            qrConfig,
            (decodedText) => handleQRScanned(decodedText),
            () => { }
          );
          started = true;
          setQrFacingMode(oppositeFacing);
        } catch (err2) {
          console.warn(`QR Scanner facingMode ${oppositeFacing} fallback failed:`, err2);
        }
      }

      // ATTEMPT 3: Device enumeration fallback
      if (!started) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const chosenCam = cameras.find((c) =>
              /back|rear|environment|belakang/i.test(c.label)
            ) || cameras[0];

            await html5QrCode.start(
              chosenCam.id,
              qrConfig,
              (decodedText) => handleQRScanned(decodedText),
              () => { }
            );
            started = true;
          }
        } catch (err3) {
          console.warn('QR Scanner camera enumeration fallback failed:', err3);
        }
      }

      observer.disconnect();

      if (started) {
        permissions.markCameraGranted();
        setQrCameraBlocked(false);
        setIsQrCameraStarting(false);

        // Immediate iOS WebKit video playback kick-start
        const videoElem = container.querySelector('video') as HTMLVideoElement | null;
        if (videoElem) {
          applyIOSVideoAttributes(videoElem);
          videoElem.play().catch(() => { });
        }
      } else {
        throw new Error('Kamera tidak dapat diaktifkan.');
      }
    } catch (_err) {
      console.warn('QR scanner failed to start:', _err);
      setQrCameraBlocked(true);
      setIsQrCameraStarting(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const videoElem = document.querySelector(`#${qrRegionId} video`) as HTMLVideoElement;
      const stream = videoElem?.srcObject as MediaStream;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities && 'torch' in capabilities === false && isIOS) {
          alert('Fitur lampu flash/senter kamera tidak didukung pada browser Safari/iOS.');
          return;
        }
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setIsTorchOn(nextState);
      } else {
        alert('Kamera aktif belum siap atau perangkat tidak memiliki lampu senter.');
      }
    } catch (err) {
      console.warn('Gagal mengubah lampu senter:', err);
      alert('Fitur flash/lampu senter tidak didukung atau sedang tidak dapat diakses pada peramban ini.');
    }
  };

  const handleQRScanned = (decodedText: string) => {
    let cleanScanned = (decodedText || '').trim();

    // Extract qr parameter if deep-link URL was scanned from native camera or QR link
    if (cleanScanned.includes('qr=')) {
      try {
        const parsed = new URL(cleanScanned.startsWith('http') ? cleanScanned : `https://dummy.local/${cleanScanned}`);
        const extracted = parsed.searchParams.get('qr');
        if (extracted) {
          cleanScanned = extracted.trim();
        } else if (parsed.hash && parsed.hash.includes('qr=')) {
          const hashMatch = parsed.hash.match(/[#&?]qr=([^&#]+)/);
          if (hashMatch) cleanScanned = decodeURIComponent(hashMatch[1]).trim();
        }
      } catch {
        const match = cleanScanned.match(/[?&#]qr=([^&#]+)/);
        if (match) cleanScanned = decodeURIComponent(match[1]).trim();
      }
    }

    if (!cleanScanned || cleanScanned !== schoolQRCode.trim()) {
      setErrorMessage(
        'QR Code Tidak Valid! Kode QR yang dipindai bukan QR Code resmi absensi SMA Informatika Nurul Bayan yang dicetak dari dashboard admin. Pastikan mengarahkan kamera ke QR Code yang benar.'
      );
      return;
    }

    stopQRScanner();
    setScannedQR(cleanScanned);
    setErrorMessage(null);
    setCurrentStep('gps');

    // If GPS coordinates were already pre-fetched and in radius, smoothly auto-advance!
    if (userLocation && isLocationValid) {
      setTimeout(() => {
        setCurrentStep('camera');
        startFrontCamera();
      }, 700);
    } else {
      requestGPSValidation();
    }
  };

  // Automatically process initial QR code scanned from native phone camera
  useEffect(() => {
    if (isOpen && initialScannedQr && schoolQRCode) {
      handleQRScanned(initialScannedQr);
    }
  }, [isOpen, initialScannedQr, schoolQRCode]);

  const handleQRFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const html5QrCode = new Html5Qrcode('qr-file-temp-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      setIsLoading(false);
      handleQRScanned(decodedText);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(
        'QR Code tidak dapat dideteksi pada gambar yang diunggah. Pastikan gambar QR Code resmi terlihat jelas dan tidak buram.'
      );
    }
  };

  // 4. Geolocation & Haversine Distance (2-Phase Fast Fix + High Accuracy)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const applyGpsPosition = (pos: GeolocationPosition, autoAdvance: boolean = true) => {
    const uLat = pos.coords.latitude;
    const uLon = pos.coords.longitude;
    const acc = pos.coords.accuracy || 0;
    setUserLocation({ latitude: uLat, longitude: uLon });
    setGpsAccuracy(acc);

    const dist = calculateDistance(
      uLat,
      uLon,
      schoolLocation.latitude,
      schoolLocation.longitude
    );
    setDistanceMeters(dist);

    const inRadius = dist <= schoolLocation.radius_meters;
    setIsLocationValid(inRadius);
    setErrorMessage(null);
    setIsLoading(false);
    permissions.markGeolocationGranted();

    // STRICT GEOFENCE: Only advance to camera if within radius!
    if (inRadius && autoAdvance) {
      setTimeout(() => {
        setCurrentStep('camera');
        startFrontCamera();
      }, 1000);
    }
  };

  const requestGPSValidation = () => {
    setErrorMessage(null);
    setIsLoading(true);

    if (!navigator.geolocation) {
      setErrorMessage('Perangkat Anda tidak mendukung fitur Geolocation GPS.');
      setIsLoading(false);
      return;
    }

    let hasReceivedFastFix = false;

    // Phase 1: Fast fix (allow cached up to 2 minutes, non-blocking)
    navigator.geolocation.getCurrentPosition(
      (fastPos) => {
        hasReceivedFastFix = true;
        if (fastPos.coords.accuracy <= 150) {
          applyGpsPosition(fastPos, true);
        } else {
          applyGpsPosition(fastPos, false);
        }
      },
      (_fastErr) => {
        // Fast fix failed, Phase 2 will resolve
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 120000,
      }
    );

    // Phase 2: High accuracy fix (relaxed 25s timeout and 30s cache)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyGpsPosition(pos, true);
      },
      (err) => {
        if (hasReceivedFastFix) {
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        setUserLocation(null);
        setDistanceMeters(null);
        setGpsAccuracy(null);
        setIsLocationValid(false);
        let msg = 'Izin lokasi (GPS) ditolak atau perangkat belum mengaktifkan GPS.';
        if (err.code === 1) {
          msg = 'Izin akses lokasi ditolak di browser. Siswa wajib mengizinkan lokasi untuk verifikasi kehadiran di sekolah. Silakan izinkan lokasi di pengaturan browser dan klik tombol "Cek Lokasi GPS Ulang".';
        } else if (err.code === 2) {
          msg = 'Sinyal satelit GPS tidak terdeteksi. Pastikan layanan Lokasi (GPS) pada HP Anda aktif dengan mode Akurasi Tinggi.';
        } else if (err.code === 3) {
          msg = 'Waktu deteksi sinyal GPS habis. Tips: Nyalakan Wi-Fi perangkat Anda untuk mempercepat satelit mengunci posisi presisi, lalu klik "Cek Lokasi GPS Ulang".';
        }
        setErrorMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 30000,
      }
    );
  };

  // 5. Front Camera Face Documentation (Progressive constraint fallback + iOS WebKit inline)
  const startFrontCamera = async () => {
    stopCameraTracks();
    await stopQRScanner();
    setFrontCameraBlocked(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFrontCameraBlocked(true);
        return;
      }

      let stream: MediaStream | null = null;
      const constraintsList: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: facingMode,
          },
          audio: false,
        },
        {
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        },
      ];

      for (const constraint of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          if (stream) break;
        } catch (cErr) {
          console.warn('Camera constraint fallback attempt:', cErr);
        }
      }

      if (!stream) {
        setFrontCameraBlocked(true);
        return;
      }

      setCameraStream(stream);
      permissions.markCameraGranted();

      if (videoRef.current) {
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video play error on iOS:', playErr);
        });
      }
    } catch (_err) {
      setFrontCameraBlocked(true);
    }
  };

  // Guarantee iOS video element is bound to camera stream upon render
  useEffect(() => {
    if (videoRef.current && cameraStream && currentStep === 'camera') {
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch((playErr) => {
        console.warn('Video play error on iOS:', playErr);
      });
    }
  }, [cameraStream, currentStep]);

  const stopCameraTracks = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const toggleCameraFacing = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    setTimeout(() => {
      startFrontCamera();
    }, 200);
  };

  const capturePhotoSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Scale down dimensions directly for lightweight photo (~15KB)
    const maxDim = 360;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame scaled
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, w, h);

    // Initial capture at quality 0.45 produces crisp face at ~12-18KB
    let dataUrl = canvas.toDataURL('image/jpeg', 0.45);

    // Extra compression pass if needed
    try {
      dataUrl = await compressImageToDataUrl(dataUrl, {
        maxWidth: 360,
        maxHeight: 360,
        quality: 0.45,
        targetMaxKb: 18,
      });
    } catch {
      // Use standard dataUrl
    }

    setCapturedPhoto(dataUrl);
    stopCameraTracks();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startFrontCamera();
  };

  // 5. Submit Attendance
  const handleSubmitAttendance = async () => {
    if (!userLocation || !capturedPhoto) {
      setErrorMessage('Data lokasi atau foto dokumentasi belum lengkap.');
      return;
    }

    if (!isLocationValid) {
      setErrorMessage(`Presensi ditolak. Posisi Anda berada di luar radius resmi sekolah (${schoolLocation.radius_meters} meter).`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        attendance: AttendanceRecord;
      }>('/attendance/check-in', {
        qr_code: scannedQR || schoolQRCode,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        photo_url: capturedPhoto,
      });

      if (res.success && res.attendance) {
        setSavedRecord(res.attendance);
        setCurrentStep('success');

        sendNotification(
          '✅ Presensi Berhasil Dicatat!',
          `Kehadiran Anda (${res.attendance.status}) pada pukul ${res.attendance.time} WIB telah tersimpan dan terverifikasi.`,
          'success'
        );

        // Confetti explosion
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#34d399', '#fbbf24'],
        });

        onSuccess?.(res.attendance);
        onAttendanceSuccess?.(res.attendance);
      } else {
        if ((res as any)?.is_holiday) {
          setTodayHoliday({
            isHoliday: true,
            name: (res as any)?.holiday_name || 'Hari Libur',
          });
          return;
        }
        if ((res as any)?.already_attended && (res as any)?.attendance) {
          setAlreadyAttendedRecord((res as any).attendance);
          setCurrentStep('already_attended');
          return;
        }
        setErrorMessage(res.message || 'Gagal mengirim absensi.');
      }
    } catch (err: any) {
      if (err?.is_holiday || err?.response?.data?.is_holiday || err?.message?.toLowerCase()?.includes('libur')) {
        setTodayHoliday({
          isHoliday: true,
          name: err?.response?.data?.holiday_name || err?.holiday_name || 'Hari Libur',
        });
        return;
      }
      if (err?.already_attended || err?.response?.data?.already_attended) {
        const att = err?.attendance || err?.response?.data?.attendance;
        if (att) {
          setAlreadyAttendedRecord(att);
          setCurrentStep('already_attended');
          return;
        }
      }
      setErrorMessage(err.message || 'Terjadi kendala saat memproses absensi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header with Step Indicators */}
        <div className="bg-linear-to-r from-emerald-900 to-emerald-800 text-white p-4 sm:p-5 relative">
          <button
            type="button"
            onClick={() => {
              stopCameraTracks();
              stopQRScanner();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
            {currentStep === 'already_attended' ? 'Validasi Presensi Harian' : 'Alur Presensi Kehadiran'}
          </span>
          <h2 className="text-base sm:text-lg font-black text-white">
            {currentStep === 'already_attended' ? 'Status Kehadiran Siswa' : 'Absensi Siswa Nurul Bayan'}
          </h2>

          {/* Steps Breadcrumb - only shown when actively in the scan steps */}
          {currentStep !== 'already_attended' && currentStep !== 'validating' && !todayHoliday?.isHoliday && (
            <div className="flex items-center justify-between mt-4 px-2">
              {[
                { key: 'qr', label: '1. QR Code', icon: QrCode },
                { key: 'gps', label: '2. Lokasi GPS', icon: MapPin },
                { key: 'camera', label: '3. Foto Wajah', icon: Camera },
              ].map((st, idx) => {
                const Icon = st.icon;
                const isActive = currentStep === st.key;
                const isPassed =
                  (st.key === 'qr' && (currentStep === 'gps' || currentStep === 'camera' || currentStep === 'success')) ||
                  (st.key === 'gps' && (currentStep === 'camera' || currentStep === 'success'));

                return (
                  <div key={st.key} className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isPassed
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isActive
                            ? 'bg-white text-emerald-900 shadow-md ring-2 ring-emerald-300'
                            : 'bg-white/20 text-emerald-200'
                        }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[10px] font-bold hidden sm:inline ${isActive ? 'text-white' : 'text-emerald-200'}`}>
                      {st.label}
                    </span>
                    {idx < 2 && <div className="w-4 h-0.5 bg-white/20 mx-1" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* HOLIDAY NOTIFICATION */}
          {todayHoliday?.isHoliday ? (
            <div className="py-6 px-2 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border-2 border-amber-200 shadow-inner">
                <CalendarOff className="w-10 h-10 text-amber-600" />
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 inline-block mb-2">
                  Pemberitahuan Sistem
                </span>
                <h3 className="text-xl font-black text-slate-900">Hari Ini Libur!</h3>
                <p className="text-sm font-bold text-amber-700 mt-1">
                  {todayHoliday.name || 'Jadwal Libur Sekolah'}
                </p>
                <p className="text-xs text-slate-600 mt-2 max-w-xs mx-auto leading-relaxed">
                  Hari ini libur, jadi kamu tidak perlu absen. Selamat TIDUR DI KOBONG!
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Sistem otomatis mengamankan status presensi. Siswa tidak dikenakan sanksi ketidakhadiran atau alpha pada hari libur resmi sekolah.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopCameraTracks();
                  stopQRScanner();
                  onClose();
                }}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* STEP: VALIDATING */}
              {currentStep === 'validating' && (
                <div className="py-12 text-center space-y-3 animate-in fade-in duration-200">
                  <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-800">
                    Memeriksa Status Presensi Hari Ini...
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Memverifikasi aturan 1x absensi per hari di SMA Informatika Nurul Bayan
                  </p>
                </div>
              )}

              {/* STEP: ALREADY ATTENDED / CUTOFF ALPHA VALIDATION */}
              {currentStep === 'already_attended' && alreadyAttendedRecord && (
                <div className="py-2 text-center space-y-4 animate-in fade-in duration-200">
                  {/* Status Visual Icon */}
                  <div
                    className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center border-2 shadow-inner ${alreadyAttendedRecord.status === 'HADIR'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : alreadyAttendedRecord.status === 'TERLAMBAT'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : alreadyAttendedRecord.status === 'ALPHA'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}
                  >
                    {alreadyAttendedRecord.status === 'HADIR' ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : alreadyAttendedRecord.status === 'TERLAMBAT' ? (
                      <Clock className="w-8 h-8" />
                    ) : alreadyAttendedRecord.status === 'ALPHA' ? (
                      <ShieldAlert className="w-8 h-8" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8" />
                    )}
                  </div>

                  <div>
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5 ${alreadyAttendedRecord.status === 'HADIR'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : alreadyAttendedRecord.status === 'TERLAMBAT'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : alreadyAttendedRecord.status === 'ALPHA'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                    >
                      Status: {alreadyAttendedRecord.status}
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      {alreadyAttendedRecord.status === 'ALPHA'
                        ? 'Batas Waktu Absensi Telah Berakhir'
                        : 'Anda Sudah Melakukan Absensi Hari Ini'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      {alreadyAttendedRecord.status === 'ALPHA'
                        ? `Batas waktu operasional absensi sekolah (${attendanceCutoffTime} WIB) telah berakhir dan status kehadiran Anda otomatis tercatat sebagai ALPHA (Tanpa Keterangan).`
                        : `Presensi Anda telah sukses tercatat pada pukul ${alreadyAttendedRecord.time || 'hari ini'} WIB. Setiap siswa hanya dapat melakukan absensi 1 kali dalam sehari.`}
                    </p>
                  </div>

                  {/* Summary Card with full details */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Tanggal:</span>
                      <span className="font-bold text-slate-800">
                        {formatIndonesianDate(alreadyAttendedRecord.date)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Waktu Tercatat:</span>
                      <span className="font-bold text-slate-800">
                        {alreadyAttendedRecord.time ? `${alreadyAttendedRecord.time} WIB` : 'Otomatis Sistem'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Status Kehadiran:</span>
                      <span className={`font-black ${alreadyAttendedRecord.status === 'HADIR'
                          ? 'text-emerald-700'
                          : alreadyAttendedRecord.status === 'TERLAMBAT'
                            ? 'text-amber-700'
                            : alreadyAttendedRecord.status === 'ALPHA'
                              ? 'text-rose-700'
                              : 'text-blue-700'
                        }`}>
                        {alreadyAttendedRecord.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Verifikasi Lokasi:</span>
                      <span className="font-semibold text-slate-700">
                        {alreadyAttendedRecord.status === 'ALPHA'
                          ? 'Tercatat Otomatis Server'
                          : alreadyAttendedRecord.distance_meters !== null && alreadyAttendedRecord.distance_meters !== undefined
                            ? `Radius Sekolah (${alreadyAttendedRecord.distance_meters}m)`
                            : 'Terverifikasi GPS'}
                      </span>
                    </div>

                    {alreadyAttendedRecord.photo_url && (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Foto Dokumentasi:</span>
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300">
                          <img
                            src={alreadyAttendedRecord.photo_url}
                            alt="Foto Siswa"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* System Constraint Warning */}
                  <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <b>Validasi Sistem:</b> Siswa hanya dapat melakukan scan presensi <b>1 kali sehari</b>. Anda tidak dapat melakukan pemindaian ulang pada hari yang sama.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraTracks();
                        stopQRScanner();
                        onClose();
                        onNavigateRiwayat?.();
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer card-2d"
                    >
                      <span>Selesai & Kembali ke Beranda</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopCameraTracks();
                        stopQRScanner();
                        onClose();
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Tutup & Kembali ke Beranda
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: SCAN QR CODE */}
              {currentStep === 'qr' && (
                <div className="space-y-4 text-center">
                  {/* Hidden container for file-based QR decoding */}
                  <div id="qr-file-temp-reader" className="hidden" />

                  {qrCameraBlocked ? (
                    <div className="p-6 bg-slate-900 rounded-3xl border border-slate-700 text-center space-y-4 animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
                        <CameraOff className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-white font-black text-base">Kamera Scan QR Belum Aktif</h4>
                        <p className="text-slate-300 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                          Kamera memerlukan izin akses dari peramban Anda. Klik tombol di bawah ini untuk membuka kamera dan berikan izin saat diminta.
                        </p>
                        {isIOS && (
                          <div className="mt-3 p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-left text-[11px] text-amber-200 leading-relaxed space-y-1.5">
                            <span className="font-bold block text-amber-300">📱 Panduan iPhone / Safari / PWA:</span>
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold text-amber-400">1.</span>
                              <span>Klik tombol <b>"Aktifkan / Buka Kamera"</b> di bawah.</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold text-amber-400">2.</span>
                              <span>Jika muncul pop-up dari sistem, pilih <b>"Izinkan" (Allow)</b>.</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold text-amber-400">3.</span>
                              <span>Jika izin terkunci: Buka <b>Pengaturan iPhone &gt; Safari (atau Aplikasi Web) &gt; Kamera &gt; Izinkan</b>, lalu kembali dan klik tombol di bawah.</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Primary Actions: Direct User Gesture for iOS WebKit */}
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => startQRScanner('environment')}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all card-2d"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Aktifkan / Buka Kamera Sekarang</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startQRScanner('user')}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <SwitchCamera className="w-3.5 h-3.5 text-slate-400" />
                          <span>Coba Kamera Depan (Selfie)</span>
                        </button>

                        <div className="pt-2 border-t border-slate-800">
                          <label className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 active:scale-[0.98] text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all">
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>Atau Pilih Foto QR Code dari Galeri</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleQRFileScan}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-emerald-500/80 shadow-xl flex items-center justify-center">
                      {/* HTML5 QR Scanner Container */}
                      <div id={qrRegionId} className="w-full h-full object-cover" />

                      {/* Camera starting / connecting indicator */}
                      {isQrCameraStarting && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-10 animate-in fade-in duration-150">
                          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px] font-bold text-emerald-300">Menghubungkan Kamera...</span>
                        </div>
                      )}

                      {/* Animated Green Laser Line Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                        <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                          <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                          <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flashlight & Camera Switch Controls */}
                  {!qrCameraBlocked && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${isTorchOn
                            ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 ring-2 ring-amber-300 shadow-amber-400/40'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        title={isTorchOn ? 'Matikan Lampu Senter / Flash' : 'Nyalakan Lampu Senter / Flash'}
                      >
                        {isTorchOn ? (
                          <Zap className="w-3.5 h-3.5 text-amber-950 fill-amber-950 animate-pulse" />
                        ) : (
                          <ZapOff className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>{isTorchOn ? 'Flash Menyala' : 'Flash'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextFacing = qrFacingMode === 'environment' ? 'user' : 'environment';
                          startQRScanner(nextFacing);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer shadow-xs"
                        title="Ganti Kamera (Depan / Belakang)"
                      >
                        <SwitchCamera className="w-3.5 h-3.5 text-slate-600" />
                        <span>{qrFacingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
                      </button>
                    </div>
                  )}

                  <div className="text-center px-4">
                    <p className="text-xs font-bold text-slate-700">
                      Arahkan kamera ke QR Code resmi sekolah
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      QR Code terpasang di gerbang, lobi, atau meja piket madrasah. Nyalakan flash jika cuaca gelap atau mendung.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          startQRScanner();
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                        <span>Pindai Ulang Kamera</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: GPS LOCATION VALIDATION */}
              {currentStep === 'gps' && (
                <div className="space-y-4 text-center py-2">
                  <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border-2 shadow-inner transition-colors ${userLocation
                      ? (isLocationValid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200')
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                    {userLocation && !isLocationValid ? (
                      <ShieldAlert className="w-10 h-10 text-rose-600 animate-bounce" />
                    ) : (
                      <MapPin className="w-10 h-10 animate-pulse" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {userLocation ? (isLocationValid ? 'Koordinat GPS Berhasil Terverifikasi' : 'Lokasi Berada di Luar Radius Sekolah') : 'Mendeteksi Lokasi GPS Siswa'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      {userLocation
                        ? (isLocationValid
                          ? 'Posisi Anda terverifikasi berada di lingkungan resmi sekolah.'
                          : `Posisi Anda terdeteksi di luar batas radius sekolah (${schoolLocation.radius_meters} meter). Anda wajib berada di area sekolah untuk melakukan presensi.`)
                        : 'Sistem sedang membaca koordinat presisi GPS perangkat Anda...'}
                    </p>
                  </div>

                  {/* Distance & GPS readout card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Sekolah:</span>
                      <span className="font-bold text-slate-800">{schoolLocation.school_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Batas Radius Resmi:</span>
                      <span className="font-bold text-slate-800">{schoolLocation.radius_meters} meter</span>
                    </div>
                    {distanceMeters !== null && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Jarak ke Sekolah:</span>
                        <span
                          className={`font-black ${isLocationValid ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                        >
                          {distanceMeters} meter
                        </span>
                      </div>
                    )}
                    {gpsAccuracy !== null && (
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>Akurasi Sinyal GPS:</span>
                        <span className="font-mono font-semibold text-slate-700">±{Math.round(gpsAccuracy)} meter</span>
                      </div>
                    )}
                  </div>

                  {/* Status Banner */}
                  {userLocation && (
                    isLocationValid ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-left flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-900">
                          <span className="font-bold block">✓ Dalam Radius Resmi Sekolah</span>
                          <span className="text-[11px] text-emerald-700 block mt-0.5">
                            Jarak Anda ({distanceMeters}m) memenuhi standar radius sekolah ({schoolLocation.radius_meters}m).
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-900">
                          <span className="font-bold block text-rose-800">⛔ Di Luar Radius Sekolah (Presensi Ditolak)</span>
                          <span className="text-[11px] text-rose-700 block mt-0.5 leading-relaxed">
                            Jarak Anda terdeteksi <b>{distanceMeters} meter</b> dari sekolah (batas maksimal <b>{schoolLocation.radius_meters} meter</b>). Anda wajib berada di lingkungan sekolah untuk melakukan absensi.
                          </span>
                        </div>
                      </div>
                    )
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    {userLocation ? (
                      isLocationValid ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentStep('camera');
                              startFrontCamera();
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/25"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Lanjut ke Verifikasi Foto Wajah</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={requestGPSValidation}
                            disabled={isLoading}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{isLoading ? 'Sedang Membaca GPS Presisi...' : 'Kalibrasi / Cek Ulang GPS'}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled
                            className="w-full py-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-rose-200 opacity-90 shadow-xs"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span>Presensi Ditolak: Di Luar Radius Sekolah</span>
                          </button>

                          <button
                            type="button"
                            onClick={requestGPSValidation}
                            disabled={isLoading}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{isLoading ? 'Membaca Ulang Titik GPS...' : 'Coba Cek Ulang GPS (Kalibrasi)'}</span>
                          </button>
                        </>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={requestGPSValidation}
                        disabled={isLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Mendeteksi Koordinat GPS...' : 'Izinkan & Cek Lokasi GPS'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: FRONT CAMERA FACE DOCUMENTATION */}
              {currentStep === 'camera' && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-4/3 rounded-3xl overflow-hidden bg-slate-900 shadow-xl border border-slate-200 flex items-center justify-center">

                    {/* Live Video Preview or Captured Photo */}
                    {capturedPhoto ? (
                      <img
                        src={capturedPhoto}
                        alt="Foto Wajah Dokumentasi"
                        className="w-full h-full object-cover"
                      />
                    ) : frontCameraBlocked ? (
                      <div className="p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                          <CameraOff className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm">Kamera Wajah Wajib Aktif</h4>
                          <p className="text-slate-300 text-xs mt-1">
                            Presensi mewajibkan pengambilan foto langsung melalui kamera saat ini. Unggah foto dari galeri dinonaktifkan demi keaslian dan validitas kehadiran.
                          </p>
                          {isIOS && (
                            <div className="mt-3 p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-left text-[11px] text-amber-200 leading-relaxed">
                              <span className="font-bold block text-amber-300 mb-0.5">📱 Tips Pengguna iPhone / Safari:</span>
                              Buka <b>Pengaturan (Settings) iPhone &gt; Safari &gt; Kamera &gt; pilih Izinkan</b>. Jika membuka dari PWA Layar Utama, pastikan izin kamera aktif pada peramban.
                            </div>
                          )}
                        </div>
                        <div className="pt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={startFrontCamera}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Izinkan & Coba Kamera Lagi</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Face Guide Oval */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-end justify-center pb-3">
                            <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
                              Posisikan Wajah di Sini
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Switch Camera Button */}
                    {!capturedPhoto && !frontCameraBlocked && (
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
                        title="Ganti Kamera"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {!capturedPhoto ? (
                      !frontCameraBlocked ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={capturePhotoSnapshot}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Ambil Foto Dokumentasi</span>
                          </button>
                        </div>
                      ) : null
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={retakePhoto}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Foto Ulang
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitAttendance}
                          disabled={isLoading}
                          className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Kirim Absensi Sekarang</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS CONFIRMATION */}
              {currentStep === 'success' && savedRecord && (
                <div className="space-y-5 text-center py-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest block">
                      Absensi Berhasil
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      Kehadiran Berhasil Dicatat!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Terima kasih, selamat belajar di SMA Informatika Nurul Bayan.
                    </p>
                  </div>

                  {/* Detail Summary Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status Absensi:</span>
                      <span
                        className={`font-black px-2 py-0.5 rounded-md ${savedRecord.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                          }`}
                      >
                        {savedRecord.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Waktu Masuk:</span>
                      <span className="font-bold text-slate-800">{savedRecord.time} WIB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Jarak Lokasi:</span>
                      <span className="font-bold text-slate-800">{savedRecord.distance_meters} meter</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      stopCameraTracks();
                      onClose();
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
                  >
                    Selesai & Kembali ke Dashboard
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
