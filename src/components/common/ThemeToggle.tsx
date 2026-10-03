import React from 'react';
import { useTheme } from '../../context/ThemeContext.js';
import { Sun, Moon, Lightbulb } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'navbar' | 'floating' | 'pill';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  variant = 'navbar' 
}) => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        className={`fixed top-4 right-4 z-50 p-2.5 rounded-2xl bg-white/90 dark:bg-[#0d1322]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer ${className}`}
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5 text-amber-400 animate-in spin-in-90 duration-200" />
        ) : (
          <Moon className="w-5 h-5 text-slate-700 animate-in spin-in-90 duration-200" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      title={isDarkMode ? 'Mode Gelap Aktif (Klik untuk Mode Terang)' : 'Mode Terang Aktif (Klik untuk Mode Gelap)'}
      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
        isDarkMode
          ? 'bg-[#0d1322] border-slate-800 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)] hover:border-amber-400/50'
          : 'bg-white/90 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
      } ${className}`}
    >
      {isDarkMode ? (
        <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-in zoom-in-75 duration-200" />
      ) : (
        <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700 animate-in zoom-in-75 duration-200" />
      )}
    </button>
  );
};
