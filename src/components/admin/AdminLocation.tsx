import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';
import { SchoolLocation } from '../../types.js';
import { 
  MapPin, 
  Navigation, 
  Save, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  RotateCcw,
  Loader2,
  Layers,
  Sparkles
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export const AdminLocation: React.FC = () => {
  const [location, setLocation] = useState<SchoolLocation>({
    latitude: -7.6698,
    longitude: 108.5293,
    radius_meters: 100,
    address: 'Jl. Raya Cimerak, Kec. Cimerak, Kab. Pangandaran, Jawa Barat',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLocation();
    return () => {
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const fetchLocation = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        location: SchoolLocation;
      }>('/location');

      if (res.success && res.location) {
        const fetchedLoc = {
          ...res.location,
          latitude: Number(res.location.latitude) || -7.6698,
          longitude: Number(res.location.longitude) || 108.5293,
          radius_meters: Number(res.location.radius_meters) || 100,
        };
        setLocation(fetchedLoc);
        initOrUpdateMap(fetchedLoc.latitude, fetchedLoc.longitude, fetchedLoc.radius_meters);
      } else {
        initOrUpdateMap(location.latitude, location.longitude, location.radius_meters);
      }
    } catch (err) {
      console.error('Failed to load location', err);
      initOrUpdateMap(location.latitude, location.longitude, location.radius_meters);
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocode coordinates to human-readable address
  const reverseGeocode = (lat: number, lng: number) => {
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);

    geocodeTimeoutRef.current = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'id,en',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            setLocation((prev) => ({
              ...prev,
              address: data.display_name,
            }));
          }
        }
      } catch (err) {
        console.warn('Reverse geocoding error:', err);
      } finally {
        setIsGeocoding(false);
      }
    }, 600); // 600ms debounce
  };

  // Custom emerald pin icon
  const createPinIcon = () => {
    return L.divIcon({
      className: 'custom-school-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab;">
          <div style="background: #047857; color: white; padding: 7px; border-radius: 14px; box-shadow: 0 12px 20px -3px rgba(0, 0, 0, 0.35); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #047857; margin-top: -1px;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  // Initialize or update the Leaflet map
  const initOrUpdateMap = (lat: number, lng: number, radius: number) => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 17,
        scrollWheelZoom: true,
      });

      // 1. Google Maps Road (Sangat detail untuk Indonesia, zoom sampai 20 tanpa batas)
      const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
        maxZoom: 20,
        maxNativeZoom: 20,
      });

      // 2. Google Maps Hybrid (Satelit Nyata + Nama Jalan/Gedung Sekolah, zoom sampai 20)
      const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Satellite',
        maxZoom: 20,
        maxNativeZoom: 20,
      });

      // 3. OpenStreetMap (Standar Internasional)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 20,
        maxNativeZoom: 19,
      });

      // Pasang Google Maps Road sebagai tampilan default
      googleStreets.addTo(map);

      // Kontrol pemilihan tipe peta di pojok kanan atas
      L.control.layers({
        '🗺️ Google Maps': googleStreets,
        '🛰️ Citra Satelit': googleHybrid,
        '🌐 OpenStreetMap': osmLayer,
      }, undefined, { position: 'topright' }).addTo(map);

      // Create radius circle
      const circle = L.circle([lat, lng], {
        radius: radius,
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      // Create draggable marker
      const marker = L.marker([lat, lng], {
        icon: createPinIcon(),
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Marker drag event
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        const newLat = Number(position.lat.toFixed(6));
        const newLng = Number(position.lng.toFixed(6));

        circle.setLatLng([newLat, newLng]);
        setLocation((prev) => ({
          ...prev,
          latitude: newLat,
          longitude: newLng,
        }));
        reverseGeocode(newLat, newLng);
      });

      // Map click event: moves marker to clicked spot
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLat = Number(e.latlng.lat.toFixed(6));
        const newLng = Number(e.latlng.lng.toFixed(6));

        marker.setLatLng([newLat, newLng]);
        circle.setLatLng([newLat, newLng]);
        setLocation((prev) => ({
          ...prev,
          latitude: newLat,
          longitude: newLng,
        }));
        reverseGeocode(newLat, newLng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    } else {
      // Update existing map
      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      const circle = circleRef.current;

      map.setView([lat, lng], map.getZoom());
      if (marker) marker.setLatLng([lat, lng]);
      if (circle) {
        circle.setLatLng([lat, lng]);
        circle.setRadius(radius);
      }
    }
  };

  // Sync map when inputs change manually
  const updateMapFromInputs = (newLat: number, newLng: number, newRadius: number) => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      if (!isNaN(newLat) && !isNaN(newLng)) {
        markerRef.current.setLatLng([newLat, newLng]);
        circleRef.current.setLatLng([newLat, newLng]);
        circleRef.current.setRadius(newRadius);
        mapInstanceRef.current.panTo([newLat, newLng]);
      }
    }
  };

  // GPS handler: gets current browser location with 2-phase strategy (Fast fix + High-Accuracy)
  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }

    setIsLoadingGps(true);
    setErrorMessage(null);

    let hasFastFix = false;

    const applyCoords = (pos: GeolocationPosition) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      setLocation((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));

      updateMapFromInputs(lat, lng, location.radius_meters);
      reverseGeocode(lat, lng);
      setIsLoadingGps(false);
    };

    // Phase 1: Fast fix (allow cached up to 2 minutes)
    navigator.geolocation.getCurrentPosition(
      (fastPos) => {
        hasFastFix = true;
        applyCoords(fastPos);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
    );

    // Phase 2: High accuracy fix (relaxed 25s timeout, 30s cache)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos);
      },
      (err) => {
        if (hasFastFix) {
          setIsLoadingGps(false);
          return;
        }
        setIsLoadingGps(false);
        let detail = err.message;
        if (err.code === 1) detail = 'Izin akses lokasi ditolak di browser. Silakan aktifkan izin lokasi di pengaturan browser.';
        else if (err.code === 2) detail = 'Sinyal satelit GPS tidak terdeteksi. Pastikan GPS perangkat Anda telah aktif.';
        else if (err.code === 3) detail = 'Waktu deteksi GPS habis. Nyalakan koneksi Wi-Fi perangkat untuk membantu penentuan posisi presisi lebih cepat.';
        setErrorMessage(`Gagal mengambil koordinat GPS: ${detail}`);
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 30000 }
    );
  };

  // Reset to default school coordinates (SMA Informatika Nurul Bayan)
  const handleResetDefault = () => {
    const defaultLat = -7.6698;
    const defaultLng = 108.5293;
    const defaultRadius = 100;

    setLocation((prev) => ({
      ...prev,
      latitude: defaultLat,
      longitude: defaultLng,
      radius_meters: defaultRadius,
    }));

    updateMapFromInputs(defaultLat, defaultLng, defaultRadius);
    reverseGeocode(defaultLat, defaultLng);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.put<{
        success: boolean;
        message: string;
        location: SchoolLocation;
      }>('/location', location);

      if (res.success) {
        setSuccessMessage('Koordinat titik lokasi dan alamat sekolah berhasil disimpan.');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.message || 'Gagal menyimpan koordinat.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kendala saat menyimpan lokasi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Geofencing & Validasi Absensi
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-0.5">
            Titik Lokasi & Live Peta Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geser pin hijau pada peta untuk menentukan titik gerbang sekolah secara realtime. Alamat otomatis diperbarui.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kembalikan ke titik default sekolah"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Titik</span>
          </button>

          <button
            type="button"
            onClick={handleGetCurrentPosition}
            disabled={isLoadingGps}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLoadingGps ? 'animate-spin' : ''}`} />
            <span>{isLoadingGps ? 'Mendeteksi...' : 'Lokasi Saya'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Map Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Live Interactive Map Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Radius: {location.radius_meters}m
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {location.latitude}, {location.longitude}
            </span>
          </div>
        </div>

        {/* Leaflet Map DOM Container */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
          <div
            ref={mapContainerRef}
            className="w-full h-[380px] sm:h-[460px] z-10"
            style={{ minHeight: '380px' }}
          />

          {/* Floating Instructions Banner */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 pointer-events-none">
            <div className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium px-3.5 py-2 rounded-xl shadow-lg border border-slate-700/60 inline-flex items-center gap-2 max-w-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Petunjuk:</strong> Klik peta atau geser pin hijau untuk memindahkan titik gerbang. Alamat akan terupdate otomatis.
              </span>
            </div>
          </div>

          {/* Geocoding Loading Indicator Overlay */}
          {isGeocoding && (
            <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
              <div className="bg-emerald-950/90 text-emerald-200 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md border border-emerald-500/40 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Menyinkronkan alamat...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Koordinat & Alamat */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
          <form onSubmit={handleSaveLocation} className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Parameter Koordinat & Alamat Terdeteksi
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Latitude (Garis Lintang)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={location.latitude ?? ''}
                  onChange={(e) => {
                    const newLat = e.target.value === '' ? 0 : Number(e.target.value);
                    setLocation({ ...location, latitude: newLat });
                    updateMapFromInputs(newLat, location.longitude, location.radius_meters);
                  }}
                  placeholder="-7.6698"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Longitude (Garis Bujur)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={location.longitude ?? ''}
                  onChange={(e) => {
                    const newLng = e.target.value === '' ? 0 : Number(e.target.value);
                    setLocation({ ...location, longitude: newLng });
                    updateMapFromInputs(location.latitude, newLng, location.radius_meters);
                  }}
                  placeholder="108.5293"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Radius Geofence Validasi (Meter)
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {location.radius_meters} m
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={1000}
                  step={10}
                  value={location.radius_meters ?? 100}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setLocation({ ...location, radius_meters: r });
                    updateMapFromInputs(location.latitude, location.longitude, r);
                  }}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>20m (Ketat)</span>
                  <span>100m (Rekomendasi)</span>
                  <span>1000m (Luas)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Radius Angka Manual (Meter)
                </label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  required
                  value={location.radius_meters ?? 100}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setLocation({ ...location, radius_meters: r });
                    updateMapFromInputs(location.latitude, location.longitude, r);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Alamat Lengkap Sekolah (Sesuai Peta)
                </label>
                {isGeocoding && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Memperbarui alamat...
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                required
                value={location.address ?? ''}
                onChange={(e) => setLocation({ ...location, address: e.target.value })}
                placeholder="Alamat akan terisi otomatis saat pin peta digeser..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1.5"
              >
                <span>Buka Titik di Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Titik Lokasi'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Info & Panduan Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-white">
              Status Geofence Sekolah
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Radius lingkaran hijau adalah area toleransi absensi siswa saat memindai QR code. Siswa di luar lingkaran akan ditolak secara otomatis.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Radius Aman:</span>
              <span className="font-bold text-emerald-400">{location.radius_meters} Meter</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Garis Lintang:</span>
              <span className="font-mono text-slate-200">{location.latitude}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Garis Bujur:</span>
              <span className="font-mono text-slate-200">{location.longitude}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">💡 Tips Akurasi:</p>
            <p>
              Letakkan pin tepat di pintu gerbang masuk sekolah atau tempat kamera absensi dipasang.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
