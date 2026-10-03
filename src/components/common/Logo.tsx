import React from 'react';
import { useTheme } from '../../context/ThemeContext.js';

export const SCHOOL_LOGO_URL = "/school-logo.png";
export const SCHOOL_LOGO_FALLBACK = "/school-logo.png";
export const SCHOOL_BACKGROUND_URL = "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlZgDiiO_xVpoBKAxOBMuTUF8i5lp6PRZ5a3z4PQ_E0phwWgtL2dnDMh2o0rXmVFouUea_b0YZOeBf7FWMSqse14hP-NBvUEHpBAiOuqVfmpumFCAFsiKsQnNJrCiQWXnTgTlQqWAUH4mP6=s1360-w1360-h1020-rw";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  textColor = 'text-slate-900',
  subtextColor = 'text-slate-500',
}) => {
  let activeLogo = SCHOOL_LOGO_URL;
  try {
    const { branding } = useTheme();
    if (branding.logo_url && branding.logo_url !== '/pwa-512x512.png') {
      activeLogo = branding.logo_url;
    }
  } catch {
    // outside ThemeProvider
  }

  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36 sm:w-40 sm:h-40',
    '2xl': 'w-44 h-44 sm:w-48 sm:h-48',
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`relative ${sizeMap[size]} shrink-0 flex items-center justify-center`}>
        <img
          src={activeLogo}
          alt="Logo SMA Informatika Nurul Bayan"
          className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none"
          loading="eager"
          crossOrigin="anonymous"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== SCHOOL_LOGO_URL && !target.src.endsWith(SCHOOL_LOGO_URL)) {
              target.src = SCHOOL_LOGO_URL;
            } else {
              target.src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23047857"/><circle cx="50" cy="50" r="38" fill="%23ffffff"/><text x="50" y="58" font-size="24" font-family="sans-serif" font-weight="bold" fill="%23047857" text-anchor="middle">NB</text></svg>';
            }
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight leading-tight ${textColor} ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : size === 'xl' || size === '2xl' ? 'text-xl' : 'text-sm'}`}>
            SMA INFORMATIKA
          </span>
          <span className={`font-bold tracking-wider uppercase text-emerald-600 ${size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : size === 'xl' || size === '2xl' ? 'text-base' : 'text-xs'}`}>
            NURUL BAYAN
          </span>
          {(size === 'xl' || size === '2xl') && (
            <span className={`text-xs mt-0.5 ${subtextColor}`}>
              Sistem Absensi Digital Siswa
            </span>
          )}
        </div>
      )}
    </div>
  );
};
