import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandingSettings } from '../types.js';
import { api } from '../lib/api.js';

export type ThemeColor = 'emerald' | 'sapphire' | 'violet' | 'amber' | 'ruby' | 'onyx';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  branding: BrandingSettings;
  refreshBranding: () => Promise<void>;
  updateBranding: (updates: Partial<BrandingSettings>) => Promise<boolean>;
  uploadBrandingAsset: (type: 'logo' | 'background', base64: string, mime: string) => Promise<string | null>;
  resetBranding: () => Promise<boolean>;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  school_name: 'SMA Informatika Nurul Bayan',
  academic_year: 'Tahun Ajaran 2024/2025',
  logo_url: '/school-logo.png',
  background_url: '',
  theme_color: 'emerald',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nuba_dark_mode');
      if (saved !== null) return saved === 'true';
      // Default theme is ALWAYS Light Mode for new users / first visit
      return false;
    }
    return false;
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nuba_theme_color');
      if (saved) return saved as ThemeColor;
    }
    return 'emerald';
  });

  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);

  // Sync dark mode class and meta theme-color with DOM
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('nuba_dark_mode', 'true');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('nuba_dark_mode', 'false');
    }

    // Update meta theme-color for browser tab / mobile header
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (isDarkMode) {
        metaThemeColor.setAttribute('content', '#080c14');
      } else {
        const themeColors: Record<ThemeColor, string> = {
          emerald: '#047857',
          sapphire: '#2563eb',
          violet: '#7c3aed',
          amber: '#d97706',
          ruby: '#dc2626',
          onyx: '#0f172a',
        };
        metaThemeColor.setAttribute('content', themeColors[themeColor] || '#047857');
      }
    }
  }, [isDarkMode, themeColor]);

  const toggleDarkMode = () => {
    setIsDarkModeState((prev) => !prev);
  };

  const setDarkMode = (val: boolean) => {
    setIsDarkModeState(val);
  };

  // Sync theme color attribute
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', themeColor);
    localStorage.setItem('nuba_theme_color', themeColor);
  }, [themeColor]);

  // Load branding from server on boot
  const refreshBranding = async () => {
    try {
      const res = await api.get<{ success: boolean; branding: BrandingSettings }>('/branding');
      if (res.success && res.branding) {
        const rawLogo = res.branding.logo_url;
        const normalizedBranding: BrandingSettings = {
          ...DEFAULT_BRANDING,
          ...res.branding,
          logo_url: rawLogo && rawLogo !== '/pwa-512x512.png' ? rawLogo : '/school-logo.png',
        };
        setBranding(normalizedBranding);
        if (normalizedBranding.theme_color) {
          setThemeColorState(normalizedBranding.theme_color as ThemeColor);
        }
        applyBrandingToDOM(normalizedBranding);
      }
    } catch {
      // Offline fallback: keep default
    }
  };

  const applyBrandingToDOM = (b: BrandingSettings) => {
    if (typeof document === 'undefined') return;
    if (b.logo_url) {
      // Dynamic favicon sync
      const faviconLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
      faviconLinks.forEach((link) => {
        link.setAttribute('href', b.logo_url);
        if (b.logo_url.endsWith('.png')) {
          link.setAttribute('type', 'image/png');
        } else if (b.logo_url.endsWith('.ico')) {
          link.setAttribute('type', 'image/x-icon');
        } else if (b.logo_url.endsWith('.svg')) {
          link.setAttribute('type', 'image/svg+xml');
        }
      });
      const appleTouch = document.querySelector("link[rel='apple-touch-icon']");
      if (appleTouch) {
        appleTouch.setAttribute('href', b.logo_url);
      }
      const manifestLinks = document.querySelectorAll("link[rel='manifest']");
      manifestLinks.forEach((link) => {
        link.setAttribute('href', `/manifest.webmanifest?v=${Date.now()}`);
      });
    }
  };

  useEffect(() => {
    refreshBranding();
  }, []);

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
  };

  const updateBranding = async (updates: Partial<BrandingSettings>): Promise<boolean> => {
    try {
      const res = await api.put<{ success: boolean; branding: BrandingSettings }>('/branding', updates);
      if (res.success && res.branding) {
        setBranding(res.branding);
        if (res.branding.theme_color) {
          setThemeColorState(res.branding.theme_color as ThemeColor);
        }
        applyBrandingToDOM(res.branding);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update branding', err);
      return false;
    }
  };

  const uploadBrandingAsset = async (
    type: 'logo' | 'background',
    base64: string,
    mime: string
  ): Promise<string | null> => {
    try {
      const res = await api.post<{ success: boolean; url: string; branding: BrandingSettings }>('/branding/upload', {
        type,
        image_base64: base64,
        mime_type: mime,
      });
      if (res.success && res.url) {
        if (res.branding) {
          setBranding(res.branding);
          applyBrandingToDOM(res.branding);
        }
        return res.url;
      }
      return null;
    } catch (err) {
      console.error('Failed to upload branding asset', err);
      return null;
    }
  };

  const resetBranding = async (): Promise<boolean> => {
    try {
      const res = await api.post<{ success: boolean; branding: BrandingSettings }>('/branding/reset');
      if (res.success && res.branding) {
        setBranding(res.branding);
        setThemeColorState('emerald');
        applyBrandingToDOM(res.branding);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to reset branding', err);
      return false;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        setDarkMode,
        themeColor,
        setThemeColor,
        branding,
        refreshBranding,
        updateBranding,
        uploadBrandingAsset,
        resetBranding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
